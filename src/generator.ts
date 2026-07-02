import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ejs from "ejs";
import type { GeneratedFile, TemplateContext } from "./types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const workflowFileNames = [
  "ci-feature.yml",
  "ci-main.yml"
] as const;

export function getTemplateDir(): string {
  return path.join(__dirname, "templates");
}

export function getGeneratedFiles(cwd: string): GeneratedFile[] {
  return [
    ...workflowFileNames.map((fileName) => ({
      template: `${fileName}.ejs`,
      outputPath: path.join(cwd, ".github", "workflows", fileName)
    })),
    {
      outputPath: path.join(cwd, ".github", "release-please-config.json")
    },
    {
      outputPath: path.join(cwd, ".github", ".release-please-manifest.json")
    }
  ];
}

export function getExistingTargetFiles(cwd: string): string[] {
  return getGeneratedFiles(cwd)
    .filter((file) => existsSync(file.outputPath))
    .map((file) => path.relative(cwd, file.outputPath));
}

export async function isLikelyProjectRoot(cwd: string): Promise<boolean> {
  if (existsSync(path.join(cwd, "package.json"))) {
    return true;
  }

  return existsSync(cwd) && Boolean(await findCsproj(cwd));
}

async function findCsproj(cwd: string): Promise<string | undefined> {
  try {
    const entries = await readdir(cwd, { withFileTypes: true });
    return entries.find((entry) => entry.isFile() && entry.name.endsWith(".csproj"))?.name;
  } catch {
    return undefined;
  }
}

export async function generateFiles(
  cwd: string,
  context: TemplateContext,
  scaffoldWrangler = false
): Promise<string[]> {
  const releaseType = context.projectType === "dotnet" ? "simple" : "node";
  const files = getGeneratedFiles(cwd);

  if (scaffoldWrangler) {
    files.push({
      template: "wrangler.toml.ejs",
      outputPath: path.join(cwd, "wrangler.toml")
    });
  }

  const writtenFiles: string[] = [];

  await mkdir(path.join(cwd, ".github", "workflows"), { recursive: true });

  for (const file of files) {
    let contents = file.contents;

    if (file.template) {
      const templatePath = path.join(getTemplateDir(), file.template);
      const template = await readFile(templatePath, "utf8");
      contents = ejs.render(template, {
        ...context,
        releaseType
      });
    } else if (file.outputPath.endsWith("release-please-config.json")) {
      contents = `${JSON.stringify(
        {
          $schema: "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
          "release-type": releaseType,
          packages: {
            ".": {}
          }
        },
        null,
        2
      )}\n`;
    } else {
      contents = `${JSON.stringify({ ".": "0.0.0" }, null, 2)}\n`;
    }

    await writeFile(file.outputPath, contents, "utf8");
    writtenFiles.push(path.relative(cwd, file.outputPath));
  }

  return writtenFiles;
}
