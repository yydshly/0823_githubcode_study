export const STORY_SCHEMA = 'kindergrimm-story-reply-before-storm/1.0';
export const STORY_SEED = 240824;

export const STORY_CAST = Object.freeze([
  Object.freeze({ id: 'airo', name: '艾萝', role: '年轻信使', symbol: 'feather' }),
  Object.freeze({ id: 'oren', name: '奥伦', role: '守站人', symbol: 'key' }),
  Object.freeze({ id: 'mia', name: '米娅', role: '带着孩子的织工', symbol: 'thread' }),
  Object.freeze({ id: 'ves', name: '维斯', role: '闸门管理员', symbol: 'gate' })
]);

export const STORY_CHAPTERS = Object.freeze([
  Object.freeze({ id: 'courier-post', index: 0, eyebrow: '第一章 · 信使驿站', title: '没有写收件人的回信', sceneSlot: 2 }),
  Object.freeze({ id: 'trail-shrine', index: 1, eyebrow: '第二章 · 山径神龛', title: '被风吹乱的路', sceneSlot: 1 }),
  Object.freeze({ id: 'waystation-display', index: 2, eyebrow: '第三章 · 旧水闸', title: '钟声该为谁响起', sceneSlot: 0 })
]);

export const STORY_ENDINGS = Object.freeze({
  community: Object.freeze({
    id: 'community',
    title: '所有人都看见了路',
    summary: '艾萝敲响旧钟，把路线钉在水闸外墙。居民彼此传递方向，在河水漫过低桥前撤到了高地。那封信最终没有收件人——因为它属于所有人。',
    principle: '信息被分享时，路线才真正成为公共设施。'
  }),
  council: Object.freeze({
    id: 'council',
    title: '信被准时送达',
    summary: '艾萝把回信交给维斯，水闸按旧规关闭。城中心的人先得到了路线，但外街直到钟声很晚才知道方向。任务完成了，责任却没有随封蜡一起结束。',
    principle: '流程可以完成任务，却不一定完成公共责任。'
  })
});

const ACTIONS = Object.freeze({
  accept_letter: Object.freeze({ label: '接过回信', hint: '领取卷轴、信使包与提灯', tone: 'primary' }),
  light_lantern: Object.freeze({ label: '点亮提灯', hint: '照亮山径，风暴推进一格', tone: 'primary' }),
  repair_waymark: Object.freeze({ label: '扶正路标', hint: '修复公共方向标记并获得旧护符', tone: 'primary' }),
  guide_family: Object.freeze({ label: '带米娅一家走到岔路', hint: '增加社区信任，但风暴再推进一格', tone: 'support' }),
  continue_gate: Object.freeze({ label: '赶往旧水闸', hint: '进入最后一章', tone: 'primary' }),
  unseal_route: Object.freeze({ label: '用护符解开封蜡', hint: '公开路线的内容', tone: 'primary' }),
  signal_public: Object.freeze({ label: '敲响旧钟，公开路线', hint: '让所有街区同时得到方向', tone: 'community' }),
  deliver_council: Object.freeze({ label: '把信交给管理员', hint: '遵守旧流程，按时完成委托', tone: 'council' }),
  restart: Object.freeze({ label: '重新选择这条路', hint: '从驿站重新开始', tone: 'support' })
});

function freezeState(state) {
  return Object.freeze({ ...state, inventory: Object.freeze([...state.inventory]), flags: Object.freeze({ ...state.flags }), history: Object.freeze([...state.history]) });
}

export function createStoryState() {
  return freezeState({
    schemaVersion: STORY_SCHEMA,
    seed: STORY_SEED,
    chapter: 0,
    step: 'briefing',
    trust: 0,
    storm: 0,
    inventory: [],
    flags: {},
    ending: null,
    history: []
  });
}

function transition(state, patch, command) {
  return freezeState({
    ...state,
    ...patch,
    inventory: patch.inventory || state.inventory,
    flags: { ...state.flags, ...(patch.flags || {}) },
    history: [...state.history, command]
  });
}

export function availableStoryActions(state) {
  if (state.ending) return [{ id: 'restart', ...ACTIONS.restart }];
  if (state.step === 'briefing') return [{ id: 'accept_letter', ...ACTIONS.accept_letter }];
  if (state.step === 'trail-dark') return [{ id: 'light_lantern', ...ACTIONS.light_lantern }];
  if (state.step === 'trail-lit') return [{ id: 'repair_waymark', ...ACTIONS.repair_waymark }];
  if (state.step === 'waymark-fixed') return [
    { id: 'guide_family', ...ACTIONS.guide_family },
    { id: 'continue_gate', ...ACTIONS.continue_gate }
  ];
  if (state.step === 'family-guided') return [{ id: 'continue_gate', ...ACTIONS.continue_gate }];
  if (state.step === 'gate-closed') return [{ id: 'unseal_route', ...ACTIONS.unseal_route }];
  if (state.step === 'route-open') return [
    { id: 'signal_public', ...ACTIONS.signal_public },
    { id: 'deliver_council', ...ACTIONS.deliver_council }
  ];
  return [];
}

