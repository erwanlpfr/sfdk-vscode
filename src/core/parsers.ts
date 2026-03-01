import type { SfdkDevice, SfdkTarget } from "./types";

/**
 * Parse `sfdk device list` output.
 *
 * Expected format (3-line pattern per device):
 * ```
 * #0 "Sailfish OS Emulator 5.0.0.62"
 *     emulator         autodetected  defaultuser@127.0.0.1:2223
 *     private-key: ~/SailfishOS/vmshare/ssh/private_keys/sdk
 * ```
 */
export function parseDeviceList(output: string): SfdkDevice[] {
  const devices: SfdkDevice[] = [];
  const lines = output.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const headerMatch = lines[i].match(/^#(\d+)\s+"(.+)"/);
    if (!headerMatch) {
      continue;
    }

    const index = parseInt(headerMatch[1], 10);
    const name = headerMatch[2];

    const detailLine = lines[i + 1]?.trim() ?? "";
    const detailParts = detailLine.split(/\s{2,}/);
    const type = detailParts[0] as "emulator" | "hardware-device";
    const origin = detailParts[1] as "autodetected" | "user-defined";
    const connection = detailParts[2] ?? "";

    const keyLine = lines[i + 2]?.trim() ?? "";
    const keyMatch = keyLine.match(/^private-key:\s+(.+)/);
    const privateKey = keyMatch?.[1] ?? "";

    devices.push({ index, name, type, origin, connection, privateKey });
    i += 2;
  }

  return devices;
}

/**
 * Parse `sfdk tools target list` output.
 *
 * Expected format (one line per target):
 * ```
 * SailfishOS-5.0.0.62-aarch64  sdk-provided,latest
 * ```
 */
export function parseTargetList(output: string): SfdkTarget[] {
  const targets: SfdkTarget[] = [];
  const lines = output.split("\n").filter((l) => l.trim());

  for (const line of lines) {
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length >= 1) {
      targets.push({
        name: parts[0],
        flags: parts[1] ?? "",
      });
    }
  }

  return targets;
}
