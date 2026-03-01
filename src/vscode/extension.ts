import * as vscode from "vscode";
import { SfdkClientImpl } from "../core/client";
import { registerAllCommands } from "./commandAdapter";
import { DeviceTreeProvider } from "./deviceTree";
import { registerInitCommand } from "./initProject";
import { StatusBar } from "./statusBar";
import { TargetTreeProvider } from "./targetTree";
import { SfdkTaskProvider } from "./taskProvider";

/** VS Code extension entry point. */
export async function activate(
  context: vscode.ExtensionContext,
): Promise<void> {
  const config = vscode.workspace.getConfiguration("sfdk");
  const sfdkPath = config.get<string>("path", "") || "sfdk";
  const cwd = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? ".";

  // Pseudoterminal for streaming sfdk command output
  const writeEmitter = new vscode.EventEmitter<string>();
  const pty: vscode.Pseudoterminal = {
    onDidWrite: writeEmitter.event,
    open: () => {},
    close: () => {},
  };
  const terminal = vscode.window.createTerminal({
    name: "Sailfish SDK",
    pty,
  });

  // Create the pure client with injected VS Code dependencies
  const client = new SfdkClientImpl({
    sfdkPath,
    cwd,
    onOutput: (text) => {
      writeEmitter.fire(text.replace(/\n/g, "\r\n"));
    },
  });

  // Verify sfdk is accessible
  const sfdkAvailable = await client.verify();
  if (!sfdkAvailable) {
    const message = config.get<string>("path", "")
      ? `sfdk not found at "${sfdkPath}". Check the sfdk.path setting.`
      : "sfdk not found on PATH. Install the Sailfish SDK or set sfdk.path in settings.";

    const action = await vscode.window.showWarningMessage(
      message,
      "Open Settings",
    );
    if (action === "Open Settings") {
      vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "sfdk.path",
      );
    }
  }

  // Tree providers
  const deviceTree = new DeviceTreeProvider(client);
  const targetTree = new TargetTreeProvider(client);

  const deviceView = vscode.window.createTreeView("sfdk-devices", {
    treeDataProvider: deviceTree,
    showCollapseAll: false,
  });
  const targetView = vscode.window.createTreeView("sfdk-targets", {
    treeDataProvider: targetTree,
    showCollapseAll: false,
  });

  // Status bar
  const statusBar = new StatusBar(client);
  await statusBar.refresh();

  // Task provider
  const taskProvider = vscode.tasks.registerTaskProvider(
    SfdkTaskProvider.type,
    new SfdkTaskProvider(sfdkPath),
  );

  // Register init command (file generation, not sfdk CLI)
  registerInitCommand(context, client);

  // Register all commands via adapter
  registerAllCommands(context, {
    client,
    deviceTree,
    targetTree,
    statusBar,
    terminal,
  });

  // Watch .sfdk/target for external changes
  const targetWatcher =
    vscode.workspace.createFileSystemWatcher("**/.sfdk/target");
  targetWatcher.onDidChange(() => statusBar.refresh());
  targetWatcher.onDidCreate(() => statusBar.refresh());

  // Disposables
  context.subscriptions.push(
    deviceView,
    targetView,
    taskProvider,
    targetWatcher,
    writeEmitter,
    { dispose: () => statusBar.dispose() },
  );
}

export function deactivate(): void {}
