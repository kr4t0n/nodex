import process from 'node:process';

import { clearToken, credentialsFor, saveToken } from './config.ts';
import { apiBase, awaitApproval, startDevice, whoami } from './device.ts';
import { DEFAULT_REGISTRY, type Registry } from './registry.ts';
import { bold, dim, fail, heading, out } from './ui.ts';

/**
 * Poll for browser approval and store the resulting Nodex session locally.
 */
export async function cmdLogin(registry: Registry): Promise<void> {
  heading('Login');
  out();

  if (!registry.isRemote) {
    out('  This registry is a directory, read straight off disk, so there is');
    out('  no server to sign in to.');
    out();
    out(`    ${registry.root}`);
    out();
    out(
      `  ${dim('Drop --registry, or unset NODEX_REGISTRY, to use the hosted one:')}`,
    );
    out(`    ${dim(DEFAULT_REGISTRY)}`);
    out();
    return;
  }

  if (process.env.NODEX_TOKEN) {
    out(`  ${bold('NODEX_TOKEN')} is set, and it takes precedence.`);
    out(`  ${dim('Unset it to sign in interactively instead.')}`);
    out();
    return;
  }

  const api = apiBase(registry.root);

  let start;
  try {
    start = await startDevice(api);
  } catch (cause) {
    fail(cause instanceof Error ? cause.message : 'Could not start sign in.');
  }

  out(`  Open  ${bold(start.verificationUri)}`);
  out(`  Code  ${bold(start.userCode)}`);
  out();
  out(`  ${dim('Waiting for approval. Ctrl-C to cancel.')}`);
  out();

  let granted;
  try {
    granted = await awaitApproval(api, start);
  } catch (cause) {
    fail(cause instanceof Error ? cause.message : 'Sign in failed.');
  }

  const where = await saveToken(registry.root, {
    token: granted.token,
    login: granted.login ?? undefined,
  });

  out(`  ${bold('Signed in')}${granted.login ? ` as ${granted.login}` : ''}.`);
  out(`  ${dim(`Token stored in ${where} (readable only by you).`)}`);
  out();
}

export async function cmdLogout(registry: Registry): Promise<void> {
  heading('Logout');
  out();

  if (process.env.NODEX_TOKEN) {
    out(`  ${bold('NODEX_TOKEN')} is set in this environment.`);
    out(`  ${dim('Unset it; there is nothing on disk to remove.')}`);
    out();
    return;
  }

  const removed = await clearToken(registry.root);
  out(
    removed
      ? `  Signed out of ${registry.root}.`
      : `  Was not signed in to ${registry.root}.`,
  );
  out();
}

/** Who the stored token belongs to, checked against the server. */
export async function cmdWhoami(registry: Registry): Promise<void> {
  heading('Whoami');
  out();

  if (!registry.isRemote) {
    out('  This registry is a directory, which has no sessions.');
    out();
    out(`    ${registry.root}`);
    out();
    out(`  ${dim(`Try: nodex whoami --registry ${DEFAULT_REGISTRY}`)}`);
    out();
    return;
  }

  const credentials = await credentialsFor(registry.root);
  if (!credentials) {
    out(`  Not signed in to ${registry.root}.`);
    out(`  ${dim('Run `nodex login`.')}`);
    out();
    return;
  }

  const who = await whoami(apiBase(registry.root), credentials.token);
  if (!who) {
    out('  The stored token is no longer valid.');
    out(`  ${dim('Run `nodex login` again.')}`);
    out();
    return;
  }

  out(`  ${bold(who.login)} at ${registry.root}`);
  out();
}
