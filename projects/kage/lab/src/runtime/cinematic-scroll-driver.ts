import type { FlowPlan } from '../experience/flow-plan';
import { dampingFactor } from './experience-motion';
import type { ExperienceSegment } from './experience-scroll-driver';

interface SectionLayout { top: number; height: number }

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const smoother = (value: number): number => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};

export function experienceSegmentAtProgress(plan: FlowPlan, progress: number): ExperienceSegment {
  const count = Math.max(1, plan.nodeIds.length);
  const scaled = clamp01(progress) * count;
  const index = Math.min(count - 1, Math.floor(scaled));
  const local = index === count - 1 && progress >= 1 ? 1 : clamp01(scaled - index);
  return makeChapterSegment(plan, index, local, clamp01(progress));
}

/** A frame-rate-independent scroll timeline that plays each chapter shot before its transition. */
export class CinematicScrollDriver {
  private layouts: SectionLayout[] = [];
  private targetCursor = 0;
  private smoothCursor = 0;
  private velocityValue = 0;
  private current: ExperienceSegment;

  constructor(
    private readonly plan: FlowPlan,
    private readonly sections: ReadonlyMap<string, HTMLElement>,
    private readonly onChange: (segment: ExperienceSegment) => void,
    private readonly onInput: () => void = () => undefined
  ) {
    this.current = experienceSegmentAtProgress(plan, 0);
    this.measure();
    this.targetCursor = this.readCursor();
    this.smoothCursor = this.targetCursor;
    addEventListener('scroll', this.handleScroll, { passive: true });
    addEventListener('resize', this.handleResize, { passive: true });
    this.advance(16.67, true);
  }

  get snapshot(): ExperienceSegment { return this.current; }
  get velocity(): number { return this.velocityValue; }

  measure(): void {
    this.layouts = this.plan.nodeIds.map((id) => {
      const section = this.sections.get(id);
      return { top: section?.offsetTop ?? 0, height: Math.max(1, section?.offsetHeight ?? innerHeight) };
    });
  }

  advance(deltaMs: number, reduced = false): ExperienceSegment {
    const previous = this.smoothCursor;
    if (reduced) this.smoothCursor = this.targetCursor;
    else this.smoothCursor += (this.targetCursor - this.smoothCursor) * dampingFactor(9.5, deltaMs);
    const seconds = Math.max(1 / 240, Math.min(0.05, deltaMs / 1000));
    const rawVelocity = Math.max(-4, Math.min(4, ((this.smoothCursor - previous) / Math.max(1, innerHeight)) / seconds));
    this.velocityValue += (rawVelocity - this.velocityValue) * dampingFactor(8, deltaMs);
    this.current = this.segmentAtCursor(this.smoothCursor);
    this.onChange(this.current);
    return this.current;
  }

  scrollTo(nodeId: string, behavior: ScrollBehavior): void {
    this.sections.get(nodeId)?.scrollIntoView({ behavior, block: 'center' });
  }

  destroy(): void {
    removeEventListener('scroll', this.handleScroll);
    removeEventListener('resize', this.handleResize);
  }

  private readonly handleResize = (): void => {
    this.measure();
    this.targetCursor = this.readCursor();
    this.onInput();
  };

  private readonly handleScroll = (): void => {
    this.targetCursor = this.readCursor();
    this.onInput();
  };

  private readCursor(): number { return scrollY + innerHeight * 0.5; }

  private segmentAtCursor(cursor: number): ExperienceSegment {
    if (this.layouts.length === 0) return experienceSegmentAtProgress(this.plan, 0);
    let index = 0;
    while (index < this.layouts.length - 1 && cursor >= this.layouts[index].top + this.layouts[index].height) index += 1;
    const layout = this.layouts[index];
    const local = clamp01((cursor - layout.top) / layout.height);
    const first = this.layouts[0].top;
    const last = this.layouts.at(-1)!;
    const progress = clamp01((cursor - first) / Math.max(1, last.top + last.height - first));
    return makeChapterSegment(this.plan, index, local, progress);
  }
}

function makeChapterSegment(plan: FlowPlan, index: number, localProgress: number, progress: number): ExperienceSegment {
  const lastIndex = Math.max(0, plan.nodeIds.length - 1);
  const safeIndex = Math.min(lastIndex, Math.max(0, index));
  const local = clamp01(localProgress);
  const revealStart = 0.12;
  const revealEnd = 0.6;
  const transitionStart = safeIndex === lastIndex ? 1 : 0.78;
  let phase: NonNullable<ExperienceSegment['phase']>;
  let toIndex = safeIndex;
  let t = 0;

  if (local < revealStart) {
    phase = 'establish';
  } else if (local < revealEnd) {
    phase = 'reveal';
    t = smoother((local - revealStart) / (revealEnd - revealStart));
  } else if (local <= transitionStart) {
    phase = 'hold';
    t = 1;
  } else {
    phase = 'transition';
    toIndex = Math.min(lastIndex, safeIndex + 1);
    t = smoother((local - transitionStart) / Math.max(0.001, 1 - transitionStart));
  }

  const activeIndex = phase === 'transition' && t > 0.56 ? toIndex : safeIndex;
  return {
    fromId: plan.nodeIds[safeIndex],
    toId: plan.nodeIds[toIndex],
    activeId: plan.nodeIds[activeIndex],
    fromIndex: safeIndex,
    toIndex,
    activeIndex,
    t,
    progress,
    phase
  };
}
