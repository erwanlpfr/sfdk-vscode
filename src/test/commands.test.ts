import { describe, expect, it } from "bun:test";
import {
  buildCommand,
  makeCommand,
  packageCommand,
  qmakeCommand,
} from "../core/commands/build";
import { checkCommand } from "../core/commands/check";
import { deployCommand } from "../core/commands/deploy";
import { setDeviceCommand } from "../core/commands/device";
import {
  emulatorStartCommand,
  emulatorStopCommand,
} from "../core/commands/emulator";
import {
  engineStartCommand,
  engineStopCommand,
  engineToggleCommand,
} from "../core/commands/engine";
import { qmlLiveRunCommand } from "../core/commands/qmllive";
import { setTargetCommand } from "../core/commands/target";
import type { CommandContext, SfdkClient, SfdkResult } from "../core/types";

// ---- Mock helpers ----

const ok: SfdkResult = { exitCode: 0, stdout: "", stderr: "" };
const fail: SfdkResult = { exitCode: 1, stdout: "", stderr: "error" };

function mockClient(overrides: Partial<SfdkClient> = {}): SfdkClient {
  return {
    exec: async () => ok,
    run: async () => ok,
    listDevices: async () => [
      {
        index: 0,
        name: "Test Device",
        type: "hardware-device",
        origin: "user-defined",
        connection: "user@192.168.0.1:22",
        privateKey: "~/.ssh/id_rsa",
      },
    ],
    listTargets: async () => [
      { name: "SailfishOS-5.0.0.62-aarch64", flags: "sdk-provided,latest" },
    ],
    setConfig: async () => ok,
    getConfig: async () => "",
    verify: async () => true,
    engineStatus: async () => false,
    engineStart: async () => ok,
    engineStop: async () => ok,
    emulatorStatus: async () => false,
    emulatorStart: async () => ok,
    emulatorStop: async () => ok,
    qmlLiveRun: async () => ok,
    ...overrides,
  };
}

function mockContext(
  clientOverrides: Partial<SfdkClient> = {},
  ctxOverrides: Partial<CommandContext> = {},
): CommandContext {
  return {
    client: mockClient(clientOverrides),
    pickDevice: async () => "Test Device",
    pickTarget: async () => "SailfishOS-5.0.0.62-aarch64",
    getConfig: <T>(_key: string, fallback: T) => fallback,
    ...ctxOverrides,
  };
}

// ---- Build commands ----

