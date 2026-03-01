import type { SfdkCommand } from "../types";

export const setTargetCommand: SfdkCommand = {
  id: "sfdk.setTarget",
  title: "SFDK: Set Build Target",
  async execute({ client, pickTarget }) {
    const targetName = await pickTarget();
    if (!targetName) {
      return { success: false, message: "No target selected" };
    }

    const result = await client.setConfig("target", targetName);
    return {
      success: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? `Target set to ${targetName}`
          : `Failed to set target: ${result.stderr}`,
      refresh: ["statusBar"] as const,
    };
  },
};
