import * as vscode from "vscode";
import type { SfdkClient, SfdkTarget } from "../core/types";

export class TargetTreeItem extends vscode.TreeItem {
  constructor(public readonly target: SfdkTarget) {
    super(target.name, vscode.TreeItemCollapsibleState.None);

    this.description = target.flags;
    this.tooltip = `Target: ${target.name}\nFlags: ${target.flags}`;
    this.contextValue = "target";
    this.iconPath = new vscode.ThemeIcon("package");
    this.accessibilityInformation = {
      label: `${target.name}, ${target.flags}`,
    };
  }
}

export class TargetTreeProvider
  implements vscode.TreeDataProvider<TargetTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TargetTreeItem | undefined | undefined
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  constructor(private client: SfdkClient) {}

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: TargetTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: TargetTreeItem): Promise<TargetTreeItem[]> {
    if (element) {
      return [];
    }

    try {
      const targets = await this.client.listTargets();
      return targets.map((t) => new TargetTreeItem(t));
    } catch (err) {
      console.warn("Failed to list targets:", err);
      return [];
    }
  }
}
