import type { SfdkCommand } from "../types";

export const checkCommand: SfdkCommand = {
  id: "sfdk.check",
  title: "SFDK: Check RPM Quality",
  progressTitle: "Checking RPM quality...",
  cancellable: true,
  async execute({ client }) {
    const result = await client.run(["check"]);
    return {
      success: result.exitCode === 0,
      message:
        result.exitCode === 0
          ? "Quality check passed"
          : `Quality check found issues (exit code ${result.exitCode})`,
    };
  },
};
