import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ProjectType, TestRunner } from "./types";

function readPackageJson(cwd: string): Record<string, unknown> | undefined {
  try {
    return JSON.parse(readFileSync(path.join(cwd, "package.json"), "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

export function detectProjectType(cwd: string): ProjectType | undefined {
  const pkg = readPackageJson(cwd);

  if (pkg) {
    const allDeps = {
      ...(pkg.dependencies as Record<string, string> | undefined),
      ...(pkg.devDependencies as Record<string, string> | undefined)
    };

    if ("next" in allDeps) return "nextjs";
    if ("react" in allDeps) return "react";
  }

  if (hasCsproj(cwd)) return "dotnet";

  return undefined;
}

export function detectTestRunner(cwd: string): TestRunner | undefined {
  const pkg = readPackageJson(cwd);
  if (!pkg) return undefined;

  const allDeps = {
    ...(pkg.dependencies as Record<string, string> | undefined),
    ...(pkg.devDependencies as Record<string, string> | undefined)
  };

  if ("vitest" in allDeps) return "vitest";
  if ("jest" in allDeps) return "jest";

  return undefined;
}

export function detectNodeVersion(cwd: string): string | undefined {
  const nvmrcPath = path.join(cwd, ".nvmrc");
  if (existsSync(nvmrcPath)) {
    try {
      const content = readFileSync(nvmrcPath, "utf8").trim();
      const match = content.match(/^v?(\d+)/);
      if (match) return match[1];
    } catch {
      // fall through
    }
  }

  const pkg = readPackageJson(cwd);
  const enginesNode = (pkg?.engines as Record<string, string> | undefined)?.node;
  if (enginesNode) {
    const matches = Array.from(enginesNode.matchAll(/\b(\d+)\b/g)).map(m => parseInt(m[1], 10));
    if (matches.length > 0) {
      return Math.max(...matches).toString();
    }
  }

  return undefined;
}

export function detectAppName(cwd: string): string {
  const pkg = readPackageJson(cwd);
  if (pkg && typeof pkg.name === "string") {
    return pkg.name;
  }
  return path.basename(cwd);
}


export function detectDotnetVersion(cwd: string): string | undefined {
  try {
    const globalJson = JSON.parse(readFileSync(path.join(cwd, "global.json"), "utf8")) as {
      sdk?: { version?: string };
    };
    const sdkVersion = globalJson.sdk?.version;
    if (sdkVersion) {
      const match = sdkVersion.match(/^(\d+\.\d+)/);
      if (match) return `${match[1]}.x`;
    }
  } catch {
    // fall through
  }

  return undefined;
}

export function detectLintScript(cwd: string): boolean {
  const pkg = readPackageJson(cwd);
  return "lint" in ((pkg?.scripts as Record<string, string> | undefined) ?? {});
}

export function hasDockerfile(cwd: string): boolean {
  return ["Dockerfile", "dockerfile"].some((name) => existsSync(path.join(cwd, name)));
}

export function isNpmScopedPackage(cwd: string): boolean {
  const pkg = readPackageJson(cwd);
  return typeof pkg?.name === "string" && pkg.name.startsWith("@");
}

export function hasWranglerConfig(cwd: string): boolean {
  return ["wrangler.toml", "wrangler.json", "wrangler.jsonc"].some((name) =>
    existsSync(path.join(cwd, name))
  );
}

function hasCsproj(cwd: string): boolean {
  try {
    return readdirSync(cwd, { withFileTypes: true }).some(
      (entry) => entry.isFile() && entry.name.endsWith(".csproj")
    );
  } catch {
    return false;
  }
}
