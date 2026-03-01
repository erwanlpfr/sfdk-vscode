import type { SfdkCommand } from "../types";

export const qmlLiveRunCommand: SfdkCommand = {
  id: "sfdk.qmlLiveRun",
  title: "SFDK: Run with QML Live",
  progressTitle: "Running with QML Live...",
  cancellable: true,
  async execute({ client, getConfig }) {
    const appBinary = getConfig<string>("qmlLive.appBinary", "");
    if (!appBinary) {
      return {
        success: false,
        message:
          'No app binary configured. Set "sfdk.qmlLive.appBinary" in settings (e.g. /usr/bin/harbour-myapp).',
      };
    }

    const workspacePath =
      getConfig<string>("qmlLive.workspacePath", "") || undefined;
    const result = await client.qmlLiveRun(appBinary, workspacePath);

    return {
      success: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? "QML Live session ended"
          : `QML Live failed (exit code ${result.exitCode})`,
    };
  },
};
