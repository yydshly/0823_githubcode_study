import { describe, expect, it } from 'vitest';
import { createV2BuildLaunchUrl, evaluateV2ContractHandshake } from '../src/v2/build-launch.ts';

describe('V2 bounded build launch', () => {
  it('creates one explicit Codex autorun URL bound to the selected contract', () => {
    const url = createV2BuildLaunchUrl({
      baseHref: 'http://127.0.0.1:8143/pages/v2/',
      workbenchHref: '../../workbench.html',
      brief: ' 为纸张修复构建连续证据网页。 ',
      contractId: 'contract-abc123',
      seed: 43
    });

    expect(url.pathname).toBe('/workbench.html');
    expect(url.searchParams.get('provider')).toBe('codex');
    expect(url.searchParams.get('quality')).toBe('high');
    expect(url.searchParams.get('brief')).toBe('为纸张修复构建连续证据网页。');
    expect(url.searchParams.get('seed')).toBe('43');
    expect(url.searchParams.get('autorun')).toBe('1');
    expect(url.searchParams.get('contract')).toBe('contract-abc123');
    expect(url.searchParams.get('source')).toBe('v2-composer');
  });

  it('allows an unbound workbench and a matching V2 contract only', () => {
    expect(evaluateV2ContractHandshake(null, 'contract-current')).toMatchObject({ state: 'unbound', allowed: true });
    expect(evaluateV2ContractHandshake('contract-current', 'contract-current')).toMatchObject({ state: 'matched', allowed: true });
    expect(evaluateV2ContractHandshake('contract-other', 'contract-current')).toMatchObject({ state: 'mismatch', allowed: false });
    expect(evaluateV2ContractHandshake('../invalid', 'contract-current')).toMatchObject({ state: 'invalid', allowed: false });
  });
});
