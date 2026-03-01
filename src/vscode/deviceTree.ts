import * as vscode from "vscode";
import type { SfdkClient, SfdkDevice } from "../core/types";

/** Tree item representing a single device or emulator. */
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

    this.contextValue = device.type === "emulator" ? "emulator" : "device";
    this.iconPath = new vscode.ThemeIcon(
      device.type === "emulator" ? "vm" : "device-mobile",
    );
    this.accessibilityInformation = {
      label: `${device.name}, ${device.type === "emulator" ? "Emulator" : "Hardware device"}, ${device.connection}`,
    };
  }
}

/** Tree data provider for connected devices and emulators. */
export class DeviceTreeProvider
  implements vscode.TreeDataProvider<DeviceTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    DeviceTreeItem | undefined | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private client: SfdkClient) {}

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
      const devices = await this.client.listDevices();
      return devices.map((d) => new DeviceTreeItem(d));
    } catch (err) {
      console.warn("Failed to list devices:", err);
      return [];
    }
  }
}
