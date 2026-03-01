import * as vscode from "vscode";
import { Sfdk } from "./sfdk";
import { DeviceTreeProvider } from "./devices";
import { TargetTreeProvider } from "./targets";
import { SfdkTaskProvider } from "./tasks";
import { StatusBar } from "./statusBar";
import { registerCommands } from "./commands";

let sfdk: Sfdk;
let statusBar: StatusBar;

export async function activate(
  context: vscode.ExtensionContext
): Promise<void> {
  sfdk = new Sfdk();

  const sfdkAvailable = await sfdk.verify();
  if (!sfdkAvailable) {
    const configuredPath = vscode.workspace
      .getConfiguration("sfdk")
      .get<string>("path", "");

    const message = configuredPath
      ? `sfdk not found at "${configuredPath}". Check the sfdk.path setting.`
      : "sfdk not found on PATH. Install the Sailfish SDK or set sfdk.path in settings.";

    const action = await vscode.window.showWarningMessage(
      message,
      "Open Settings"
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "sfdk.path"
      );
    }
  }

  const deviceTree = new DeviceTreeProvider(sfdk);
  const targetTree = new TargetTreeProvider(sfdk);

  const deviceView = vscode.window.createTreeView("sfdk-devices", {
    treeDataProvider: deviceTree,
    showCollapseAll: false,
  });
  const targetView = vscode.window.createTreeView("sfdk-targets", {
    treeDataProvider: targetTree,
    showCollapseAll: false,
  });

  statusBar = new StatusBar(sfdk);
  await statusBar.refresh();

  const taskProvider = vscode.tasks.registerTaskProvider(
    SfdkTaskProvider.type,
    new SfdkTaskProvider()
  );

  registerCommands(context, sfdk, deviceTree, targetTree, statusBar);

  const targetWatcher =
    vscode.workspace.createFileSystemWatcher("**/.sfdk/target");
  targetWatcher.onDidChange(() => statusBar.refresh());
  targetWatcher.onDidCreate(() => statusBar.refresh());

  context.subscriptions.push(
    deviceView,
    targetView,
    taskProvider,
    targetWatcher,
    { dispose: () => sfdk.dispose() },
    { dispose: () => statusBar.dispose() }
  );
}

export function deactivate(): void {
  // Cleanup handled by disposables
}
