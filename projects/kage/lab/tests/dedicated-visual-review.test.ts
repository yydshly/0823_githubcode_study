import type { Page } from '@playwright/test';
import { describe, expect, it, vi } from 'vitest';
import { performPrimaryControlInput } from '../server/dedicated-visual-review.ts';

interface FakeControl {
  id: string;
  tag: string;
  type?: string;
  role?: string;
  attributes?: Record<string, string>;
  classes?: string[];
  visible?: boolean;
  enabled?: boolean;
  checked?: boolean;
  min?: string;
  max?: string;
  value?: string;
  selectedIndex?: number;
  optionCount?: number;
}

function createControlPage(controls: FakeControl[]) {
  const clicked: string[] = [];
  const filled: Array<{ id: string; value: string }> = [];
  const locators = controls.map((control) => {
    const attributes = new Map(Object.entries(control.attributes || {}));
    if (control.type) attributes.set('type', control.type);
    if (control.role) attributes.set('role', control.role);
    const element = {
      tagName: control.tag.toUpperCase(),
      checked: control.checked || false,
      min: control.min || '',
      max: control.max || '',
      value: control.value || '',
      selectedIndex: control.selectedIndex || 0,
      getAttribute: (name: string) => attributes.get(name) ?? null,
      classList: { contains: (name: string) => (control.classes || []).includes(name) }
    };
    return {
      isVisible: vi.fn(async () => control.visible !== false),
      isEnabled: vi.fn(async () => control.enabled !== false),
      evaluate: vi.fn(async (callback: (target: typeof element) => unknown) => callback(element)),
      getAttribute: vi.fn(async (name: string) => attributes.get(name) ?? null),
      fill: vi.fn(async (value: string) => { filled.push({ id: control.id, value }); }),
      click: vi.fn(async () => { clicked.push(control.id); }),
      locator: vi.fn(() => ({ count: vi.fn(async () => control.optionCount || 0) })),
      selectOption: vi.fn(async () => undefined)
    };
  });
  const collection = {
    count: vi.fn(async () => locators.length),
    nth: vi.fn((index: number) => locators[index])
  };
  const locator = vi.fn((_selector: string) => collection);
  return { page: { locator } as unknown as Page, locator, clicked, filled };
}

describe('performPrimaryControlInput', () => {
  it('targets an inactive real descendant instead of the marked group container', async () => {
    const fixture = createControlPage([
      { id: 'hidden', tag: 'button', visible: false, attributes: { 'aria-pressed': 'false' } },
      { id: 'active', tag: 'button', attributes: { 'aria-pressed': 'true' } },
      { id: 'disabled', tag: 'button', enabled: false, attributes: { 'aria-selected': 'false' } },
      { id: 'plain', tag: 'button' },
      { id: 'inactive', tag: 'button', attributes: { 'aria-selected': 'false' } }
    ]);

    await expect(performPrimaryControlInput(fixture.page)).resolves.toBe(true);

    expect(fixture.clicked).toEqual(['inactive']);
    expect(fixture.locator).toHaveBeenCalledOnce();
    const selector = fixture.locator.mock.calls[0]?.[0];
    expect(selector).toContain('[data-signal-primary-control]:is(button');
    expect(selector).toContain('[data-signal-primary-control] :is(button');
  });

  it('preserves direct marked range input handling', async () => {
    const fixture = createControlPage([
      { id: 'range', tag: 'input', type: 'range', min: '0', max: '100', value: '0' }
    ]);

    await expect(performPrimaryControlInput(fixture.page)).resolves.toBe(true);

    expect(fixture.filled).toEqual([{ id: 'range', value: '100' }]);
    expect(fixture.clicked).toEqual([]);
  });
});
