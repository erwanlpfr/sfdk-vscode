import type { SfdkCommand } from "../types";
import {
  buildCommand,
  makeCommand,
  packageCommand,
  qmakeCommand,
} from "./build";
import { checkCommand } from "./check";
import { deployCommand } from "./deploy";
import { setDeviceCommand } from "./device";
import { emulatorStartCommand, emulatorStopCommand } from "./emulator";
import {
  engineStartCommand,
  engineStopCommand,
  engineToggleCommand,
} from "./engine";
import { qmlLiveRunCommand } from "./qmllive";
import { setTargetCommand } from "./target";

/**
 * All registered commands. To add a new command:
 * 1. Create a file in core/commands/ exporting an SfdkCommand object
 * 2. Import and add it to this array
 * 3. Add the command ID to package.json contributes.commands
 */
export const allCommands: SfdkCommand[] = [
  buildCommand,
  qmakeCommand,
  makeCommand,
  packageCommand,
  deployCommand,
  setDeviceCommand,
  setTargetCommand,
  engineStartCommand,
  engineStopCommand,
  engineToggleCommand,
  emulatorStartCommand,
  emulatorStopCommand,
  checkCommand,
  qmlLiveRunCommand,
];
