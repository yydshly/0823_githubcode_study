export const RUNTIME_DIAGNOSTICS_SCHEMA = 'kindergrimm-runtime-diagnostics/0.1';

export function createRuntimeDiagnostics(clock = () => performance.now()) {
  const timings = new Map();
  const counters = new Map();
  const issues = [];

  function start(id) {
    const started = clock();
    return detail => {
      const durationMs = Math.max(0, clock() - started);
      const values = timings.get(id) ?? [];
      values.push(durationMs);
      timings.set(id, values);
      return { id, durationMs, detail: detail ?? null };
    };
  }

  function count(id, amount = 1) { counters.set(id, (counters.get(id) ?? 0) + amount); }

  function issue(code, message, detail = {}) {
    const value = { code, message, detail: { ...detail } };
    issues.push(value);
    return value;
  }

  function snapshot(extra = {}) {
    return {
      schemaVersion: RUNTIME_DIAGNOSTICS_SCHEMA,
      timings: Object.fromEntries([...timings].map(([id, values]) => [id, {
        count: values.length,
        lastMs: Math.round(values.at(-1) * 100) / 100,
        maxMs: Math.round(Math.max(...values) * 100) / 100
      }])),
      counters: Object.fromEntries(counters),
      issues: issues.map(value => ({ ...value, detail: { ...value.detail } })),
      ...extra
    };
  }

  return { start, count, issue, snapshot };
}
