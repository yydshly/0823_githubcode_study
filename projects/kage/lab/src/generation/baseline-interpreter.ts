import type { BriefInterpretation, BriefInterpreter, CreativeBrief, CreativeDirection, IntentEvidence } from './schema.ts';
import type { ThemeTokens } from '../experience/schema.ts';
import { detectBaselineCapabilityGaps } from '../capabilities/proposal.ts';

interface SignalGroup {
  id: string;
  terms: readonly string[];
}

const visualGroups: readonly SignalGroup[] = [
  { id: 'editorial', terms: ['时装', '编辑', '杂志', '高级', 'fashion', 'editorial'] },
  { id: 'dream', terms: ['梦幻', '柔和', '流体', '光幕', '诗意', 'dream', 'fluid'] },
  { id: 'technical', terms: ['技术', '数据', '系统', '平台', '结构', '科技', 'technical', 'data'] },
  { id: 'archive', terms: ['档案', '历史', '证据', '展陈', '知识', 'archive', 'museum'] },
  { id: 'product', terms: ['产品', '发布', '品牌', '功能', '转化', 'product', 'launch'] }
];

const moodGroups: readonly SignalGroup[] = [
  { id: 'calm', terms: ['安静', '克制', '清冷', '留白', '平静', 'calm', 'quiet'] },
  { id: 'warm', terms: ['温暖', '金色', '亲密', '治愈', 'warm', 'gold'] },
  { id: 'mysterious', terms: ['神秘', '暗黑', '未知', '悬念', 'mysterious', 'dark'] },
  { id: 'energetic', terms: ['活力', '快速', '冲击', '未来', 'energetic', 'fast'] }
];

const palettes: Readonly<Record<string, ThemeTokens>> = {
  calm: { deep: '#07141c', surface: '#102a35', text: '#f1fbff', muted: '#9bb7c2', accent: '#83ddff', accentSoft: '#c8f1e7' },
  warm: { deep: '#1a100c', surface: '#352119', text: '#fff8ee', muted: '#c9afa0', accent: '#ffb36b', accentSoft: '#ffe0a3' },
  mysterious: { deep: '#100b1d', surface: '#271b39', text: '#faf3ff', muted: '#b9a8ca', accent: '#b69aff', accentSoft: '#ff9bc9' },
  energetic: { deep: '#071516', surface: '#123033', text: '#f2fffb', muted: '#9cbdb6', accent: '#69f3c4', accentSoft: '#ffe56f' },
  default: { deep: '#08131f', surface: '#102536', text: '#ecf8ef', muted: '#9ab3b5', accent: '#79e7c4', accentSoft: '#f0c88d' }
};

function matched(text: string, group: SignalGroup): string[] {
  return group.terms.filter((term) => text.toLowerCase().includes(term.toLowerCase()));
}

function rankGroups(text: string, groups: readonly SignalGroup[]): Array<{ id: string; matches: string[] }> {
  return groups.map((group) => ({ id: group.id, matches: matched(text, group) })).sort((a, b) => b.matches.length - a.matches.length || a.id.localeCompare(b.id));
}

