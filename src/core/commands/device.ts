import type { SfdkCommand } from "../types";

export const setDeviceCommand: SfdkCommand = {
  id: "sfdk.setDevice",
  title: "SFDK: Set Device",
  async execute({ client, pickDevice }) {
    const deviceName = await pickDevice();
    if (!deviceName) {
      return { success: false, message: "No device selected" };
    }

    const result = await client.setConfig("device", deviceName);
    return {
      success: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? `Device set to ${deviceName}`
          : `Failed to set device: ${result.stderr}`,
      refresh: ["statusBar"] as const,
    };
  },
};
