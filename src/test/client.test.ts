import { describe, expect, it, mock } from "bun:test";
import { SfdkClientImpl } from "../core/client";
import { ENGINE_RUNNING_OUTPUT } from "../core/constants";

/**
 * These tests mock child_process.spawn to verify the client's
 * process management, output collection, and parsing integration.
 */

type Callback = (...args: unknown[]) => void;

function _createMockProc(
  stdout: string,
  stderr: string,
  exitCode: number | null,
  options?: { error?: Error },
) {
  const stdoutListeners: Record<string, Callback[]> = {};
  const stderrListeners: Record<string, Callback[]> = {};
  const procListeners: Record<string, Callback[]> = {};

  function addListener(
    map: Record<string, Callback[]>,
    event: string,
    fn: Callback,
  ) {
    if (!map[event]) map[event] = [];
    map[event].push(fn);
  }

  const mockStdout = {
    on(event: string, fn: Callback) {
      addListener(stdoutListeners, event, fn);
    },
  };
  const mockStderr = {
    on(event: string, fn: Callback) {
      addListener(stderrListeners, event, fn);
    },
  };

  const proc = {
    stdout: mockStdout,
    stderr: mockStderr,
    kill: mock(() => {}),
    on(event: string, fn: Callback) {
      addListener(procListeners, event, fn);
    },
  };

  // Schedule events for next tick so the promise can set up listeners first
  queueMicrotask(() => {
    if (stdout) {
      for (const fn of stdoutListeners.data ?? []) {
        fn(Buffer.from(stdout));
      }
    }
    if (stderr) {
      for (const fn of stderrListeners.data ?? []) {
        fn(Buffer.from(stderr));
      }
    }
    if (options?.error) {
      for (const fn of procListeners.error ?? []) {
        fn(options.error);
      }
    } else {
      for (const fn of procListeners.close ?? []) {
        fn(exitCode);
      }
    }
  });

  return proc;
}

// We need to intercept spawn calls. Since SfdkClientImpl imports spawn directly,
// we test the higher-level methods that depend on exec/run.
// For unit tests of the parsing integration, we can test via the public API
// by creating a client subclass that overrides exec.

class TestableClient extends SfdkClientImpl {
  private execResults: Array<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> = [];
  private execCallLog: string[][] = [];

  queueExecResult(stdout: string, stderr: string, exitCode: number) {
    this.execResults.push({ stdout, stderr, exitCode });
  }

  getExecCalls(): string[][] {
    return this.execCallLog;
  }

  override async exec(args: string[]) {
    this.execCallLog.push(args);
    const result = this.execResults.shift();
    if (!result) {
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    return result;
  }

  override async run(args: string[]) {
    return this.exec(args);
  }
}

function createTestClient(): TestableClient {
  return new TestableClient({ sfdkPath: "/usr/bin/sfdk", cwd: "/tmp" });
}

// ---- listDevices ----

describe("SfdkClientImpl.listDevices", () => {
  it("parses device list from exec output", async () => {
    const client = createTestClient();
    client.queueExecResult(
      `#0 "Emulator"\n    emulator         autodetected  user@127.0.0.1:2223\n    private-key: ~/.ssh/key\n`,
      "",
      0,
    );

    const devices = await client.listDevices();
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe("Emulator");
    expect(devices[0].type).toBe("emulator");
  });

  it("throws on non-zero exit code", async () => {
    const client = createTestClient();
    client.queueExecResult("", "connection refused", 1);

    expect(client.listDevices()).rejects.toThrow("sfdk device list failed");
  });

  it("returns empty array for empty output", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    const devices = await client.listDevices();
    expect(devices).toHaveLength(0);
  });
});

// ---- listTargets ----

describe("SfdkClientImpl.listTargets", () => {
  it("parses target list from exec output", async () => {
    const client = createTestClient();
    client.queueExecResult(
      "SailfishOS-5.0.0.62-aarch64  sdk-provided,latest\n",
      "",
      0,
    );

    const targets = await client.listTargets();
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("SailfishOS-5.0.0.62-aarch64");
    expect(targets[0].flags).toBe("sdk-provided,latest");
  });

  it("throws on non-zero exit code", async () => {
    const client = createTestClient();
    client.queueExecResult("", "error", 1);

    expect(client.listTargets()).rejects.toThrow(
      "sfdk tools target list failed",
    );
  });
});

