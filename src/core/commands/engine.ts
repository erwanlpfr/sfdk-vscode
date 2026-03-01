import type { SfdkClient, SfdkCommand, SfdkResult } from "../types";

function createEngineCommand(
  id: string,
  title: string,
  action: "start" | "stop",
  run: (client: SfdkClient) => Promise<SfdkResult>,
): SfdkCommand {
  const pastTense = action === "start" ? "started" : "stopped";
  return {
    id,
    title,
    progressTitle: `${action === "start" ? "Starting" : "Stopping"} build engine...`,
    async execute({ client }) {
      const result = await run(client);
      return {
        success: result.exitCode === 0,
        message:
          result.exitCode === 0
            ? `Build engine ${pastTense}`
            : `Failed to ${action} build engine (exit code ${result.exitCode})`,
        refresh: ["engine"] as const,
      };
    },
  };
}

export const engineStartCommand = createEngineCommand(
  "sfdk.engineStart",
  "SFDK: Start Build Engine",
  "start",
  (client) => client.engineStart(),
);

export const engineStopCommand = createEngineCommand(
  "sfdk.engineStop",
  "SFDK: Stop Build Engine",
  "stop",
  (client) => client.engineStop(),
);

export const engineToggleCommand: SfdkCommand = {
  id: "sfdk.engineToggle",
  title: "SFDK: Start/Stop Build Engine",
  progressTitle: "Toggling build engine...",
  async execute({ client }) {
    const running = await client.engineStatus();
    const result = running
      ? await client.engineStop()
      : await client.engineStart();
    const action = running ? "stopped" : "started";

    return {
      success: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? `Build engine ${action}`
          : `Failed to ${running ? "stop" : "start"} build engine (exit code ${result.exitCode})`,
      refresh: ["engine"] as const,
    };
  },
};
