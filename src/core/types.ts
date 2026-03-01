// ---- Data models ----

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

// ---- Client options ----

export interface SfdkClientOptions {
  sfdkPath: string;
  cwd: string;
  onOutput?: (text: string) => void;
}

// ---- Command abstractions ----

export interface SfdkCommand {
  id: string;
  title: string;
  progressTitle?: string;
  cancellable?: boolean;
  execute(ctx: CommandContext): Promise<CommandResult>;
}

export type RefreshTarget = "devices" | "targets" | "engine" | "statusBar";

export interface CommandContext {
  client: SfdkClient;
  pickDevice(): Promise<string | undefined>;
  pickTarget(): Promise<string | undefined>;
  getConfig<T>(key: string, fallback: T): T;
}

export interface CommandResult {
  success: boolean;
  message: string;
  refresh?: RefreshTarget[];
}

// ---- Client interface (for mocking in tests) ----

export interface SfdkClient {
  exec(args: string[]): Promise<SfdkResult>;
  run(
    args: string[],
    onCancel?: (kill: () => void) => void,
  ): Promise<SfdkResult>;
  listDevices(): Promise<SfdkDevice[]>;
  listTargets(): Promise<SfdkTarget[]>;
  setConfig(name: string, value: string): Promise<SfdkResult>;
  getConfig(): Promise<string>;
  verify(): Promise<boolean>;
  engineStatus(): Promise<boolean>;
  engineStart(): Promise<SfdkResult>;
  engineStop(): Promise<SfdkResult>;
  emulatorStatus(name?: string): Promise<boolean>;
  emulatorStart(name?: string): Promise<SfdkResult>;
  emulatorStop(name?: string): Promise<SfdkResult>;
  qmlLiveRun(appBinary: string, workspacePath?: string): Promise<SfdkResult>;
}
