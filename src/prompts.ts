import { confirm, isCancel, multiselect, select, text } from "clack";
import type { DeployTarget, ProjectType, TestRunner } from "./types";

function cancelIfNeeded<T>(value: T | symbol): T {
  if (isCancel(value)) {
    throw new Error("Operation cancelled.");
  }

  return value as T;
}

export async function promptProjectType(): Promise<ProjectType> {
  return cancelIfNeeded(
    await select<ProjectType>({
      message: "What type of project is this?",
      options: [
        { value: "dotnet", label: ".NET" },
        { value: "nextjs", label: "Next.js" },
        { value: "react", label: "React" }
      ]
    })
  );
}

export async function promptDeployTargets(): Promise<DeployTarget[]> {
  return cancelIfNeeded(
    await multiselect<DeployTarget>({
      message: "Where should deployments go? (Space to select, Enter to confirm)",
      options: [
        { value: "docker", label: "Docker Hub" },
        { value: "cloudflare", label: "Cloudflare Workers" },
        { value: "github-packages", label: "GitHub Packages (GHCR)" },
        { value: "npm", label: "npm" }
      ],
      required: true
    })
  );
}

export async function promptTestRunner(projectType: ProjectType): Promise<TestRunner> {
  const initialValue: TestRunner = projectType === "dotnet" ? "xunit" : "jest";

  return cancelIfNeeded(
    await select<TestRunner>({
      message: "Which test runner should the workflows use?",
      initialValue,
      options: [
        { value: "xunit", label: "xUnit" },
        { value: "jest", label: "Jest" },
        { value: "vitest", label: "Vitest" }
      ]
    })
  );
}

export async function promptNodeVersion(): Promise<string> {
  return cancelIfNeeded(
    await text({
      message: "What Node.js major version should the workflows use?",
      placeholder: "20",
      defaultValue: "20",
      validate(value) {
        if (!/^\d+$/.test(value.trim())) return "Enter a major version number (e.g. 20)";
      }
    })
  );
}

export async function promptDotnetVersion(): Promise<string> {
  return cancelIfNeeded(
    await text({
      message: "What .NET SDK version should the workflows use?",
      placeholder: "8.0.x",
      defaultValue: "8.0.x",
      validate(value) {
        if (!/^\d+\.\d+\.x$/.test(value.trim())) return "Use the format X.Y.x (e.g. 8.0.x)";
      }
    })
  );
}

export async function promptNpmPublicAccess(): Promise<boolean> {
  return cancelIfNeeded(
    await confirm({
      message: "This is a scoped package. Should it be published publicly (--access public)?",
      initialValue: true
    })
  );
}

export async function promptOverwrite(existingFiles: string[]): Promise<boolean> {
  return cancelIfNeeded(
    await confirm({
      message: `These files already exist and will be overwritten:\n${existingFiles.join("\n")}\n\nContinue?`,
      initialValue: false
    })
  );
}

export async function promptScaffoldWrangler(): Promise<boolean> {
  return cancelIfNeeded(
    await confirm({
      message: "No wrangler.toml found. Scaffold a starter wrangler.toml with test and production environments?",
      initialValue: true
    })
  );
}
