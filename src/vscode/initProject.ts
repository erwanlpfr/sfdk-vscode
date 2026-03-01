import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import * as vscode from "vscode";
import {
  findGccVersion,
  generateClangd,
  generateVscodeSettings,
  resolveTarget,
} from "../core/templates";
import type { SfdkClient } from "../core/types";

/** Return the default SDK targets directory path. */
function getSdkTargetsDir(): string {
  const home = process.env.HOME ?? process.env.USERPROFILE ?? "";
  return join(home, "SailfishOS", "mersdk", "targets");
}

/**
 * Register the "SFDK: Initialize Project" command.
 *
 * Generates .clangd and .vscode/settings.json based on the current
 * build target, auto-discovering Qt modules and GCC version.
 */
export function registerInitCommand(
  context: vscode.ExtensionContext,
  client: SfdkClient,
): void {
  context.subscriptions.push(
    vscode.commands.registerCommand("sfdk.init", () => runInit(client)),
  );
}

async function runInit(client: SfdkClient): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showErrorMessage("SFDK: No workspace folder open.");
    return;
  }

  const cwd = workspaceFolder.uri.fsPath;
  const sdkTargetsDir = getSdkTargetsDir();

  // Resolve the active target
  const targetName = await resolveTargetName(cwd, client);
  if (!targetName) {
    return;
  }

  const target = resolveTarget(targetName, sdkTargetsDir);
  if (!target) {
    vscode.window.showErrorMessage(
      `SFDK: Unrecognized architecture in target "${targetName}".`,
    );
    return;
  }

  if (!existsSync(target.sysroot)) {
    vscode.window.showErrorMessage(
      `SFDK: Target sysroot not found at ${target.sysroot}`,
    );
    return;
  }

  // Discover GCC version
  const cxxDir = join(
    target.sysroot,
    "opt",
    "cross",
    target.triple,
    "include",
    "c++",
  );
  let gccVersion: string;
  try {
    const entries = await readdir(cxxDir);
    const version = findGccVersion(entries, target.triple);
    if (!version) {
      vscode.window.showErrorMessage(
        `SFDK: Could not detect GCC version in ${cxxDir}`,
      );
      return;
    }
    gccVersion = version;
  } catch {
    vscode.window.showErrorMessage(
      `SFDK: Could not read C++ headers at ${cxxDir}`,
    );
    return;
  }

  // Discover Qt modules
  const qt5Dir = join(target.sysroot, "usr", "include", "qt5");
  let qtModules: string[];
  try {
    const entries = await readdir(qt5Dir);
    qtModules = entries.filter((e) => e.startsWith("Qt"));
  } catch {
    vscode.window.showErrorMessage(
      `SFDK: Could not read Qt headers at ${qt5Dir}`,
    );
    return;
  }

  // Generate files
  const clangdContent = generateClangd(target, gccVersion, qtModules);
  const settingsContent = generateVscodeSettings();

  const clangdUri = vscode.Uri.file(join(cwd, ".clangd"));
  const settingsUri = vscode.Uri.file(join(cwd, ".vscode", "settings.json"));

  // Check for existing files
  const filesToWrite: { uri: vscode.Uri; content: string; label: string }[] =
    [];

  const addFile = async (
    uri: vscode.Uri,
    content: string,
    label: string,
  ): Promise<boolean> => {
    try {
      await vscode.workspace.fs.stat(uri);
      const overwrite = await vscode.window.showWarningMessage(
        `SFDK: ${label} already exists. Overwrite?`,
        "Overwrite",
        "Skip",
      );
      if (overwrite !== "Overwrite") {
        return false;
      }
    } catch {}
    filesToWrite.push({ uri, content, label });
    return true;
  };

  await addFile(clangdUri, clangdContent, ".clangd");
  await addFile(settingsUri, settingsContent, ".vscode/settings.json");

  if (filesToWrite.length === 0) {
    vscode.window.showInformationMessage("SFDK: No files to write.");
    return;
  }

  // Write files
  const encoder = new TextEncoder();
  for (const file of filesToWrite) {
    await vscode.workspace.fs.createDirectory(
      vscode.Uri.file(join(cwd, ".vscode")),
    );
    await vscode.workspace.fs.writeFile(file.uri, encoder.encode(file.content));
  }

  const written = filesToWrite.map((f) => f.label).join(", ");
  vscode.window.showInformationMessage(
    `SFDK: Project initialized (${written}). Restart clangd for IntelliSense.`,
  );
}

/** Read the active target from .sfdk/target or prompt the user to pick one. */
async function resolveTargetName(
  cwd: string,
  client: SfdkClient,
): Promise<string | undefined> {
  // Try .sfdk/target first
  const targetFile = join(cwd, ".sfdk", "target");
  try {
    const content = await readFile(targetFile, "utf-8");
    const name = content.trim();
    if (name) {
      return name;
    }
  } catch {}

  // Fall back to sfdk config
  try {
    const targets = await client.listTargets();
    if (targets.length === 0) {
      vscode.window.showErrorMessage(
        "SFDK: No build targets found. Install targets via the Sailfish SDK.",
      );
      return undefined;
    }
    if (targets.length === 1) {
      return targets[0].name;
    }
    const pick = await vscode.window.showQuickPick(
      targets.map((t) => ({ label: t.name, description: t.flags })),
      { placeHolder: "Select a target for IntelliSense configuration" },
    );
    return pick?.label;
  } catch {
    vscode.window.showErrorMessage(
      "SFDK: Could not list targets. Is the build engine running?",
    );
    return undefined;
  }
}