function subjectFrom(text: string): string {
  const cleaned = text.replace(/[，。！？,.!?；;：:\n\r]/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned.length > 22 ? `${cleaned.slice(0, 22)}…` : cleaned;
}

function evidence(field: IntentEvidence['field'], source: IntentEvidence['source'], excerpts: readonly string[], confidence: number, decision: string): IntentEvidence {
  return { field, source, excerpts, confidence, decision };
}

export class BaselineBriefInterpreter implements BriefInterpreter {
  readonly id = 'baseline-keyword-v1';

  async interpret(brief: CreativeBrief): Promise<BriefInterpretation> {
    const text = brief.text.trim();
    if (text.length < 8) throw new Error('请至少描述目标、主体或氛围，建议不少于 8 个字符。');
    const visuals = rankGroups(text, visualGroups);
    const moods = rankGroups(text, moodGroups);
    const visual = visuals[0].matches.length ? visuals[0] : { id: 'product', matches: [] };
    const mood = moods[0].matches.length ? moods[0] : { id: 'default', matches: [] };
    const chromaticScore = visuals.filter((item) => item.id === 'editorial' || item.id === 'dream').reduce((sum, item) => sum + item.matches.length, 0);
    const signalScore = visuals.filter((item) => item.id === 'technical' || item.id === 'archive' || item.id === 'product').reduce((sum, item) => sum + item.matches.length, 0);
    const primaryScene: CreativeDirection['scenePlugin'] = chromaticScore > signalScore ? 'chromatic-tide' : 'signal-world';
    const contrastScene: CreativeDirection['scenePlugin'] = primaryScene === 'signal-world' ? 'chromatic-tide' : 'signal-world';
    const subject = subjectFrom(text);
    const audienceMatch = text.match(/(?:面向|给|针对)([^，。；;]{2,16})/);
    const audience = audienceMatch?.[1]?.trim() || '需要快速理解核心价值的网页访客';
    const palette = palettes[mood.id] ?? palettes.default;
    const intentTags = [...new Set([...visuals.flatMap((item) => item.matches.length ? [item.id] : []), mood.id])];
    const pace: CreativeDirection['pace'] = mood.id === 'calm' ? 'calm' : mood.id === 'energetic' ? 'dynamic' : 'measured';

    const directions: CreativeDirection[] = [
      {
        id: 'focused-hero', title: '单镜凝视', thesis: '把主体压缩为一次连续、可记忆的视觉变化。', structure: 'focus', scenePlugin: primaryScene, nodeCount: 1, pace,
        theme: palette, tags: [visual.id, mood.id, 'hero'], rationale: ['适合首屏、互动海报和单一核心价值。', `优先使用 ${primaryScene}，因为 brief 中的视觉信号更接近其能力标签。`]
      },
      {
        id: 'guided-journey', title: '分阶段铺陈', thesis: '把理解过程拆成建立、展开、证明和收束。', structure: 'journey', scenePlugin: contrastScene, nodeCount: text.length > 70 ? 5 : 4, pace: 'measured',
        theme: rotatePalette(palette), tags: [visual.id, 'narrative', 'contrast'], rationale: ['用另一种场景能力制造可比较的视觉方向。', '适合产品发布、技术解释和品牌长页。']
      },
      {
        id: 'branching-question', title: '双路径探索', thesis: '让访客在理性证据与情绪共鸣之间选择，再汇合到结论。', structure: 'branching', scenePlugin: primaryScene, nodeCount: 5, pace: pace === 'calm' ? 'measured' : pace,
        theme: deepenPalette(palette), tags: [visual.id, 'choice', 'exploration'], rationale: ['把差异落实为流程拓扑，而不只是颜色变化。', '适合个性化叙事、教育和探索型内容。']
      }
    ];

    return {
      providerId: this.id,
      provenance: { requested: 'local', selected: 'local', model: this.id, mode: 'local', latencyMs: 0, fallbackReason: null, cacheStatus: 'bypass' },
      subject,
      audience,
      intentTags,
      evidence: [
        evidence('subject', 'explicit', [subject], .92, `以“${subject}”作为候选内容主体。`),
        evidence('audience', audienceMatch ? 'explicit' : 'baseline-default', audienceMatch ? [audienceMatch[0]] : [], audienceMatch ? .82 : .36, audience),
        evidence('visual', visual.matches.length ? 'explicit' : 'baseline-default', visual.matches, visual.matches.length ? .78 : .34, `主视觉能力倾向 ${primaryScene}。`),
        evidence('mood', mood.matches.length ? 'explicit' : 'baseline-default', mood.matches, mood.matches.length ? .76 : .32, `采用 ${mood.id} 色彩和节奏基线。`),
        evidence('structure', 'inferred', [], .55, '主动产生 focus、journey、branching 三种拓扑用于比较。')
      ],
      capabilityGaps: detectBaselineCapabilityGaps(text),
      effectSpecs: null,
      experienceBlueprints: null,
      directions
    };
  }
}

function rotatePalette(theme: ThemeTokens): ThemeTokens {
  return { ...theme, accent: theme.accentSoft, accentSoft: theme.accent, surface: mixHex(theme.surface, theme.accent, .12) };
}

function deepenPalette(theme: ThemeTokens): ThemeTokens {
  return { ...theme, deep: mixHex(theme.deep, '#000000', .22), surface: mixHex(theme.surface, theme.deep, .35) };
}

function mixHex(from: string, to: string, amount: number): string {
  const value = (hex: string, offset: number) => Number.parseInt(hex.slice(offset, offset + 2), 16);
  const channel = (offset: number) => Math.round(value(from, offset) * (1 - amount) + value(to, offset) * amount).toString(16).padStart(2, '0');
  return `#${channel(1)}${channel(3)}${channel(5)}`;
}
