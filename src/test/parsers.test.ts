import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDeviceList, parseTargetList } from "../core/parsers";

const fixturesDir = join(__dirname, "fixtures");

describe("parseDeviceList", () => {
  const output = readFileSync(join(fixturesDir, "device-list.txt"), "utf-8");

  it("parses two devices from fixture", () => {
    const devices = parseDeviceList(output);
    expect(devices).toHaveLength(2);
  });

  it("parses emulator correctly", () => {
    const devices = parseDeviceList(output);
    const emulator = devices[0];

    expect(emulator.index).toBe(0);
    expect(emulator.name).toBe("Sailfish OS Emulator 5.0.0.62");
    expect(emulator.type).toBe("emulator");
    expect(emulator.origin).toBe("autodetected");
    expect(emulator.connection).toBe("defaultuser@127.0.0.1:2223");
    expect(emulator.privateKey).toBe(
      "~/SailfishOS/vmshare/ssh/private_keys/sdk",
    );
  });

  it("parses hardware device correctly", () => {
    const devices = parseDeviceList(output);
    const device = devices[1];

    expect(device.index).toBe(1);
    expect(device.name).toBe("Xperia 10 II - Dual SIM (ARM 64bit)");
    expect(device.type).toBe("hardware-device");
    expect(device.origin).toBe("user-defined");
    expect(device.connection).toBe("defaultuser@192.168.2.15:22");
    expect(device.privateKey).toBe("~/.ssh/qtc_id");
  });

  it("returns empty array for empty input", () => {
    expect(parseDeviceList("")).toHaveLength(0);
  });

  it("returns empty array for whitespace-only input", () => {
    expect(parseDeviceList("  \n  \n  ")).toHaveLength(0);
  });

  it("parses single device", () => {
    const input = `#0 "My Device"\n    hardware-device  user-defined  user@10.0.0.1:22\n    private-key: ~/.ssh/key\n`;
    const devices = parseDeviceList(input);
    expect(devices).toHaveLength(1);
    expect(devices[0].name).toBe("My Device");
  });

  it("handles device names with special characters", () => {
    const input = `#0 "Xperia 10 III (5G) - Test"\n    hardware-device  user-defined  user@10.0.0.1:22\n    private-key: ~/.ssh/key\n`;
    const devices = parseDeviceList(input);
    expect(devices[0].name).toBe("Xperia 10 III (5G) - Test");
  });

  it("handles missing private-key line gracefully", () => {
    const input = `#0 "Device"\n    emulator  autodetected  user@127.0.0.1:2223\n`;
    const devices = parseDeviceList(input);
    expect(devices).toHaveLength(1);
    expect(devices[0].privateKey).toBe("");
  });
});

describe("parseTargetList", () => {
  const output = readFileSync(join(fixturesDir, "target-list.txt"), "utf-8");

  it("parses three targets from fixture", () => {
    const targets = parseTargetList(output);
    expect(targets).toHaveLength(3);
  });

  it("parses aarch64 target", () => {
    const targets = parseTargetList(output);

    expect(targets[0].name).toBe("SailfishOS-5.0.0.62-aarch64");
    expect(targets[0].flags).toBe("sdk-provided,latest");
  });

  it("parses armv7hl target", () => {
    const targets = parseTargetList(output);

    expect(targets[1].name).toBe("SailfishOS-5.0.0.62-armv7hl");
    expect(targets[1].flags).toBe("sdk-provided,latest");
  });

  it("parses i486 target", () => {
    const targets = parseTargetList(output);

    expect(targets[2].name).toBe("SailfishOS-5.0.0.62-i486");
    expect(targets[2].flags).toBe("sdk-provided,latest");
  });

  it("returns empty array for empty input", () => {
    expect(parseTargetList("")).toHaveLength(0);
  });

  it("parses single target", () => {
    const targets = parseTargetList(
      "SailfishOS-5.0.0.62-aarch64  sdk-provided,latest\n",
    );
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("SailfishOS-5.0.0.62-aarch64");
  });

  it("handles target with no flags", () => {
    const targets = parseTargetList("SailfishOS-5.0.0.62-aarch64\n");
    expect(targets).toHaveLength(1);
    expect(targets[0].name).toBe("SailfishOS-5.0.0.62-aarch64");
    expect(targets[0].flags).toBe("");
  });

  it("handles extra whitespace between columns", () => {
    const targets = parseTargetList(
      "SailfishOS-5.0.0.62-aarch64      sdk-provided,latest\n",
    );
    expect(targets).toHaveLength(1);
    expect(targets[0].flags).toBe("sdk-provided,latest");
  });
});
