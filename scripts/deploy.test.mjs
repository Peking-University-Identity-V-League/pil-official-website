import assert from 'node:assert/strict';
import test from 'node:test';
import { describeRelease } from './deploy.mjs';

test('home and tactical releases use distinct component metadata', () => {
  assert.equal(describeRelease({ homepage_commit: 'a'.repeat(40) }).component, 'home');
  const tactical = describeRelease({ source_commit: 'b'.repeat(40), config_revision: 'c'.repeat(40) });
  assert.equal(tactical.component, 'tactical');
  assert.deepEqual(tactical.paths, ['/tactical-friend/__release.json', '/zhanshuyanlian/__release.json']);
  for (const bad of [{}, { homepage_commit: '../escape' }, { source_commit: 'a'.repeat(40) }, { homepage_commit: 'a'.repeat(40), source_commit: 'b'.repeat(40), config_revision: 'c'.repeat(40) }]) assert.throws(() => describeRelease(bad));
});
