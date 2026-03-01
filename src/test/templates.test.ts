import { describe, expect, it } from "bun:test";
import {
  findGccVersion,
  generateClangd,
  generateVscodeSettings,
  resolveTarget,
} from "../core/templates";

describe("resolveTarget", () => {
  const sdkDir = "/home/user/SailfishOS/mersdk/targets";

  it("resolves aarch64 target", () => {
    const result = resolveTarget("SailfishOS-5.0.0.62-aarch64", sdkDir);
    expect(result).toBeDefined();
    expect(result?.arch).toBe("aarch64");
    expect(result?.triple).toBe("aarch64-meego-linux-gnu");
    expect(result?.sysroot).toBe(
      `${sdkDir}/SailfishOS-5.0.0.62-aarch64.default`,
    );
  });

  it("resolves armv7hl target", () => {
    const result = resolveTarget("SailfishOS-5.0.0.62-armv7hl", sdkDir);
    expect(result).toBeDefined();
    expect(result?.arch).toBe("armv7hl");
    expect(result?.triple).toBe("armv7hl-meego-linux-gnueabi");
  });

  it("resolves i486 target", () => {
    const result = resolveTarget("SailfishOS-5.0.0.62-i486", sdkDir);
    expect(result).toBeDefined();
    expect(result?.arch).toBe("i486");
    expect(result?.triple).toBe("i486-meego-linux-gnu");
  });

  it("returns undefined for unknown arch", () => {
    const result = resolveTarget("SailfishOS-5.0.0.62-mips", sdkDir);
    expect(result).toBeUndefined();
  });
});

describe("findGccVersion", () => {
  it("finds version directory", () => {
    const entries = ["10.3.1", "aarch64-meego-linux-gnu"];
    expect(findGccVersion(entries, "aarch64-meego-linux-gnu")).toBe("10.3.1");
  });

  it("ignores triple directory", () => {
    const entries = ["aarch64-meego-linux-gnu"];
    expect(findGccVersion(entries, "aarch64-meego-linux-gnu")).toBeUndefined();
  });

  it("picks first version-like entry", () => {
    const entries = ["8.3.0", "10.3.1", "aarch64-meego-linux-gnu"];
    expect(findGccVersion(entries, "aarch64-meego-linux-gnu")).toBe("8.3.0");
  });
});

describe("generateClangd", () => {
  const target = {
    name: "SailfishOS-5.0.0.62-aarch64",
    arch: "aarch64",
    triple: "aarch64-meego-linux-gnu",
    sysroot: "/sdk/targets/SailfishOS-5.0.0.62-aarch64.default",
    cxxInclude:
      "/sdk/targets/SailfishOS-5.0.0.62-aarch64.default/opt/cross/aarch64-meego-linux-gnu/include/c++",
    cxxTripleInclude:
      "/sdk/targets/SailfishOS-5.0.0.62-aarch64.default/opt/cross/aarch64-meego-linux-gnu/include/c++",
  };

  it("generates valid YAML with target triple", () => {
    const result = generateClangd(target, "10.3.1", ["QtCore", "QtGui"]);
    expect(result).toContain("--target=aarch64-meego-linux-gnu");
    expect(result).toContain("--sysroot=");
    expect(result).toContain("-std=c++14");
  });

  it("includes all provided Qt modules sorted", () => {
    const result = generateClangd(target, "10.3.1", [
      "QtNetwork",
      "QtCore",
      "QtGui",
    ]);
    const coreIdx = result.indexOf("QtCore");
    const guiIdx = result.indexOf("QtGui");
    const netIdx = result.indexOf("QtNetwork");
    expect(coreIdx).toBeLessThan(guiIdx);
    expect(guiIdx).toBeLessThan(netIdx);
  });

  it("includes GCC version in C++ include path", () => {
    const result = generateClangd(target, "10.3.1", ["QtCore"]);
    expect(result).toContain("/include/c++/10.3.1");
    expect(result).toContain("/include/c++/10.3.1/aarch64-meego-linux-gnu");
  });

  it("includes sailfishapp headers", () => {
    const result = generateClangd(target, "10.3.1", []);
    expect(result).toContain("/usr/include/sailfishapp");
  });

  it("includes diagnostics suppressions", () => {
    const result = generateClangd(target, "10.3.1", []);
    expect(result).toContain("Diagnostics:");
    expect(result).toContain("expr_not_cce");
    expect(result).toContain("typecheck_invalid_operands");
    expect(result).toContain("typecheck_nonviable_condition");
    expect(result).toContain("ovl_no_viable_function_in_init");
    expect(result).not.toContain("member_function_call_bad_type");
  });
});

describe("generateVscodeSettings", () => {
  it("returns valid JSON", () => {
    const result = generateVscodeSettings();
    expect(() => JSON.parse(result)).not.toThrow();
  });

  it("includes QML file association", () => {
    const settings = JSON.parse(generateVscodeSettings());
    expect(settings["files.associations"]["*.qml"]).toBe("qml");
  });

  it("includes .pro file association", () => {
    const settings = JSON.parse(generateVscodeSettings());
    expect(settings["files.associations"]["*.pro"]).toBe("qmake");
  });

  it("excludes build artifacts", () => {
    const settings = JSON.parse(generateVscodeSettings());
    expect(settings["files.exclude"]["**/*.o"]).toBe(true);
    expect(settings["files.exclude"]["**/moc_*.cpp"]).toBe(true);
  });
});