export function storyCommand(state, command) {
  const allowed = new Set(availableStoryActions(state).map(action => action.id));
  if (!allowed.has(command)) throw new Error('当前故事状态不允许行动：' + command);
  if (command === 'restart') return createStoryState();
  if (command === 'accept_letter') return transition(state, {
    chapter: 1,
    step: 'trail-dark',
    inventory: ['scroll', 'satchel', 'lantern'],
    flags: { letterAccepted: true }
  }, command);
  if (command === 'light_lantern') return transition(state, {
    step: 'trail-lit',
    storm: 1,
    flags: { lanternLit: true }
  }, command);
  if (command === 'repair_waymark') return transition(state, {
    step: 'waymark-fixed',
    trust: state.trust + 1,
    inventory: [...state.inventory, 'waymark', 'charm'],
    flags: { waymarkFixed: true }
  }, command);
  if (command === 'guide_family') return transition(state, {
    step: 'family-guided',
    trust: state.trust + 2,
    storm: state.storm + 1,
    flags: { familyGuided: true }
  }, command);
  if (command === 'continue_gate') return transition(state, {
    chapter: 2,
    step: 'gate-closed',
    flags: { reachedGate: true }
  }, command);
  if (command === 'unseal_route') return transition(state, {
    step: 'route-open',
    flags: { routeKnown: true }
  }, command);
  if (command === 'signal_public') return transition(state, {
    step: 'complete',
    ending: 'community',
    trust: state.trust + 2,
    flags: { bellRung: true }
  }, command);
  return transition(state, {
    step: 'complete',
    ending: 'council',
    flags: { letterDelivered: true }
  }, command);
}

export function storyView(state) {
  if (state.ending) {
    const ending = STORY_ENDINGS[state.ending];
    return { speaker: 'airo', text: ending.summary, objective: ending.principle, mood: 'ending' };
  }
  const helped = state.flags.familyGuided;
  const views = {
    briefing: { speaker: 'oren', text: '河水正在涨。旧工程师留下的回信里画着一条高地路线，却没有写收件人。把它送到旧水闸——在最后一座低桥被淹没前。', objective: '领取回信，理解这不是一次普通送件。', mood: 'quiet' },
    'trail-dark': { speaker: 'airo', text: '山径上的灯全灭了。黑暗里有人在问路，倒下的路标把箭头指向河谷。', objective: '先点亮提灯，看清道路。', mood: 'storm' },
    'trail-lit': { speaker: 'mia', text: '我们跟着箭头走了两次，每次都回到水边。那块路标不是装饰，它决定谁能找到高地。', objective: '扶正路标，让方向重新可信。', mood: 'storm' },
    'waymark-fixed': { speaker: 'mia', text: '路标修好了。你可以立刻赶去水闸，也可以带我们走过最容易迷路的岔口。', objective: '在时间和帮助他人之间做一次真实选择。', mood: 'choice' },
    'family-guided': { speaker: 'mia', text: '我们记住这条路，也会告诉后面的人。拿着神龛背后的旧护符——它和信上的封蜡是同一个记号。', objective: '赶往旧水闸。', mood: 'hope' },
    'gate-closed': { speaker: 'ves', text: helped ? '你带来的人已经在外墙等候。那封信按规矩应先交给我。' : '你来得很快。那封信按规矩应先交给我。', objective: '用路标旁获得的护符解开封蜡。', mood: 'conflict' },
    'route-open': { speaker: 'airo', text: '信里不是命令，而是一张所有街区都能使用的疏散图。旧钟可以同时提醒整座城；交给管理员则更快、更符合流程。', objective: '决定路线属于一个收件人，还是属于所有正在寻找路的人。', mood: 'choice' }
  };
  return views[state.step];
}

export function validateStoryState(state) {
  const errors = [];
  if (!state || state.schemaVersion !== STORY_SCHEMA) errors.push('schemaVersion');
  if (!Number.isInteger(state?.chapter) || state.chapter < 0 || state.chapter > 2) errors.push('chapter');
  if (!Array.isArray(state?.inventory) || !Array.isArray(state?.history)) errors.push('collections');
  if (state?.ending && !STORY_ENDINGS[state.ending]) errors.push('ending');
  return { ok: errors.length === 0, errors };
}