describe("buildCommand", () => {
  it("succeeds when sfdk build exits 0", async () => {
    const result = await buildCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("succeeded");
  });

  it("fails when sfdk build exits non-zero", async () => {
    const result = await buildCommand.execute(
      mockContext({ run: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("failed");
  });
});

describe("qmakeCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await qmakeCommand.execute(mockContext());
    expect(result.success).toBe(true);
  });

  it("fails on non-zero exit", async () => {
    const result = await qmakeCommand.execute(
      mockContext({ run: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("failed");
  });
});

describe("makeCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await makeCommand.execute(mockContext());
    expect(result.success).toBe(true);
  });

  it("fails on non-zero exit", async () => {
    const result = await makeCommand.execute(
      mockContext({ run: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("failed");
  });
});

describe("packageCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await packageCommand.execute(mockContext());
    expect(result.success).toBe(true);
  });

  it("fails on non-zero exit", async () => {
    const result = await packageCommand.execute(
      mockContext({ run: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("failed");
  });
});

// ---- Deploy command ----

describe("deployCommand", () => {
  it("succeeds with device selection and build", async () => {
    const result = await deployCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("Deployed to Test Device");
    expect(result.refresh).toContain("statusBar");
  });

  it("aborts if no device selected", async () => {
    const result = await deployCommand.execute(
      mockContext({}, { pickDevice: async () => undefined }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("cancelled");
  });

  it("aborts if build fails", async () => {
    const result = await deployCommand.execute(
      mockContext({ run: async (args) => (args[0] === "build" ? fail : ok) }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Build failed");
  });

  it("fails when deploy itself fails after successful build", async () => {
    const result = await deployCommand.execute(
      mockContext({
        run: async (args) => (args[0] === "deploy" ? fail : ok),
      }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Deploy failed");
  });

  it("uses configured deploy method", async () => {
    let deployArgs: string[] = [];
    const result = await deployCommand.execute(
      mockContext(
        {
          run: async (args) => {
            if (args[0] === "deploy") {
              deployArgs = args;
            }
            return ok;
          },
        },
        {
          getConfig: <T>(key: string, fallback: T) =>
            (key === "deployMethod" ? "--rsync" : fallback) as T,
        },
      ),
    );
    expect(result.success).toBe(true);
    expect(deployArgs).toEqual(["deploy", "--rsync"]);
  });

  it("skips build when autoBuildBeforeDeploy is false", async () => {
    let buildCalled = false;
    const result = await deployCommand.execute(
      mockContext(
        {
          run: async (args) => {
            if (args[0] === "build") {
              buildCalled = true;
            }
            return ok;
          },
        },
        {
          getConfig: <T>(key: string, fallback: T) =>
            (key === "autoBuildBeforeDeploy" ? false : fallback) as T,
        },
      ),
    );
    expect(result.success).toBe(true);
    expect(buildCalled).toBe(false);
  });
});

// ---- Device/Target commands ----

describe("setDeviceCommand", () => {
  it("sets device when picked", async () => {
    const result = await setDeviceCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("Test Device");
    expect(result.refresh).toContain("statusBar");
  });

  it("fails when no device picked", async () => {
    const result = await setDeviceCommand.execute(
      mockContext({}, { pickDevice: async () => undefined }),
    );
    expect(result.success).toBe(false);
  });
});

describe("setTargetCommand", () => {
  it("sets target when picked", async () => {
    const result = await setTargetCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("SailfishOS-5.0.0.62-aarch64");
    expect(result.refresh).toContain("statusBar");
  });

  it("fails when no target picked", async () => {
    const result = await setTargetCommand.execute(
      mockContext({}, { pickTarget: async () => undefined }),
    );
    expect(result.success).toBe(false);
  });
});

// ---- Engine commands ----

describe("engineStartCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await engineStartCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("started");
    expect(result.refresh).toContain("engine");
  });

  it("fails on non-zero exit", async () => {
    const result = await engineStartCommand.execute(
      mockContext({ engineStart: async () => fail }),
    );
    expect(result.success).toBe(false);
  });
});

describe("engineStopCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await engineStopCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("stopped");
  });

  it("fails on non-zero exit", async () => {
    const result = await engineStopCommand.execute(
      mockContext({ engineStop: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Failed");
  });
});

describe("engineToggleCommand", () => {
  it("starts engine when stopped", async () => {
    const result = await engineToggleCommand.execute(
      mockContext({ engineStatus: async () => false }),
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain("started");
  });

  it("stops engine when running", async () => {
    const result = await engineToggleCommand.execute(
      mockContext({ engineStatus: async () => true }),
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain("stopped");
  });
});

// ---- Emulator commands ----

describe("emulatorStartCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await emulatorStartCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.refresh).toContain("devices");
  });

  it("fails on non-zero exit", async () => {
    const result = await emulatorStartCommand.execute(
      mockContext({ emulatorStart: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Failed");
  });
});

describe("emulatorStopCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await emulatorStopCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.refresh).toContain("devices");
  });

  it("fails on non-zero exit", async () => {
    const result = await emulatorStopCommand.execute(
      mockContext({ emulatorStop: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("Failed");
  });
});

// ---- Check command ----

describe("checkCommand", () => {
  it("succeeds on exit 0", async () => {
    const result = await checkCommand.execute(mockContext());
    expect(result.success).toBe(true);
    expect(result.message).toContain("passed");
  });

  it("reports issues on non-zero exit", async () => {
    const result = await checkCommand.execute(
      mockContext({ run: async () => fail }),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("issues");
  });
});

// ---- QML Live command ----

describe("qmlLiveRunCommand", () => {
  it("succeeds with app binary configured", async () => {
    const result = await qmlLiveRunCommand.execute(
      mockContext(
        {},
        {
          getConfig: <T>(key: string, fallback: T) =>
            (key === "qmlLive.appBinary"
              ? "/usr/bin/harbour-myapp"
              : fallback) as T,
        },
      ),
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain("QML Live session ended");
  });

  it("fails when no app binary configured", async () => {
    const result = await qmlLiveRunCommand.execute(mockContext());
    expect(result.success).toBe(false);
    expect(result.message).toContain("No app binary configured");
  });

  it("passes workspace path when configured", async () => {
    let runArgs: string[] = [];
    const result = await qmlLiveRunCommand.execute(
      mockContext(
        {
          qmlLiveRun: async (appBinary, workspacePath) => {
            runArgs = [appBinary, workspacePath ?? ""];
            return ok;
          },
        },
        {
          getConfig: <T>(key: string, fallback: T) => {
            if (key === "qmlLive.appBinary")
              return "/usr/bin/harbour-myapp" as T;
            if (key === "qmlLive.workspacePath") return "qml" as T;
            return fallback;
          },
        },
      ),
    );
    expect(result.success).toBe(true);
    expect(runArgs).toEqual(["/usr/bin/harbour-myapp", "qml"]);
  });

  it("fails when qmlLiveRun exits non-zero", async () => {
    const result = await qmlLiveRunCommand.execute(
      mockContext(
        { qmlLiveRun: async () => fail },
        {
          getConfig: <T>(key: string, fallback: T) =>
            (key === "qmlLive.appBinary"
              ? "/usr/bin/harbour-myapp"
              : fallback) as T,
        },
      ),
    );
    expect(result.success).toBe(false);
    expect(result.message).toContain("QML Live failed");
  });
});
