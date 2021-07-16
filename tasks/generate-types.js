import childProcess from 'child_process';
import fs from 'fs-extra';
import glob from 'glob';
import path from 'path';

const baseDir = process.cwd();
const outDir = path.join(baseDir, 'build/ol');
const srcDir = path.join(outDir, 'src');
const srcBackupDir = path.join(outDir, 'src-backup');
const tsVersion = '4.3.5';
const tsConfig = path.join(baseDir, 'config/tsconfig-build.json');

/**
 * @typedef Replacement
 * @property {string} file Relative .d.ts file path from output directory
 * @property {string|RegExp} search A string to search for
 * @property {string|function(string,...*):string} replace A string containing the text to replace for every
 */

/**
 * @type {Array<Replacement>}
 */
const replacements = [
  {
    file: 'size.d.ts',
    search: 'export type Size = Array<number>;',
    replace: 'export type Size = [number, number];',
  },
  {
    file: 'extent.d.ts',
    search: 'export type Extent = Array<number>;',
    replace: 'export type Extent = [number, number, number, number];',
  },
];

process.stdout.write('# Creating source backup directory');
fs.mkdirpSync(srcBackupDir);
process.stdout.write(' DONE!\n');

process.stdout.write('# Patching source\n');
const patternRecord = /Object<((?!string)(?!number)(?!\*)(?!\?).+?),\s*(.+?)>/gm;
glob.sync(path.join(srcDir, '**/*.js')).forEach(filePath => {
  try {
    let content = fs.readFileSync(filePath, { encoding: 'utf-8' });
    if (content.search(patternRecord) === -1) return;
    const relPath = path.relative(srcDir, filePath);
    fs.mkdirpSync(path.join(srcBackupDir, path.dirname(relPath)));
    fs.copySync(filePath, path.join(srcBackupDir, relPath));
    content = content.replace(patternRecord, 'Record<$1,$2>');
    fs.writeFileSync(filePath, content);
    process.stdout.write(`- ${path.relative(baseDir, filePath)}\n`);
  } catch (error) {
    process.stderr.write(`Could not patch "${filePath}".\n`);
  }
});
process.stdout.write('  DONE!\n');

process.stdout.write('# Generating TypeScript declaration');
const cmd = `npx --package=typescript@${tsVersion} -y -- tsc --project "${tsConfig}" --declaration --declarationMap --emitDeclarationOnly --outdir "${outDir}"`;
childProcess.execSync(cmd, { stdio: 'inherit' });
process.stdout.write(' DONE!\n');

process.stdout.write('# Restoring source');
fs.copySync(srcBackupDir, srcDir, { overwrite: true });
fs.removeSync(srcBackupDir);
process.stdout.write(' DONE!\n');

process.stdout.write('# Patching types');
const promises = replacements.map(repl => {
  const filePath = path.join(outDir, repl.file);
  return async () => {
    try {
      let content = await fs.readFile(filePath, 'utf-8');
      content = content.replace(repl.search, repl.replace);
      await fs.writeFile(filePath, content, { encoding: 'utf-8' });
      process.stdout.write(`- ${path.relative(baseDir, filePath)}\n`);
      return filePath;
    } catch (error) {
      process.stderr.write(`Could not patch "${filePath}".\n`);
    }
  };
});

Promise.all(promises).then(() => {
  process.stdout.write(' DONE!\n');
  process.stdout.write('# Finish\n');
});
