import * as vscode from "vscode";
import { spawn } from "child_process";
import { SfdkDevice, SfdkTarget, SfdkResult } from "./types";

export class Sfdk {
  private outputChannel: vscode.OutputChannel;

  constructor() {
    this.outputChannel = vscode.window.createOutputChannel("Sailfish SDK");
  }

  private getSfdkPath(): string {
    const configPath = vscode.workspace
      .getConfiguration("sfdk")
      .get<string>("path", "");
    return configPath || "sfdk";
  }

  private getWorkspaceCwd(): string | undefined {
    return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  }

  /** Run an sfdk command silently and return the result. */
  async exec(args: string[]): Promise<SfdkResult> {
    const sfdkPath = this.getSfdkPath();
    const cwd = this.getWorkspaceCwd();

    return new Promise((resolve) => {
      const proc = spawn(sfdkPath, args, { cwd });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on("error", (err: Error) => {
        resolve({ exitCode: -1, stdout, stderr: err.message });
      });

      proc.on("close", (code: number | null) => {
        resolve({ exitCode: code ?? -1, stdout, stderr });
      });
    });
  }

  /** Run an sfdk command with live output streaming to the Output Channel. */
  async run(
    args: string[],
    token?: vscode.CancellationToken
  ): Promise<SfdkResult> {
    const sfdkPath = this.getSfdkPath();
    const cwd = this.getWorkspaceCwd();

    this.outputChannel.show(true);
    this.outputChannel.appendLine(`> sfdk ${args.join(" ")}`);
    this.outputChannel.appendLine("");

    return new Promise((resolve) => {
      const proc = spawn(sfdkPath, args, { cwd });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        this.outputChannel.append(text);
      });

      proc.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        this.outputChannel.append(text);
      });

      token?.onCancellationRequested(() => {
        proc.kill("SIGTERM");
      });

      proc.on("error", (err: Error) => {
        this.outputChannel.appendLine(`Error: ${err.message}`);
        resolve({ exitCode: -1, stdout, stderr: err.message });
      });

      proc.on("close", (code: number | null) => {
        this.outputChannel.appendLine("");
        this.outputChannel.appendLine(
          `Process exited with code ${code ?? "unknown"}`
        );
        resolve({ exitCode: code ?? -1, stdout, stderr });
      });
    });
  }

  /**
   * Parse `sfdk device list` output.
   *
   * Expected format:
   * ```
   * #0 "Sailfish OS Emulator 5.0.0.62"
   *     emulator         autodetected  defaultuser@127.0.0.1:2223
   *     private-key: ~/SailfishOS/vmshare/ssh/private_keys/sdk
   * ```
   */
  async listDevices(): Promise<SfdkDevice[]> {
    const result = await this.exec(["device", "list"]);
    if (result.exitCode !== 0) {
      throw new Error(
        `sfdk device list failed (exit ${result.exitCode}): ${result.stderr}`
      );
    }
    return this.parseDeviceList(result.stdout);
  }

  parseDeviceList(output: string): SfdkDevice[] {
    const devices: SfdkDevice[] = [];
    const lines = output.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const headerMatch = lines[i].match(/^#(\d+)\s+"(.+)"/);
      if (!headerMatch) {
        continue;
      }

      const index = parseInt(headerMatch[1], 10);
      const name = headerMatch[2];

      const detailLine = lines[i + 1]?.trim() ?? "";
      const detailParts = detailLine.split(/\s{2,}/);
      const type = detailParts[0] as "emulator" | "hardware-device";
      const origin = detailParts[1] as "autodetected" | "user-defined";
      const connection = detailParts[2] ?? "";

      const keyLine = lines[i + 2]?.trim() ?? "";
      const keyMatch = keyLine.match(/^private-key:\s+(.+)/);
      const privateKey = keyMatch?.[1] ?? "";

      devices.push({ index, name, type, origin, connection, privateKey });
      i += 2;
    }

    return devices;
  }

  /** Parse `sfdk tools target list` output. */
  async listTargets(): Promise<SfdkTarget[]> {
    const result = await this.exec(["tools", "target", "list"]);
    if (result.exitCode !== 0) {
      throw new Error(
        `sfdk tools target list failed (exit ${result.exitCode}): ${result.stderr}`
      );
    }
    return this.parseTargetList(result.stdout);
  }

  parseTargetList(output: string): SfdkTarget[] {
    const targets: SfdkTarget[] = [];
    const lines = output.split("\n").filter((l) => l.trim());

    for (const line of lines) {
      const parts = line.trim().split(/\s{2,}/);
      if (parts.length >= 1) {
        targets.push({
          name: parts[0],
          flags: parts[1] ?? "",
        });
      }
    }

    return targets;
  }

  async setConfig(name: string, value: string): Promise<SfdkResult> {
    return this.exec(["config", "--global", `${name}=${value}`]);
  }

  async getConfig(): Promise<string> {
    const result = await this.exec(["config", "--show"]);
    return result.stdout;
  }

  async verify(): Promise<boolean> {
    const result = await this.exec(["--version"]);
    return result.exitCode === 0;
  }

  dispose(): void {
    this.outputChannel.dispose();
  }
}
