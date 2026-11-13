// Thin wrapper over the GitHub CLI. Every byte of profile data enters through here.
import { execFileSync } from 'node:child_process';

let GH = 'gh';
try {
  const where = execFileSync(process.platform === 'win32' ? 'where' : 'which', ['gh'], { encoding: 'utf8' });
  GH = where.split(/\r?\n/).find(Boolean).trim();
} catch {
  // fall through to PATH lookup
}

export function gh(args, { json = false, quiet = false } = {}) {
  const out = execFileSync(GH, args, {
    encoding: 'utf8',
    maxBuffer: 128 * 1024 * 1024,
    stdio: quiet ? ['ignore', 'pipe', 'ignore'] : ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GH_PAGER: 'cat', NO_COLOR: '1' },
  });
  return json ? JSON.parse(out) : out;
}

export function ghGraphQL(query, variables = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [k, v] of Object.entries(variables)) args.push('-F', `${k}=${v}`);
  return gh(args, { json: true });
}

export function whoami() {
  return gh(['api', 'user'], { json: true }).login;
}
