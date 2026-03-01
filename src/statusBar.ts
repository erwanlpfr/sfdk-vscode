import * as vscode from "vscode";
import { Sfdk } from "./sfdk";

export class StatusBar {
  private targetItem: vscode.StatusBarItem;
  private deviceItem: vscode.StatusBarItem;

  constructor(private sfdk: Sfdk) {
    this.targetItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this.targetItem.command = "sfdk.setTarget";
    this.targetItem.tooltip = "Click to change Sailfish OS build target";

    this.deviceItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      99
    );
    this.deviceItem.command = "sfdk.setDevice";
    this.deviceItem.tooltip = "Click to change Sailfish OS device";
  }

  async refresh(): Promise<void> {
    await Promise.all([this.refreshTarget(), this.refreshDevice()]);
  }

  private async refreshTarget(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri;
    let targetName = "";

    if (workspaceFolder) {
      try {
        const targetUri = vscode.Uri.joinPath(
          workspaceFolder,
          ".sfdk",
          "target"
        );
        const content = await vscode.workspace.fs.readFile(targetUri);
        targetName = Buffer.from(content)
          .toString("utf-8")
          .trim()
          .replace(/\.default$/, "");
      } catch {
        // .sfdk/target doesn't exist yet
      }
    }

    this.targetItem.text = targetName
      ? `$(package) ${targetName}`
      : "$(package) No target";
    this.targetItem.show();
  }

  private async refreshDevice(): Promise<void> {
    let deviceName = "";

    try {
      const configOutput = await this.sfdk.getConfig();
      const deviceMatch = configOutput.match(/^\s*device\s*=\s*(.+)$/m);
      deviceName = deviceMatch?.[1]?.trim() ?? "";
    } catch {
      // sfdk config --show failed
    }

    this.deviceItem.text = deviceName
      ? `$(device-mobile) ${deviceName}`
      : "$(device-mobile) No device";
    this.deviceItem.show();
  }

  dispose(): void {
    this.targetItem.dispose();
    this.deviceItem.dispose();
  }
}
