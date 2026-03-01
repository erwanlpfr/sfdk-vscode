import * as vscode from "vscode";
import { allCommands } from "../core/commands/registry";
import type { CommandContext, RefreshTarget, SfdkClient } from "../core/types";
import type { DeviceTreeProvider } from "./deviceTree";
import type { StatusBar } from "./statusBar";
import type { TargetTreeProvider } from "./targetTree";

interface AdapterDeps {
  client: SfdkClient;
  deviceTree: DeviceTreeProvider;
  targetTree: TargetTreeProvider;
  statusBar: StatusBar;
  terminal: vscode.Terminal;
}

export function registerAllCommands(
  context: vscode.ExtensionContext,
  deps: AdapterDeps,
): void {
  const { client, deviceTree, targetTree, statusBar } = deps;

  // Register all declarative commands from the registry
  for (const cmd of allCommands) {
    const handler = async () => {
      const ctx = createContext(client);

      const execute = async () => {
        const result = await cmd.execute(ctx);

        if (result.success) {
          vscode.window.showInformationMessage(`SFDK: ${result.message}`);
        } else {
          vscode.window.showErrorMessage(`SFDK: ${result.message}`);
        }

        applyRefresh(result.refresh, deps);
      };

      if (cmd.progressTitle) {
        // Show terminal for commands that produce output
        deps.terminal.show(true);
        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `SFDK: ${cmd.progressTitle}`,
            cancellable: cmd.cancellable ?? false,
          },
          async (_progress, token) => {
            if (cmd.cancellable) {
              token.onCancellationRequested(() => {
                // Cancellation is handled per-command via onCancel callback in client.run()
              });
            }
            await execute();
          },
        );
      } else {
        await execute();
      }
    };

    context.subscriptions.push(
      vscode.commands.registerCommand(cmd.id, handler),
    );
  }

  // Register simple refresh commands (not in the command registry)
  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.listDevices", () => {
      deviceTree.refresh();
    }),
    vscode.commands.registerCommand("sfdk.refreshTargets", () => {
      targetTree.refresh();
    }),
    vscode.commands.registerCommand("sfdk.qmlLiveToggle", () => {
      const enabled = statusBar.toggleQmlLive();
      vscode.window.showInformationMessage(
        `SFDK: QML Live ${enabled ? "enabled" : "disabled"}`,
      );
    }),
  );
}

function createContext(client: SfdkClient): CommandContext {
  return {
    client,

    async pickDevice(): Promise<string | undefined> {
      const devices = await client.listDevices();
      if (devices.length === 0) {
        vscode.window.showErrorMessage(
          "SFDK: No devices available. Add a device in Sailfish SDK first.",
        );
        return undefined;
      }
      if (devices.length === 1) {
        return devices[0].name;
      }
      const pick = await vscode.window.showQuickPick(
        devices.map((d) => ({
          label: d.name,
          description: d.type === "emulator" ? "Emulator" : "Hardware",
          detail: d.connection,
        })),
        { placeHolder: "Select a device" },
      );
      return pick?.label;
    },

    async pickTarget(): Promise<string | undefined> {
      const targets = await client.listTargets();
      if (targets.length === 0) {
        vscode.window.showErrorMessage("SFDK: No build targets found.");
        return undefined;
      }
      const pick = await vscode.window.showQuickPick(
        targets.map((t) => ({
          label: t.name,
          description: t.flags,
        })),
        { placeHolder: "Select a build target" },
      );
      return pick?.label;
    },

    getConfig<T>(key: string, fallback: T): T {
      return vscode.workspace.getConfiguration("sfdk").get<T>(key, fallback);
    },
  };
}

function applyRefresh(
  targets: RefreshTarget[] | undefined,
  deps: AdapterDeps,
): void {
  if (!targets) {
    return;
  }
  for (const target of targets) {
    switch (target) {
      case "devices":
        deps.deviceTree.refresh();
        break;
      case "targets":
        deps.targetTree.refresh();
        break;
      case "engine":
        deps.statusBar.refreshEngine();
        break;
      case "statusBar":
        deps.statusBar.refresh();
        break;
    }
  }
}
