import { spawn } from "node:child_process";
import { ENGINE_RUNNING_OUTPUT } from "./constants";
import { parseDeviceList, parseTargetList } from "./parsers";
import type {
  SfdkClient,
  SfdkClientOptions,
  SfdkDevice,
  SfdkResult,
  SfdkTarget,
} from "./types";

export class SfdkClientImpl implements SfdkClient {
  constructor(private options: SfdkClientOptions) {}

  async exec(args: string[]): Promise<SfdkResult> {
    return new Promise((resolve) => {
      const proc = spawn(this.options.sfdkPath, args, {
        cwd: this.options.cwd,
      });

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

  async run(
    args: string[],
    onCancel?: (kill: () => void) => void,
  ): Promise<SfdkResult> {
    const { onOutput } = this.options;

    onOutput?.(`> sfdk ${args.join(" ")}\n\n`);

    return new Promise((resolve) => {
      const proc = spawn(this.options.sfdkPath, args, {
        cwd: this.options.cwd,
      });

      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data: Buffer) => {
        const text = data.toString();
        stdout += text;
        onOutput?.(text);
      });

      proc.stderr.on("data", (data: Buffer) => {
        const text = data.toString();
        stderr += text;
        onOutput?.(text);
      });

      onCancel?.(() => proc.kill("SIGTERM"));

      proc.on("error", (err: Error) => {
        onOutput?.(`Error: ${err.message}\n`);
        resolve({ exitCode: -1, stdout, stderr: err.message });
      });

      proc.on("close", (code: number | null) => {
        onOutput?.(`\nProcess exited with code ${code ?? "unknown"}\n`);
        resolve({ exitCode: code ?? -1, stdout, stderr });
      });
    });
  }

  async listDevices(): Promise<SfdkDevice[]> {
    const result = await this.exec(["device", "list"]);
    if (result.exitCode !== 0) {
      throw new Error(
        `sfdk device list failed (exit ${result.exitCode}): ${result.stderr}`,
      );
    }
    return parseDeviceList(result.stdout);
  }

  async listTargets(): Promise<SfdkTarget[]> {
    const result = await this.exec(["tools", "target", "list"]);
    if (result.exitCode !== 0) {
      throw new Error(
        `sfdk tools target list failed (exit ${result.exitCode}): ${result.stderr}`,
      );
    }
    return parseTargetList(result.stdout);
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

  async engineStatus(): Promise<boolean> {
    const result = await this.exec(["engine", "status"]);
    return result.stdout.trim() === ENGINE_RUNNING_OUTPUT;
  }

  async engineStart(): Promise<SfdkResult> {
    return this.run(["engine", "start"]);
  }

  async engineStop(): Promise<SfdkResult> {
    return this.run(["engine", "stop"]);
  }

  async emulatorStatus(name?: string): Promise<boolean> {
    const args = ["emulator", "status"];
    if (name) {
      args.push(name);
    }
    const result = await this.exec(args);
    return result.stdout.trim() === ENGINE_RUNNING_OUTPUT;
  }

  async emulatorStart(name?: string): Promise<SfdkResult> {
    const args = ["emulator", "start"];
    if (name) {
      args.push(name);
    }
    return this.run(args);
  }

  async emulatorStop(name?: string): Promise<SfdkResult> {
    const args = ["emulator", "stop"];
    if (name) {
      args.push(name);
    }
    return this.run(args);
  }

  async qmlLiveRun(
    appBinary: string,
    workspacePath?: string,
  ): Promise<SfdkResult> {
    const remoteArgs = ["qmlliveruntime-sailfish", "--update-on-connect"];
    if (workspacePath) {
      remoteArgs.push("--workspace", workspacePath);
    }
    remoteArgs.push(appBinary);
    return this.run(["device", "exec", ...remoteArgs]);
  }
}
