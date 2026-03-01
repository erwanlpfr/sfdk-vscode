import * as vscode from "vscode";
import { Sfdk } from "./sfdk";
import { SfdkDevice } from "./types";

export class DeviceTreeItem extends vscode.TreeItem {
  constructor(public readonly device: SfdkDevice) {
    super(device.name, vscode.TreeItemCollapsibleState.None);

    this.description =
      device.type === "emulator"
        ? `Emulator - ${device.connection}`
        : `Device - ${device.connection}`;

    this.tooltip = [
      `Name: ${device.name}`,
      `Type: ${device.type}`,
      `Origin: ${device.origin}`,
      `Connection: ${device.connection}`,
      `Key: ${device.privateKey}`,
    ].join("\n");

    this.contextValue = "device";
    this.iconPath = new vscode.ThemeIcon(
      device.type === "emulator" ? "vm" : "device-mobile"
    );
  }
}

export class DeviceTreeProvider
  implements vscode.TreeDataProvider<DeviceTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    DeviceTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private devices: SfdkDevice[] = [];

  constructor(private sfdk: Sfdk) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: DeviceTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: DeviceTreeItem): Promise<DeviceTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      this.devices = await this.sfdk.listDevices();
      if (this.devices.length === 0) {
        return [];
      }
      return this.devices.map((d) => new DeviceTreeItem(d));
    } catch {
      vscode.window.showErrorMessage("Failed to list sfdk devices.");
      return [];
    }
  }

  getDevices(): SfdkDevice[] {
    return this.devices;
  }
}
