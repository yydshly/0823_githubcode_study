export const RUNTIME_SESSION_SCHEMA = 'kindergrimm-runtime-session/0.1';
const MODES = Object.freeze(['waystation', 'encounter', 'council']);

function normalizedSource(source = {}) {
  const items = Array.isArray(source.items) ? source.items : [];
  return {
    source: source.source === 'imported' ? 'imported' : 'seed',
    importName: source.importName ?? null,
    input: source.input ? { ...source.input } : null,
    pack: source.pack ? { id: source.pack.id, version: source.pack.version, fingerprint: source.pack.fingerprint, rendererId: source.pack.rendererId ?? source.pack.visual?.id ?? 'kindergrimm-drawn-2d', rendererFingerprint: source.pack.rendererFingerprint ?? source.pack.visual?.fingerprint ?? null } : null,
    items: items.map(item => ({ assetFingerprint: item.assetFingerprint ?? item.fingerprint, visualFingerprint: item.visualFingerprint ?? item.visual?.fingerprint ?? null }))
  };
}

export function createRuntimeSession(initial = {}) {
  let revision = 0;
  let mode = MODES.includes(initial.mode) ? initial.mode : 'waystation';
  let selected = Math.max(0, Number(initial.selected) || 0);
  let source = normalizedSource(initial);

  function snapshot() {
    return { schemaVersion: RUNTIME_SESSION_SCHEMA, revision, mode, selected, ...normalizedSource(source) };
  }

  function replace(next) {
    source = normalizedSource(next);
    selected = Math.min(selected, Math.max(0, source.items.length - 1));
    revision += 1;
    return snapshot();
  }

  function setMode(next) {
    if (!MODES.includes(next)) return { ok: false, code: 'runtime.session.mode', value: snapshot() };
    mode = next;
    revision += 1;
    return { ok: true, value: snapshot() };
  }

  function select(index) {
    if (!source.items.length) return { ok: false, code: 'runtime.session.empty', value: snapshot() };
    selected = (Number(index) + source.items.length) % source.items.length;
    revision += 1;
    return { ok: true, value: snapshot() };
  }

  function restore(record) {
    if (record?.schemaVersion !== RUNTIME_SESSION_SCHEMA || !MODES.includes(record.mode) || !Array.isArray(record.items)) return { ok: false, code: 'runtime.session.snapshot' };
    revision = Math.max(0, Number(record.revision) || 0);
    mode = record.mode;
    selected = Math.max(0, Number(record.selected) || 0);
    source = normalizedSource(record);
    return { ok: true, value: snapshot() };
  }

  return { snapshot, replace, setMode, select, restore };
}
