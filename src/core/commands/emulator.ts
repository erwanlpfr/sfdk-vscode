import type {
  RefreshTarget,
  SfdkClient,
  SfdkCommand,
  SfdkResult,
} from "../types";

function createEmulatorCommand(
  id: string,
  title: string,
  action: "start" | "stop",
  run: (client: SfdkClient) => Promise<SfdkResult>,
): SfdkCommand {
  const pastTense = action === "start" ? "started" : "stopped";
  return {
    id,
    title,
    progressTitle: `${action === "start" ? "Starting" : "Stopping"} emulator...`,
    async execute({ client }) {
      const result = await run(client);
      return {
        success: result.exitCode === 0,
        message:
          result.exitCode === 0
            ? `Emulator ${pastTense}`
            : `Failed to ${action} emulator (exit code ${result.exitCode})`,
        refresh: ["devices"] as RefreshTarget[],
      };
    },
  };
}

export const emulatorStartCommand = createEmulatorCommand(
  "sfdk.emulatorStart",
  "SFDK: Start Emulator",
  "start",
  (client) => client.emulatorStart(),
);

export const emulatorStopCommand = createEmulatorCommand(
  "sfdk.emulatorStop",
  "SFDK: Stop Emulator",
  "stop",
  (client) => client.emulatorStop(),
);
