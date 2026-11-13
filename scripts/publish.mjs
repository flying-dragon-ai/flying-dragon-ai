#!/usr/bin/env node
// Stage 4: create the special profile repo if missing, push, set topics, enable Pages.
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (args, opts = {}) =>
  execFileSync('gh', args, { cwd: ROOT, encoding: 'utf8', stdio: opts.inherit ? 'inherit' : 'pipe', ...opts });

const login = JSON.parse(run(['api', 'user'])).login;
const repo = `${login}/${login}`;
const log = (...a) => console.error('[publish]', ...a);

function exists() {
  try {
    run(['api', `repos/${repo}`]);
    return true;
  } catch {
    return false;
  }
}

if (!exists()) {
  log(`creating ${repo}`);
  run(
    [
      'repo', 'create', repo,
      '--public',
      '--description', 'GitHub profile homepage — data fetched with gh, rendered from templates',
      '--source', '.',
      '--remote', 'origin',
      '--push',
    ],
    { inherit: true },
  );
} else {
  log(`${repo} exists; pushing`);
  run(['repo', 'view', repo, '--json', 'name'], {});
  try {
    run(['git', 'remote', 'get-url', 'origin']);
  } catch {
    run(['git', 'remote', 'add', 'origin', `https://github.com/${repo}.git`]);
  }
  run(['git', 'push', '-u', 'origin', 'HEAD:main'], { inherit: true });
}

log('setting topics');
run([
  'api', '-X', 'PUT', `repos/${repo}/topics`,
  '-H', 'Accept: application/vnd.github+json',
  '-f', 'names[]=profile-readme',
  '-f', 'names[]=github-profile',
  '-f', 'names[]=readme',
  '-f', 'names[]=gh-cli',
  '-f', 'names[]=generator',
]);

log('enabling Pages (workflow build)');
try {
  run(['api', '-X', 'POST', `repos/${repo}/pages`, '-f', 'build_type=workflow']);
} catch (e) {
  const msg = String(e.stderr || e.message);
  if (msg.includes('409')) log('Pages already enabled');
  else log('Pages setup:', msg.split('\n')[0]);
}

log(`done -> https://github.com/${repo}`);
