import type { SfdkCommand } from "../types";

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

export const buildCommand = createRunCommand(
  "sfdk.build",
  "SFDK: Build",
  "Building...",
  ["build"],
  "Build succeeded",
  "Build failed",
  { cancellable: true },
);

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
