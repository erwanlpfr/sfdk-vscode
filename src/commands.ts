import * as vscode from "vscode";
import { Sfdk } from "./sfdk";
import { DeviceTreeProvider, DeviceTreeItem } from "./devices";
import { TargetTreeProvider } from "./targets";
import { StatusBar } from "./statusBar";

export function registerCommands(
  context: vscode.ExtensionContext,
  sfdk: Sfdk,
  deviceTree: DeviceTreeProvider,
  targetTree: TargetTreeProvider,
  statusBar: StatusBar
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.build", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "SFDK: Building...",
          cancellable: true,
        },
        async (_progress, token) => {
          const result = await sfdk.run(["build"], token);
          if (result.exitCode === 0) {
            vscode.window.showInformationMessage("SFDK: Build succeeded");
          } else if (token.isCancellationRequested) {
            vscode.window.showWarningMessage("SFDK: Build cancelled");
          } else {
            vscode.window.showErrorMessage(
              `SFDK: Build failed (exit code ${result.exitCode})`
            );
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      "sfdk.deploy",
      async (item?: DeviceTreeItem) => {
        let deviceName: string | undefined;

        if (item?.device) {
          deviceName = item.device.name;
        } else {
          let devices = deviceTree.getDevices();
          if (devices.length === 0) {
            try {
              devices = await sfdk.listDevices();
            } catch {
              vscode.window.showErrorMessage(
                "SFDK: No devices available. Add a device in Sailfish SDK first."
              );
              return;
            }
          }

          if (devices.length === 0) {
            vscode.window.showErrorMessage(
              "SFDK: No devices available. Add a device in Sailfish SDK first."
            );
            return;
          }

          if (devices.length === 1) {
            deviceName = devices[0].name;
          } else {
            const pick = await vscode.window.showQuickPick(
              devices.map((d) => ({
                label: d.name,
                description:
                  d.type === "emulator" ? "Emulator" : "Hardware",
                detail: d.connection,
                deviceName: d.name,
              })),
              { placeHolder: "Select a device to deploy to" }
            );
            if (!pick) {
              return;
            }
            deviceName = pick.deviceName;
          }
        }

        await sfdk.setConfig("device", deviceName);

        const autoBuild = vscode.workspace
          .getConfiguration("sfdk")
          .get<boolean>("autoBuildBeforeDeploy", true);

        if (autoBuild) {
          const buildResult = await sfdk.run(["build"]);
          if (buildResult.exitCode !== 0) {
            vscode.window.showErrorMessage(
              "SFDK: Build failed. Deploy aborted."
            );
            return;
          }
        }

        const deployMethod = vscode.workspace
          .getConfiguration("sfdk")
          .get<string>("deployMethod", "--sdk");

        await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: `SFDK: Deploying to ${deviceName}...`,
            cancellable: true,
          },
          async (_progress, token) => {
            const result = await sfdk.run(["deploy", deployMethod], token);
            if (result.exitCode === 0) {
              vscode.window.showInformationMessage(
                `SFDK: Deployed to ${deviceName}`
              );
            } else {
              vscode.window.showErrorMessage(
                `SFDK: Deploy failed (exit code ${result.exitCode})`
              );
            }
          }
        );

        await statusBar.refresh();
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.listDevices", () => {
      deviceTree.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.refreshTargets", () => {
      targetTree.refresh();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.setTarget", async () => {
      const targets = await sfdk.listTargets();
      if (targets.length === 0) {
        vscode.window.showErrorMessage("SFDK: No build targets found.");
        return;
      }

      const pick = await vscode.window.showQuickPick(
        targets.map((t) => ({
          label: t.name,
          description: t.flags,
        })),
        { placeHolder: "Select a build target" }
      );
      if (!pick) {
        return;
      }

      const result = await sfdk.setConfig("target", pick.label);
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `SFDK: Target set to ${pick.label}`
        );
        await statusBar.refresh();
      } else {
        vscode.window.showErrorMessage(
          `SFDK: Failed to set target: ${result.stderr}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.setDevice", async () => {
      const devices = await sfdk.listDevices();
      if (devices.length === 0) {
        vscode.window.showErrorMessage("SFDK: No devices available.");
        return;
      }

      const pick = await vscode.window.showQuickPick(
        devices.map((d) => ({
          label: d.name,
          description: d.type === "emulator" ? "Emulator" : "Hardware",
          detail: d.connection,
        })),
        { placeHolder: "Select a device" }
      );
      if (!pick) {
        return;
      }

      const result = await sfdk.setConfig("device", pick.label);
      if (result.exitCode === 0) {
        vscode.window.showInformationMessage(
          `SFDK: Device set to ${pick.label}`
        );
        await statusBar.refresh();
      } else {
        vscode.window.showErrorMessage(
          `SFDK: Failed to set device: ${result.stderr}`
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.check", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "SFDK: Checking RPM quality...",
          cancellable: true,
        },
        async (_progress, token) => {
          const result = await sfdk.run(["check"], token);
          if (result.exitCode === 0) {
            vscode.window.showInformationMessage(
              "SFDK: Quality check passed"
            );
          } else {
            vscode.window.showWarningMessage(
              `SFDK: Quality check found issues (exit code ${result.exitCode})`
            );
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.qmake", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "SFDK: Running qmake...",
          cancellable: false,
        },
        async () => {
          const result = await sfdk.run(["qmake", "."]);
          if (result.exitCode === 0) {
            vscode.window.showInformationMessage("SFDK: qmake succeeded");
          } else {
            vscode.window.showErrorMessage(
              `SFDK: qmake failed (exit code ${result.exitCode})`
            );
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.make", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "SFDK: Running make...",
          cancellable: true,
        },
        async (_progress, token) => {
          const result = await sfdk.run(["make"], token);
          if (result.exitCode === 0) {
            vscode.window.showInformationMessage("SFDK: make succeeded");
          } else {
            vscode.window.showErrorMessage(
              `SFDK: make failed (exit code ${result.exitCode})`
            );
          }
        }
      );
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.package", async () => {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: "SFDK: Creating RPM package...",
          cancellable: true,
        },
        async (_progress, token) => {
          const result = await sfdk.run(["package"], token);
          if (result.exitCode === 0) {
            vscode.window.showInformationMessage("SFDK: Package created");
          } else {
            vscode.window.showErrorMessage(
              `SFDK: Packaging failed (exit code ${result.exitCode})`
            );
          }
        }
      );
    })
  );
}
