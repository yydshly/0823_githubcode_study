import type { FlowPlan } from '../experience/flow-plan';

export type ExperienceMotionPhase = 'establish' | 'reveal' | 'hold' | 'transition';

export interface ExperienceSegment {
  fromId: string;
  toId: string;
  activeId: string;
  fromIndex: number;
  toIndex: number;
  activeIndex: number;
  t: number;
  progress: number;
  phase?: ExperienceMotionPhase;
}

export class ExperienceScrollDriver {
  private anchors: number[] = [];
  private raf = 0;
  private lastActiveIndex = 0;
  private current: ExperienceSegment;

  constructor(
    private readonly plan: FlowPlan,
    private readonly sections: ReadonlyMap<string, HTMLElement>,
    private readonly onChange: (segment: ExperienceSegment) => void
  ) {
    this.current = this.makeSegment(0, 0, 0, 0);
    this.measure();
    addEventListener('scroll', this.request, { passive: true });
    addEventListener('resize', this.handleResize, { passive: true });
    this.update();
  }

  get snapshot(): ExperienceSegment {
    return this.current;
  }

  measure(): void {
    this.anchors = this.plan.nodeIds.map((id) => {
      const section = this.sections.get(id);
      return section ? section.offsetTop + section.offsetHeight * 0.5 : 0;
    });
  }

  scrollTo(nodeId: string, behavior: ScrollBehavior): void {
    this.sections.get(nodeId)?.scrollIntoView({ behavior, block: 'center' });
  }

  destroy(): void {
    removeEventListener('scroll', this.request);
    removeEventListener('resize', this.handleResize);
    cancelAnimationFrame(this.raf);
  }

  private readonly handleResize = (): void => {
    this.measure();
    this.request();
  };

  private readonly request = (): void => {
    if (this.raf) return;
    this.raf = requestAnimationFrame(() => {
      this.raf = 0;
      this.update();
    });
  };

  private update(): void {
    if (this.anchors.length === 0) return;
    const cursor = scrollY + innerHeight * 0.5;

    if (this.anchors.length === 1) {
      const section = this.sections.get(this.plan.nodeIds[0]);
      const start = section?.offsetTop ?? 0;
      const end = start + Math.max(1, (section?.offsetHeight ?? innerHeight) - innerHeight);
      const t = Math.min(1, Math.max(0, (scrollY - start) / Math.max(1, end - start)));
      this.current = this.makeSegment(0, 0, t, t);
      this.onChange(this.current);
      return;
    }

    let fromIndex = 0;
    while (fromIndex < this.anchors.length - 1 && cursor >= this.anchors[fromIndex + 1]) fromIndex += 1;
    const toIndex = Math.min(fromIndex + 1, this.anchors.length - 1);
    const span = Math.max(1, this.anchors[toIndex] - this.anchors[fromIndex]);
    const t = fromIndex === toIndex ? 0 : Math.min(1, Math.max(0, (cursor - this.anchors[fromIndex]) / span));
    const candidate = t > 0.54 ? toIndex : fromIndex;
    if (candidate !== this.lastActiveIndex && (t > 0.6 || t < 0.4)) this.lastActiveIndex = candidate;
    const totalSpan = Math.max(1, this.anchors.at(-1)! - this.anchors[0]);
    const progress = Math.min(1, Math.max(0, (cursor - this.anchors[0]) / totalSpan));
    this.current = this.makeSegment(fromIndex, toIndex, t, progress);
    this.onChange(this.current);
  }

  private makeSegment(fromIndex: number, toIndex: number, t: number, progress: number): ExperienceSegment {
    return {
      fromId: this.plan.nodeIds[fromIndex],
      toId: this.plan.nodeIds[toIndex],
      activeId: this.plan.nodeIds[this.lastActiveIndex],
      fromIndex,
      toIndex,
      activeIndex: this.lastActiveIndex,
      t,
      progress
    };
  }
}
