export interface V2BuildLaunchInput {
  baseHref: string;
  workbenchHref: string;
  brief: string;
  contractId: string;
  seed: number;
}

export type V2ContractHandshake =
  | { state: 'unbound'; allowed: true; expected: null; actual: string }
  | { state: 'matched'; allowed: true; expected: string; actual: string }
  | { state: 'invalid' | 'mismatch'; allowed: false; expected: string; actual: string };

const contractIdPattern = /^contract-[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function createV2BuildLaunchUrl(input: V2BuildLaunchInput): URL {
  if (!contractIdPattern.test(input.contractId)) throw new Error('V2 构建合同 ID 不合法。');
  const url = new URL(input.workbenchHref, input.baseHref);
  url.searchParams.set('provider', 'codex');
  url.searchParams.set('quality', 'high');
  url.searchParams.set('brief', input.brief.trim());
  url.searchParams.set('seed', String(input.seed));
  url.searchParams.set('autorun', '1');
  url.searchParams.set('contract', input.contractId);
  url.searchParams.set('source', 'v2-composer');
  return url;
}

export function evaluateV2ContractHandshake(expected: string | null, actual: string): V2ContractHandshake {
  if (!expected) return { state: 'unbound', allowed: true, expected: null, actual };
  if (!contractIdPattern.test(expected)) return { state: 'invalid', allowed: false, expected, actual };
  if (expected !== actual) return { state: 'mismatch', allowed: false, expected, actual };
  return { state: 'matched', allowed: true, expected, actual };
}
