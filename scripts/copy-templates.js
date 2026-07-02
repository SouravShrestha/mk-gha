import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

async function main() {
  const srcTemplates = path.join(root, 'src', 'templates');
  const distTemplates = path.join(root, 'dist', 'templates');

  await fs.mkdir(distTemplates, { recursive: true });

  const files = await fs.readdir(srcTemplates);
  for (const file of files) {
    if (file.endsWith('.ejs')) {
      await fs.copyFile(
        path.join(srcTemplates, file),
        path.join(distTemplates, file)
      );
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exitCode = 1;
});
