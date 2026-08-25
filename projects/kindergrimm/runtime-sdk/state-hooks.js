export const ACTOR_STATE_SCHEMA = 'kindergrimm-actor-state/0.1';
export const ACTOR_STATES = Object.freeze(['idle', 'selected', 'moving', 'alert', 'speaking', 'damaged', 'disabled']);

const TRANSITIONS = Object.freeze({
  idle: ACTOR_STATES,
  selected: ACTOR_STATES,
  moving: ['idle', 'selected', 'alert', 'damaged', 'disabled'],
  alert: ['idle', 'selected', 'moving', 'speaking', 'damaged', 'disabled'],
  speaking: ['idle', 'selected', 'alert', 'damaged', 'disabled'],
  damaged: ['idle', 'alert', 'disabled'],
  disabled: ['idle']
});

export function createActorState(initial = 'idle', options = {}) {
  if (!ACTOR_STATES.includes(initial)) throw new Error(`unsupported actor state: ${initial}`);
  let current = initial;
  let revision = 0;
  let context = Object.freeze({ ...(options.context ?? {}) });
  const listeners = new Set();

  function snapshot() {
    return { schemaVersion: ACTOR_STATE_SCHEMA, state: current, revision, context: { ...context } };
  }

  function transition(next, detail = {}) {
    if (!ACTOR_STATES.includes(next)) return { ok: false, code: 'runtime.state.unsupported', from: current, to: next };
    if (next !== current && !TRANSITIONS[current].includes(next)) return { ok: false, code: 'runtime.state.transition', from: current, to: next };
    const previous = current;
    current = next;
    context = Object.freeze({ ...context, ...detail });
    revision += 1;
    const event = Object.freeze({ type: 'transition', from: previous, to: current, revision, detail: { ...detail }, snapshot: snapshot() });
    for (const listener of listeners) listener(event);
    return { ok: true, event };
  }

  function restore(record) {
    if (record?.schemaVersion !== ACTOR_STATE_SCHEMA || !ACTOR_STATES.includes(record.state)) return { ok: false, code: 'runtime.state.snapshot' };
    current = record.state;
    revision = Math.max(0, Number(record.revision) || 0);
    context = Object.freeze({ ...(record.context ?? {}) });
    return { ok: true, value: snapshot() };
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new Error('listener must be a function');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  return { snapshot, transition, restore, subscribe };
}
