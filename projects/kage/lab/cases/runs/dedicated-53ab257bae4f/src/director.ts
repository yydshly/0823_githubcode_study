export type Inputs = { temperature: number; hydration: number; hours: number };

export type FermentationState = {
  maturity: number;
  phase: 'early' | 'active' | 'mature';
  phaseLabel: string;
  phaseNote: string;
  volume: number;
  bubbles: number;
  tension: number;
  warmth: number;
  recommendation: string;
};

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value));

export function calculateFermentation(inputs: Inputs): FermentationState {
  const temperatureFactor = clamp((inputs.temperature - 17) / 15, .08, 1.08);
  const timeFactor = clamp((inputs.hours - 1) / 15, 0, 1);
  const hydrationFactor = clamp((inputs.hydration - 55) / 28, .05, 1);
  const maturity = clamp(timeFactor * .62 + temperatureFactor * .27 + hydrationFactor * .11);
  const phase = maturity < .36 ? 'early' : maturity < .66 ? 'active' : 'mature';
  const volume = Math.round(100 + maturity * 92);
  const bubbles = Math.round(12 + maturity * 76 + hydrationFactor * 12);
  const tension = Math.round(clamp(.92 - hydrationFactor * .38 + maturity * .08, .28, .94) * 100);

  if (phase === 'early') {
    return { maturity, phase, volume, bubbles, tension, warmth: temperatureFactor, phaseLabel: '建立期', phaseNote: '气泡正在形成，面团仍以紧实和轻微隆起为主。', recommendation: '继续等待，并在体积接近 150% 时重新观察。' };
  }
  if (phase === 'active') {
    return { maturity, phase, volume, bubbles, tension, warmth: temperatureFactor, phaseLabel: '活跃期', phaseNote: '气泡网络已经清晰，体积与表面张力处于可观察窗口。', recommendation: '现在适合练习折叠、判断弹性，并记录气泡分布。' };
  }
  return { maturity, phase, volume, bubbles, tension, warmth: temperatureFactor, phaseLabel: '成熟期', phaseNote: '面团接近峰值，气泡密集且顶部隆起更明显。', recommendation: inputs.temperature >= 28 || inputs.hours >= 14 ? '建议尽快进入整形，避免继续发酵造成结构回落。' : '已接近理想成熟窗口，可以准备整形与烘烤。' };
}
