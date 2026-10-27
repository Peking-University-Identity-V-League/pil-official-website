import { execFileSync } from 'node:child_process';
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const builderRepository = 'https://github.com/Reverune/pkuidv-tactical-friend-deploy.git';
const aliases = ['tactical-friend', 'zhanshuyanlian'];

function git(args) {
  return execFileSync('git', args, {
    encoding: 'utf8', timeout: 90000,
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
  }).trim();
}

async function rejectSymlinks(directory) {
  for (const name of await readdir(directory)) {
    const file = join(directory, name);
    const metadata = await lstat(file);
    if (metadata.isSymbolicLink()) throw new Error('Symlinks are not allowed in website assets');
    if (metadata.isDirectory()) await rejectSymlinks(file);
  }
}

export async function assembleSite({ root, applicationDist, builderCommit, homepageCommit }) {
  const output = join(root, 'dist');
  const publicDirectory = join(root, 'public');
  await rejectSymlinks(publicDirectory);
  await rejectSymlinks(applicationDist);
  const homepage = await readFile(join(publicDirectory, 'index.html'), 'utf8');
  if (!homepage.includes('北京大学第五人格赛事')) throw new Error('Missing homepage title');
  const release = JSON.parse(await readFile(join(applicationDist, '__release.json'), 'utf8'));
  if (!/^[a-f0-9]{40}$/.test(release.source_commit) || release.config_revision !== builderCommit) {
    throw new Error('Application release metadata does not match its builder');
  }
  // The only replaced directory is this project's generated dist.
  await rm(output, { recursive: true, force: true });
  await cp(publicDirectory, output, { recursive: true });
  // EdgeOne response headers are declared in edgeone.json; a global homepage CSP
  // must not be inherited by the tactical application's external map assets.
  await rm(join(output, '_headers'), { force: true });
  for (const alias of aliases) await cp(applicationDist, join(output, alias), { recursive: true });
  await writeFile(join(output, '__release.json'), JSON.stringify({
    homepage_commit: homepageCommit,
    tactical_builder_commit: builderCommit,
    tactical_source_commit: release.source_commit,
  }, null, 2) + '\n');
  return release;
}

export async function build() {
  const cache = join(projectRoot, '.apps');
  await mkdir(cache, { recursive: true });
  const checkout = await mkdtemp(join(cache, 'tactical-build-'));
  try {
    console.log('Fetching the public tactical builder and application main branches.');
    git(['clone', '--depth', '1', '--single-branch', '--branch', 'main', builderRepository, checkout]);
    const builderCommit = git(['-C', checkout, 'rev-parse', 'HEAD']);
    // The personal deployment builder copies an allowlist of application files
    // without running the organization's package or installation scripts.
    execFileSync(process.execPath, [join(checkout, 'scripts/build.mjs')], {
      cwd: checkout, stdio: 'inherit', timeout: 120000,
      env: { ...process.env, DEPLOY_CONFIG_REVISION: builderCommit },
    });
    let homepageCommit = 'local';
    try { homepageCommit = git(['-C', projectRoot, 'rev-parse', 'HEAD']); } catch {}
    const release = await assembleSite({
      root: projectRoot, applicationDist: join(checkout, 'dist'), builderCommit, homepageCommit,
    });
    console.log('Built homepage and both tactical paths in dist/. Application: ' + release.source_commit);
  } finally {
    await rm(checkout, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
