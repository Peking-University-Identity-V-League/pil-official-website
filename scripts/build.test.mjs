import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { assembleSite } from './build.mjs';

test('homepage and both application aliases coexist without publishing operations files', async () => {
  const root = await mkdtemp(join(tmpdir(), 'pil-site-'));
  const applicationDist = join(root, '.apps', 'fixture');
  const builderCommit = 'b'.repeat(40);
  try {
    await mkdir(join(root, 'public'), { recursive: true });
    await mkdir(join(applicationDist, 'js'), { recursive: true });
    await mkdir(join(root, 'dist'), { recursive: true });
    await mkdir(join(root, '.deploy'), { recursive: true });
    await writeFile(join(root, 'public', 'index.html'), '北京大学第五人格赛事');
    await writeFile(join(root, 'public', 'ownership.txt'), 'ownership-fixture');
    await writeFile(join(root, 'public', '_headers'), 'old-global-csp');
    await writeFile(join(root, '.deploy', 'private.txt'), 'must-remain-private');
    await writeFile(join(root, 'dist', 'stale.txt'), 'old-build');
    await writeFile(join(applicationDist, 'index.html'), 'tactical-app');
    await writeFile(join(applicationDist, 'js', 'main.js'), 'export {};');
    await writeFile(join(applicationDist, '__release.json'), JSON.stringify({ source_commit: 'a'.repeat(40), config_revision: builderCommit }));
    await assembleSite({ root, applicationDist, builderCommit, homepageCommit: 'c'.repeat(40) });
    assert.equal(await readFile(join(root, 'dist', 'index.html'), 'utf8'), '北京大学第五人格赛事');
    for (const alias of ['tactical-friend', 'zhanshuyanlian']) {
      assert.equal(await readFile(join(root, 'dist', alias, 'index.html'), 'utf8'), 'tactical-app');
      assert.equal(await readFile(join(root, 'dist', alias, 'js', 'main.js'), 'utf8'), 'export {};');
    }
    assert.equal(await readFile(join(root, 'dist', 'ownership.txt'), 'utf8'), 'ownership-fixture');
    for (const file of ['stale.txt', '_headers', '.deploy/private.txt']) {
      await assert.rejects(readFile(join(root, 'dist', file)), { code: 'ENOENT' });
    }
    assert.equal(await readFile(join(root, '.deploy', 'private.txt'), 'utf8'), 'must-remain-private');
    await symlink(join(root, '.deploy', 'private.txt'), join(root, 'public', 'leak.txt'));
    await assert.rejects(assembleSite({ root, applicationDist, builderCommit }), /Symlinks/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
