import type { CreativeProviderId, ProviderProvenance, ProviderStatusResponse } from './schema';

const providerLabels: Readonly<Record<Exclude<CreativeProviderId, 'auto'>, string>> = {
  codex: 'Codex（本机）', mimo: '小米 MiMo', minimax: 'MiniMax', openai: 'OpenAI Responses', local: '本地基线'
};

export function readProviderId(value: string | null): CreativeProviderId {
  return value === 'codex' || value === 'mimo' || value === 'minimax' || value === 'openai' || value === 'local' ? value : 'auto';
}

export function providerButtonLabel(provider: CreativeProviderId): string {
  const labels: Readonly<Record<CreativeProviderId, string>> = {
    auto: '自动选择模型并生成', codex: '用 Codex 生成', mimo: '用 MiMo 生成', minimax: '用 MiniMax 生成', openai: '用 OpenAI 生成', local: '用本地基线生成'
  };
  return labels[provider];
}

export function syncProviderHelp(select: HTMLSelectElement, help: HTMLElement): void {
  help.textContent = select.value === 'local'
    ? '本地基线不会把 brief 发送到外部服务。'
    : '点击生成后，这段 brief 会发送给所选模型 provider；密钥只保存在服务端。';
}

export function renderProviderProvenance(badge: HTMLElement, label: HTMLElement, value: ProviderProvenance): void {
  badge.dataset.mode = value.mode;
  label.textContent = `${value.selected.toUpperCase()} · ${value.model}`;
  badge.title = value.fallbackReason
    ? `实际 provider：${value.selected}；${value.fallbackReason}`
    : `实际 provider：${value.selected}；耗时 ${value.latencyMs}ms`;
}

export function renderProviderAvailability(select: HTMLSelectElement, badge: HTMLElement, label: HTMLElement, value: ProviderStatusResponse | null): void {
  if (!value) {
    select.querySelectorAll<HTMLOptionElement>('option').forEach((option) => {
      option.disabled = option.value !== 'local';
    });
    select.value = 'local';
    label.textContent = 'PUBLIC WORKBENCH · LOCAL MODE';
    badge.dataset.mode = 'local';
    return;
  }
  value.providers.forEach((item) => {
    const option = select.querySelector<HTMLOptionElement>(`option[value="${item.id}"]`);
    if (!option) return;
    option.disabled = !item.available;
    option.textContent = item.available ? `${providerLabels[item.id]} · ${item.model}` : `${providerLabels[item.id]} · 未配置`;
    option.title = item.reason || item.model;
  });
  const ready = value.providers.filter((item) => item.available && item.id !== 'local').map((item) => item.id.toUpperCase());
  label.textContent = ready.length ? `${ready.join(' / ')} · READY` : 'LOCAL ONLY · PROVIDER READY';
  badge.dataset.mode = ready.length ? 'remote' : 'local';
}
