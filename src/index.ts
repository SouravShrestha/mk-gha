#!/usr/bin/env node
import { intro, log, outro, spinner } from "clack";
import {
  detectDotnetVersion,
  detectLintScript,
  detectNodeVersion,
  detectProjectType,
  detectTestRunner,
  detectAppName,
  hasDockerfile,
  hasWranglerConfig,
  isNpmScopedPackage
} from "./detector";
import { generateFiles, getExistingTargetFiles, isLikelyProjectRoot } from "./generator";
import {
  promptDeployTargets,
  promptDotnetVersion,
  promptNodeVersion,
  promptNpmPublicAccess,
  promptOverwrite,
  promptProjectType,
  promptScaffoldWrangler,
  promptTestRunner
} from "./prompts";
import type { DeployTarget, ProjectType, TestRunner } from "./types";

const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  dotnet: ".NET",
  nextjs: "Next.js",
  react: "React"
};

const TEST_RUNNER_LABELS: Record<TestRunner, string> = {
  xunit: "xUnit",
  jest: "Jest",
  vitest: "Vitest"
};

function printSecretsChecklist(deployTargets: DeployTarget[]): void {
  const secrets: string[] = [];

  if (deployTargets.includes("docker")) {
    secrets.push("- DOCKER_USERNAME", "- DOCKER_PASSWORD");
  }
  if (deployTargets.includes("cloudflare")) {
    secrets.push("- CLOUDFLARE_API_TOKEN", "- CLOUDFLARE_ACCOUNT_ID");
  }
  if (deployTargets.includes("npm")) {
    secrets.push("- NPM_TOKEN");
  }

  if (secrets.length > 0) {
    log.info("Add these secrets to your GitHub repo under Settings -> Secrets and variables -> Actions");
    log.message(secrets.join("\n"));
  }

  log.message("- GITHUB_TOKEN (built-in, no action needed)");
}

function printPipelineSummary(): void {
  log.info("Pipeline Summary:");
  log.message("- ci-feature.yml     : Build & test on every feature branch push");
  log.message("- ci-main.yml        : Build, test, & deploy (test) on push to main, plus automated release PRs & prod deployment");
}

function printGitHubSettingsInstructions(deployTargets: DeployTarget[]): void {
  log.info("GitHub Repository Settings required:");
  log.message("1. Go to Settings -> Actions -> General");
  log.message("2. Under 'Workflow permissions', select 'Read and write permissions'");
  log.message("3. Check 'Allow GitHub Actions to create and approve pull requests' (needed for release-please)");

  if (deployTargets.length > 0) {
    log.info("Environments (Optional):");
    log.message("- Workflows use 'test' and 'production' environments.");
    log.message("- Go to Settings -> Environments to add protection rules (e.g., required reviewers) for production.");
  }
  
  if (deployTargets.includes("github-packages")) {
    log.info("GitHub Packages (Optional):");
    log.message("- Packages pushed to GHCR default to private.");
    log.message("- Change visibility to Public under your Organization/User Settings -> Packages if needed.");
  }
}

async function main(): Promise<void> {
  const cwd = process.cwd();

  intro("mk-gha");

  if (!isLikelyProjectRoot(cwd)) {
    log.warn("No package.json or .csproj was found. This does not look like a project root, but generation can continue.");
  }

  // --- Project type ---
  const detectedProjectType = detectProjectType(cwd);
  let projectType: ProjectType;
  if (detectedProjectType) {
    log.info(`Auto-detected project type: ${PROJECT_TYPE_LABELS[detectedProjectType]}`);
    projectType = detectedProjectType;
  } else {
    projectType = await promptProjectType();
  }

  // --- Deploy targets ---
  const deployTargets = await promptDeployTargets();

  // --- Test runner ---
  const detectedTestRunner = projectType === "dotnet" ? "xunit" : detectTestRunner(cwd);
  let testRunner: TestRunner;
  if (detectedTestRunner) {
    log.info(`Auto-detected test runner: ${TEST_RUNNER_LABELS[detectedTestRunner]}`);
    testRunner = detectedTestRunner;
  } else {
    testRunner = await promptTestRunner(projectType);
  }

  // --- Node version ---
  let nodeVersion = "20";
  if (projectType !== "dotnet") {
    const detectedNodeVersion = detectNodeVersion(cwd);
    if (detectedNodeVersion) {
      log.info(`Auto-detected Node.js version: ${detectedNodeVersion}`);
      nodeVersion = detectedNodeVersion;
    } else {
      nodeVersion = await promptNodeVersion();
    }
  }

  // --- .NET version ---
  let dotnetVersion = "8.0.x";
  if (projectType === "dotnet") {
    const detectedDotnetVersion = detectDotnetVersion(cwd);
    if (detectedDotnetVersion) {
      log.info(`Auto-detected .NET SDK version: ${detectedDotnetVersion}`);
      dotnetVersion = detectedDotnetVersion;
    } else {
      dotnetVersion = await promptDotnetVersion();
    }
  }

  // --- Lint ---
  const hasLint = projectType !== "dotnet" && detectLintScript(cwd);

  // --- Cloudflare wrangler config ---
  let scaffoldWrangler = false;
  if (deployTargets.includes("cloudflare") && !hasWranglerConfig(cwd)) {
    scaffoldWrangler = await promptScaffoldWrangler();
  }

  // --- Dockerfile check ---
  const needsDockerfile = deployTargets.some((t) => t === "docker" || t === "github-packages");
  if (needsDockerfile && !hasDockerfile(cwd)) {
    log.warn("No Dockerfile found. Add one before the CD workflow runs or the Docker build step will fail.");
  }

  // --- npm scoped package ---
  let npmPublicAccess = true;
  if (deployTargets.includes("npm") && isNpmScopedPackage(cwd)) {
    npmPublicAccess = await promptNpmPublicAccess();
  }

  // --- Overwrite check ---
  const existingFiles = getExistingTargetFiles(cwd);
  if (existingFiles.length > 0) {
    const shouldOverwrite = await promptOverwrite(existingFiles);
    if (!shouldOverwrite) {
      outro("No files were changed.");
      return;
    }
  }

  // --- App Name ---
  const appName = detectAppName(cwd);

  // --- Artifact Path ---
  const artifactPath = projectType === "dotnet" ? "./publish" : "./dist";

  const s = spinner();
  s.start("Generating GitHub Actions workflows");
  const writtenFiles = await generateFiles(
    cwd,
    { appName, artifactPath, projectType, deployTargets, testRunner, nodeVersion, dotnetVersion, hasLint, npmPublicAccess },
    scaffoldWrangler
  );
  s.stop("Generated GitHub Actions workflows");

  log.success(`Created:\n${writtenFiles.map((file) => `- ${file}`).join("\n")}`);
  printPipelineSummary();
  printSecretsChecklist(deployTargets);
  printGitHubSettingsInstructions(deployTargets);
  log.info("release-please requires Conventional Commits. Use feat:, fix:, chore: prefixes in your commit messages. See https://www.conventionalcommits.org/");

  outro("Done.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown error";
  log.error(message);
  process.exitCode = 1;
});
