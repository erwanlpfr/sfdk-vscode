import type { SfdkCommand } from "../types";

/** Create a command that runs `sfdk <args>` with progress and optional cancellation. */
function createRunCommand(
  id: string,
  title: string,
  progressTitle: string,
  args: string[],
  successMessage: string,
  failureLabel: string,
  options?: { cancellable?: boolean },
): SfdkCommand {
  return {
    id,
    title,
    progressTitle,
    cancellable: options?.cancellable,
    async execute({ client }) {
      const result = await client.run(args);
      return {
        success: result.exitCode === 0,
        message:
          result.exitCode === 0
            ? successMessage
            : `${failureLabel} (exit code ${result.exitCode})`,
      };
    },
  };
}

export const buildCommand: SfdkCommand = {
  id: "sfdk.build",
  title: "SFDK: Build",
  progressTitle: "Building...",
  cancellable: true,
  async execute({ client, pickDevice, getConfig }) {
    const buildResult = await client.run(["build"]);
    if (buildResult.exitCode !== 0) {
      return {
        success: false,
        message: `Build failed (exit code ${buildResult.exitCode})`,
      };
    }

    const autoDeploy = getConfig("autoDeployAfterBuild", false);
    if (!autoDeploy) {
      return { success: true, message: "Build succeeded" };
    }

    const deviceName = await pickDevice();
    if (!deviceName) {
      return { success: true, message: "Build succeeded (deploy skipped — no device selected)" };
    }

    await client.setConfig("device", deviceName);

    const deployMethod = getConfig("deployMethod", "--sdk");
    const deployResult = await client.run(["deploy", deployMethod]);

    return {
      success: deployResult.exitCode === 0,
      message:
        deployResult.exitCode === 0
          ? `Built and deployed to ${deviceName}`
          : `Build succeeded but deploy failed (exit code ${deployResult.exitCode})`,
      refresh: ["statusBar"] as const,
    };
  },
};

export const qmakeCommand = createRunCommand(
  "sfdk.qmake",
  "SFDK: Run qmake",
  "Running qmake...",
  ["qmake", "."],
  "qmake succeeded",
  "qmake failed",
);

export const makeCommand = createRunCommand(
  "sfdk.make",
  "SFDK: Run make",
  "Running make...",
  ["make"],
  "make succeeded",
  "make failed",
  { cancellable: true },
);

export const packageCommand = createRunCommand(
  "sfdk.package",
  "SFDK: Create RPM Package",
  "Creating RPM package...",
  ["package"],
  "Package created",
  "Packaging failed",
  { cancellable: true },
);
