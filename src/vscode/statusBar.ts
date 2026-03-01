import * as vscode from "vscode";
import {
  DEFAULT_TARGET_SUFFIX,
  ENGINE_POLL_INTERVAL_MS,
} from "../core/constants";
import type { SfdkClient } from "../core/types";

/** Manages the status bar items (build, engine, target, device, QML Live). */
export class StatusBar {
  private buildItem: vscode.StatusBarItem;
  private engineItem: vscode.StatusBarItem;
  private targetItem: vscode.StatusBarItem;
  private deviceItem: vscode.StatusBarItem;
  private qmlLiveItem: vscode.StatusBarItem;

  private engineRunning = false;
  private qmlLiveEnabled = false;
  private pollTimer: ReturnType<typeof setInterval> | undefined;

  constructor(private client: SfdkClient) {
    this.buildItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      102,
    );
    this.buildItem.text = "$(play) Build";
    this.buildItem.command = "sfdk.build";
    this.buildItem.tooltip = "Build with sfdk";
    this.buildItem.show();

    this.engineItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      101,
    );
    this.engineItem.command = "sfdk.engineToggle";

    this.targetItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100,
    );
    this.targetItem.command = "sfdk.setTarget";

    this.deviceItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      99,
    );
    this.deviceItem.command = "sfdk.setDevice";

    this.qmlLiveItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      98,
    );
    this.qmlLiveItem.command = "sfdk.qmlLiveToggle";
    this.updateQmlLiveDisplay();
    this.qmlLiveItem.show();

    this.pollTimer = setInterval(
      () => this.refreshEngine(),
      ENGINE_POLL_INTERVAL_MS,
    );
  }

  async refresh(): Promise<void> {
    await Promise.all([
      this.refreshTarget(),
      this.refreshDevice(),
      this.refreshEngine(),
    ]);
  }

  async refreshEngine(): Promise<void> {
    try {
      this.engineRunning = await this.client.engineStatus();
    } catch {
      this.engineRunning = false;
    }

    if (this.engineRunning) {
      this.engineItem.text = "$(vm-running) Engine: Running";
      this.engineItem.tooltip = "Build engine is running — click to stop";
      this.engineItem.backgroundColor = undefined;
    } else {
      this.engineItem.text = "$(vm-outline) Engine: Stopped";
      this.engineItem.tooltip = "Build engine is stopped — click to start";
      this.engineItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    }
    this.engineItem.show();
  }

  private async refreshTarget(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
    let targetName = "";

    if (workspaceFolder) {
      try {
        const targetUri = vscode.Uri.joinPath(
          workspaceFolder,
          ".sfdk",
          "target",
        );
        const content = await vscode.workspace.fs.readFile(targetUri);
        targetName = Buffer.from(content)
          .toString("utf-8")
          .trim()
          .replace(new RegExp(`\\${DEFAULT_TARGET_SUFFIX}$`), "");
      } catch {
        // .sfdk/target doesn't exist yet
      }
    }

    if (targetName) {
      // Extract arch suffix for compact display (e.g., "aarch64" from "SailfishOS-5.0.0.62-aarch64")
      const archMatch = targetName.match(/-([^-]+)$/);
      const shortName = archMatch ? archMatch[1] : targetName;
      this.targetItem.text = `$(package) ${shortName}`;
      this.targetItem.tooltip = `Build target: ${targetName}\nClick to change`;
      this.targetItem.backgroundColor = undefined;
    } else {
      this.targetItem.text = "$(package) No target";
      this.targetItem.tooltip = "No build target set — click to select one";
      this.targetItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    }
    this.targetItem.show();
  }

  toggleQmlLive(): boolean {
    this.qmlLiveEnabled = !this.qmlLiveEnabled;
    this.updateQmlLiveDisplay();
    return this.qmlLiveEnabled;
  }

  get isQmlLiveEnabled(): boolean {
    return this.qmlLiveEnabled;
  }

  private updateQmlLiveDisplay(): void {
    if (this.qmlLiveEnabled) {
      this.qmlLiveItem.text = "$(zap) QML Live";
      this.qmlLiveItem.tooltip = "QML Live is enabled — click to disable";
    } else {
      this.qmlLiveItem.text = "$(circle-slash) QML Live";
      this.qmlLiveItem.tooltip = "QML Live is disabled — click to enable";
    }
  }

  private async fetchActiveDevice(): Promise<{
    name: string;
    connection: string;
  }> {
    const configOutput = await this.client.getConfig();
    const deviceMatch = configOutput.match(/^\s*device\s*=\s*(.+)$/m);
    const name = deviceMatch?.[1]?.trim() ?? "";

    if (!name) {
      return { name: "", connection: "" };
    }

    const devices = await this.client.listDevices();
    const device = devices.find((d) => d.name === name);
    return { name, connection: device?.connection ?? "" };
  }

  private async refreshDevice(): Promise<void> {
    let deviceName = "";
    let deviceConnection = "";

    try {
      const active = await this.fetchActiveDevice();
      deviceName = active.name;
      deviceConnection = active.connection;
    } catch {
      // sfdk config --show failed
    }

    if (deviceName) {
      this.deviceItem.text = `$(device-mobile) ${deviceName}`;
      this.deviceItem.tooltip = deviceConnection
        ? `Device: ${deviceName}\nConnection: ${deviceConnection}\nClick to change`
        : `Device: ${deviceName}\nClick to change`;
      this.deviceItem.backgroundColor = undefined;
    } else {
      this.deviceItem.text = "$(device-mobile) No device";
      this.deviceItem.tooltip = "No device set — click to select one";
      this.deviceItem.backgroundColor = new vscode.ThemeColor(
        "statusBarItem.warningBackground",
      );
    }
    this.deviceItem.show();
  }

  dispose(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
    }
    this.buildItem.dispose();
    this.engineItem.dispose();
    this.targetItem.dispose();
    this.deviceItem.dispose();
    this.qmlLiveItem.dispose();
  }
}