// ---- engineStatus ----

describe("SfdkClientImpl.engineStatus", () => {
  it("returns true when engine is running", async () => {
    const client = createTestClient();
    client.queueExecResult(`${ENGINE_RUNNING_OUTPUT}\n`, "", 0);

    expect(await client.engineStatus()).toBe(true);
  });

  it("returns false when engine is stopped", async () => {
    const client = createTestClient();
    client.queueExecResult("running: no\n", "", 0);

    expect(await client.engineStatus()).toBe(false);
  });

  it("returns false on empty output", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    expect(await client.engineStatus()).toBe(false);
  });
});

// ---- emulatorStatus ----

describe("SfdkClientImpl.emulatorStatus", () => {
  it("returns true when emulator is running", async () => {
    const client = createTestClient();
    client.queueExecResult(`${ENGINE_RUNNING_OUTPUT}\n`, "", 0);

    expect(await client.emulatorStatus()).toBe(true);
  });

  it("passes name argument when provided", async () => {
    const client = createTestClient();
    client.queueExecResult("running: no\n", "", 0);

    await client.emulatorStatus("my-emulator");
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual(["emulator", "status", "my-emulator"]);
  });

  it("omits name argument when not provided", async () => {
    const client = createTestClient();
    client.queueExecResult("running: no\n", "", 0);

    await client.emulatorStatus();
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual(["emulator", "status"]);
  });
});

// ---- verify ----

describe("SfdkClientImpl.verify", () => {
  it("returns true on exit 0", async () => {
    const client = createTestClient();
    client.queueExecResult("sfdk 3.11.0\n", "", 0);

    expect(await client.verify()).toBe(true);
  });

  it("returns false on non-zero exit", async () => {
    const client = createTestClient();
    client.queueExecResult("", "not found", 127);

    expect(await client.verify()).toBe(false);
  });
});

// ---- setConfig / getConfig ----

describe("SfdkClientImpl.setConfig", () => {
  it("calls exec with correct args", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    await client.setConfig("device", "My Phone");
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual(["config", "--global", "device=My Phone"]);
  });
});

describe("SfdkClientImpl.getConfig", () => {
  it("returns stdout from config --show", async () => {
    const client = createTestClient();
    client.queueExecResult("device = My Phone\ntarget = aarch64\n", "", 0);

    const output = await client.getConfig();
    expect(output).toContain("device = My Phone");
    expect(output).toContain("target = aarch64");
  });
});

// ---- engine/emulator start/stop args ----

describe("SfdkClientImpl.emulatorStart", () => {
  it("passes name when provided", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    await client.emulatorStart("test-emu");
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual(["emulator", "start", "test-emu"]);
  });

  it("omits name when not provided", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    await client.emulatorStart();
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual(["emulator", "start"]);
  });
});

describe("SfdkClientImpl.emulatorStop", () => {
  it("passes name when provided", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    await client.emulatorStop("test-emu");
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual(["emulator", "stop", "test-emu"]);
  });
});

// ---- qmlLiveRun ----

describe("SfdkClientImpl.qmlLiveRun", () => {
  it("runs without workspace path", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    await client.qmlLiveRun("/usr/bin/harbour-myapp");
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual([
      "device",
      "exec",
      "qmlliveruntime-sailfish",
      "--update-on-connect",
      "/usr/bin/harbour-myapp",
    ]);
  });

  it("runs with workspace path", async () => {
    const client = createTestClient();
    client.queueExecResult("", "", 0);

    await client.qmlLiveRun("/usr/bin/harbour-myapp", "qml");
    const calls = client.getExecCalls();
    expect(calls[0]).toEqual([
      "device",
      "exec",
      "qmlliveruntime-sailfish",
      "--update-on-connect",
      "--workspace",
      "qml",
      "/usr/bin/harbour-myapp",
    ]);
  });
});
