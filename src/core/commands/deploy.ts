import type { SfdkCommand } from "../types";

export const deployCommand: SfdkCommand = {
  id: "sfdk.deploy",
  title: "SFDK: Deploy to Device",
  progressTitle: "Deploying...",
  cancellable: true,
  async execute({ client, pickDevice, getConfig }) {
    const deviceName = await pickDevice();
    if (!deviceName) {
      return {
        success: false,
        message: "Deploy cancelled — no device selected",
      };
    }

    await client.setConfig("device", deviceName);

    const autoBuild = getConfig("autoBuildBeforeDeploy", true);
    if (autoBuild) {
      const buildResult = await client.run(["build"]);
      if (buildResult.exitCode !== 0) {
        return { success: false, message: "Build failed. Deploy aborted." };
      }
    }

    const deployMethod = getConfig("deployMethod", "--sdk");
    const result = await client.run(["deploy", deployMethod]);

    return {
      success: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? `Deployed to ${deviceName}`
          : `Deploy failed (exit code ${result.exitCode})`,
      refresh: ["statusBar"] as const,
    };
  },
};
