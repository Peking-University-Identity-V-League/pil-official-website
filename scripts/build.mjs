import { execFileSync } from 'node:child_process';
import { cp, lstat, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { precompress, versionAssets } from './static-assets.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function rejectSymlinks(directory) {
  for (const name of await readdir(directory)) {
    const file = join(directory, name);
    const metadata = await lstat(file);
    if (metadata.isSymbolicLink()) throw new Error('Symlinks are not allowed in website assets');
    if (metadata.isDirectory()) await rejectSymlinks(file);
  }
}

export async function build({ root = projectRoot, homepageCommit } = {}) {
  const output = join(root, 'dist');
  const publicDirectory = join(root, 'public');
  await rejectSymlinks(publicDirectory);
  const homepage = await readFile(join(publicDirectory, 'index.html'), 'utf8');
  if (!homepage.includes('北京大学第五人格赛事')) throw new Error('Missing homepage title');
  if (!homepageCommit) {
    try {
      homepageCommit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    } catch { homepageCommit = 'local'; }
  }
  // The only replaced directory is this project's generated dist.
  await rm(output, { recursive: true, force: true });
  await cp(publicDirectory, output, { recursive: true });
  await rm(join(output, '_headers'), { force: true });
  const assets = await versionAssets(output);
  await writeFile(join(output, '__release.json'), JSON.stringify({
    homepage_commit: homepageCommit,
    assets,
  }, null, 2) + '\n');
  await precompress(output);
  return { homepage_commit: homepageCommit, assets };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await build();
  console.log('Built homepage static release in dist/ for CST.');
}
