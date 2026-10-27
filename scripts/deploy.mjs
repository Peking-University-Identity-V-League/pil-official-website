import { execFileSync, spawnSync } from 'node:child_process';
import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

async function deploy() {
  const account = process.env.CLOUDFLARE_ACCOUNT_ID;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  if (!/^[a-f0-9]{32}$/.test(account || '') || !token) throw new Error('Cloudflare deployment credentials are missing.');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  async function project() {
    try {
      const response = await fetch('https://api.cloudflare.com/client/v4/accounts/' + account + '/pages/projects/pkuidv', {
        headers: { Authorization: 'Bearer ' + token }, signal: AbortSignal.timeout(20000),
      });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.success || data.result?.name !== 'pkuidv') throw new Error();
      return data.result;
    } catch { throw new Error('Authenticated Pages verification failed.'); }
  }
  // Refuse to create a different project when an expected project is unavailable.
  await project();
  const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'pages', 'deploy', 'dist', '--project-name', 'pkuidv', '--branch', 'main', '--commit-hash', commit, '--commit-message', 'Publish PIL homepage', '--commit-dirty=false'], {
    encoding: 'utf8', timeout: 180000, maxBuffer: 2 * 1024 * 1024,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.error || result.status !== 0) {
    const raw = (result.stdout || '') + '\n' + (result.stderr || '');
    const codes = [...new Set([...raw.matchAll(/\bcode:\s*(\d{3,6})\b/g)].map(match => match[1]))];
    throw new Error('Pages upload failed. Exit code: ' + (result.status ?? 'unavailable') + (codes.length ? '; API codes: ' + codes.join(', ') : '') + '. Raw account diagnostics are suppressed.');
  }
  for (let attempt = 0; attempt < 10; attempt++) {
    const deployment = (await project()).canonical_deployment;
    if (deployment?.environment === 'production' && deployment.latest_stage?.status === 'success' && deployment.deployment_trigger?.metadata?.commit_hash === commit) {
      const message = 'Cloudflare Pages production deployment verified through the authenticated API. Commit: ' + commit + '; deployment: ' + deployment.id;
      console.log(message);
      if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, message + '\n');
      return;
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  throw new Error('Upload completed, but the expected Pages production commit could not be verified.');
}

try { await deploy(); } catch (error) { console.error(error.message); process.exitCode = 1; }
