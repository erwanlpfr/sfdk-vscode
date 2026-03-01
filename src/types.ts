export interface SfdkDevice {
  index: number;
  name: string;
  type: "emulator" | "hardware-device";
  origin: "autodetected" | "user-defined";
  connection: string;
  privateKey: string;
}

export interface SfdkTarget {
  name: string;
  flags: string;
}

export interface SfdkResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}
