export type ProjectType = "dotnet" | "nextjs" | "react";
export type DeployTarget = "docker" | "cloudflare" | "github-packages" | "npm";
export type TestRunner = "xunit" | "jest" | "vitest";


export interface TemplateContext {
  appName: string;
  artifactPath: string;
  projectType: ProjectType;
  deployTargets: DeployTarget[];
  testRunner: TestRunner;
  nodeVersion: string;
  dotnetVersion: string;
  hasLint: boolean;
  npmPublicAccess: boolean;
}

export interface GeneratedFile {
  template?: string;
  outputPath: string;
  contents?: string;
}
