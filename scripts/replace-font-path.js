import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const stylePath = path.resolve(__dirname, '..', 'dist', 'assets', 'style.css');
const fontPathArgument = process.argv.find((argument) => argument.startsWith('--font-path='));
const fontPath = (
  fontPathArgument?.slice('--font-path='.length)
  || process.env.npm_config_font_path
  || '../fonts'
).replace(/\/$/, '');

const style = await readFile(stylePath, 'utf8');
const updatedStyle = style.replaceAll('/fonts/', `${fontPath}/`);

await writeFile(stylePath, updatedStyle);

console.log(`Font path in dist/assets/style.css: ${fontPath}/`);
