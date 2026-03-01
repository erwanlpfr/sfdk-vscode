/** A connected Sailfish OS device or emulator. */
export interface SfdkDevice {
  index: number;
  name: string;
  type: "emulator" | "hardware-device";
  origin: "autodetected" | "user-defined";
  connection: string;
  privateKey: string;
}

/** An available build target (architecture + SDK version). */
export interface SfdkTarget {
  name: string;
  flags: string;
}

/** Result of an sfdk CLI invocation. */
export interface SfdkResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Options for creating an {@link SfdkClient} instance. */
export interface SfdkClientOptions {
  sfdkPath: string;
  cwd: string;
  onOutput?: (text: string) => void;
}

/** Declarative command definition registered in the command palette. */
export interface SfdkCommand {
  id: string;
  title: string;
  progressTitle?: string;
  cancellable?: boolean;
  execute(ctx: CommandContext): Promise<CommandResult>;
}

/** UI elements to refresh after a command completes. */
export type RefreshTarget = "devices" | "targets" | "engine" | "statusBar";

/** Dependencies injected into command handlers at execution time. */
export interface CommandContext {
  client: SfdkClient;
  pickDevice(): Promise<string | undefined>;
  pickTarget(): Promise<string | undefined>;
  getConfig<T>(key: string, fallback: T): T;
}

/** Return value from a command's {@link SfdkCommand.execute} method. */
export interface CommandResult {
  success: boolean;
  message: string;
  refresh?: RefreshTarget[];
}

/** Abstraction over the sfdk CLI for testability. */
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
