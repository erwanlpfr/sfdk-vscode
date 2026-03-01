import * as vscode from "vscode";
import { Sfdk } from "./sfdk";
import { SfdkTarget } from "./types";

export class TargetTreeItem extends vscode.TreeItem {
  constructor(public readonly target: SfdkTarget) {
    super(target.name, vscode.TreeItemCollapsibleState.None);

    this.description = target.flags;
    this.tooltip = `Target: ${target.name}\nFlags: ${target.flags}`;
    this.contextValue = "target";
    this.iconPath = new vscode.ThemeIcon("package");
  }
}

export class TargetTreeProvider
  implements vscode.TreeDataProvider<TargetTreeItem>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<
    TargetTreeItem | undefined | void
  >();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private targets: SfdkTarget[] = [];

  constructor(private sfdk: Sfdk) {}

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
      this.targets = await this.sfdk.listTargets();
      return this.targets.map((t) => new TargetTreeItem(t));
    } catch {
      vscode.window.showErrorMessage("Failed to list sfdk build targets.");
      return [];
    }
  }

  getTargets(): SfdkTarget[] {
    return this.targets;
  }
}
