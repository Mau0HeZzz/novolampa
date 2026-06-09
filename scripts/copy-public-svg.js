import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const sourceRoot = path.join(projectRoot, 'public', 'img');
const targetRoot = path.join(projectRoot, 'dist', 'img');

async function copySvgFiles(currentDir = sourceRoot) {
  const entries = await readdir(currentDir, { withFileTypes: true });
  let copiedFiles = 0;

  for (const entry of entries) {
    const sourcePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      copiedFiles += await copySvgFiles(sourcePath);
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name).toLowerCase() !== '.svg') {
      continue;
    }

    const relativePath = path.relative(sourceRoot, sourcePath);
    const targetPath = path.join(targetRoot, relativePath);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
    copiedFiles += 1;
  }

  return copiedFiles;
}

async function main() {
  try {
    const copiedFiles = await copySvgFiles();
    console.log(`Copied ${copiedFiles} SVG file(s) from public/img to dist/img.`);
  } catch (error) {
    if (error?.code === 'ENOENT') {
      console.warn('Skipping SVG copy because public/img was not found.');
      return;
    }

    console.error('Failed to copy SVG files to dist/img.');
    console.error(error);
    process.exitCode = 1;
  }
}

await main();
