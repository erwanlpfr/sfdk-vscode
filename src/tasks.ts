import * as vscode from "vscode";

export class SfdkTaskProvider implements vscode.TaskProvider {
  static readonly type = "sfdk";

  provideTasks(): vscode.Task[] {
    return [
      this.createTask("build", "Build", ["build"]),
      this.createTask("qmake", "Run qmake", ["qmake", "."]),
      this.createTask("make", "Run make", ["make"]),
      this.createTask("package", "Create RPM Package", ["package"]),
      this.createTask("deploy", "Deploy to Device", ["deploy", "--sdk"]),
      this.createTask("check", "Check RPM Quality", ["check"]),
    ];
  }

  resolveTask(task: vscode.Task): vscode.Task | undefined {
    const definition = task.definition;
    if (definition.type !== SfdkTaskProvider.type) {
      return undefined;
    }

    const command: string = definition.command;
    const args: string[] = definition.args ?? [];

    return this.createTask(command, task.name, [command, ...args], definition);
  }

  private createTask(
    command: string,
    label: string,
    args: string[],
    definition?: vscode.TaskDefinition
  ): vscode.Task {
    const taskDef = definition ?? {
      type: SfdkTaskProvider.type,
      command,
    };

    const configPath = vscode.workspace
      .getConfiguration("sfdk")
      .get<string>("path", "");
    const sfdkBin = configPath || "sfdk";

    const execution = new vscode.ShellExecution(sfdkBin, args);

    const task = new vscode.Task(
      taskDef,
      vscode.TaskScope.Workspace,
      `sfdk: ${label}`,
      "sfdk",
      execution,
      ["$gcc"]
    );

    task.group =
      command === "build" ? vscode.TaskGroup.Build : undefined;

    task.presentationOptions = {
      reveal: vscode.TaskRevealKind.Always,
      panel: vscode.TaskPanelKind.Shared,
      clear: true,
    };

    return task;
  }
}
