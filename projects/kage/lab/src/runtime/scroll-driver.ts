export interface StorySegment {
  from: number;
  to: number;
  t: number;
  active: number;
  progress: number;
}

const emptySegment: StorySegment = { from: 0, to: 0, t: 0, active: 0, progress: 0 };

export class ScrollDriver {
  private anchors: number[] = [];
  private raf = 0;
  private lastActive = 0;
  private current: StorySegment = emptySegment;

  constructor(
    private readonly sections: readonly HTMLElement[],
    private readonly onChange: (segment: StorySegment) => void
  ) {
    this.measure();
    addEventListener('scroll', this.request, { passive: true });
    addEventListener('resize', this.handleResize, { passive: true });
    this.update();
  }

  get snapshot(): StorySegment {
    return this.current;
  }

  measure(): void {
    this.anchors = this.sections.map((section) => section.offsetTop + section.offsetHeight * 0.5);
  }

  scrollTo(index: number, behavior: ScrollBehavior): void {
    this.sections[index]?.scrollIntoView({ behavior, block: 'center' });
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
    let from = 0;
    while (from < this.anchors.length - 1 && cursor >= this.anchors[from + 1]) from += 1;
    const to = Math.min(from + 1, this.anchors.length - 1);
    const span = Math.max(1, this.anchors[to] - this.anchors[from]);
    const t = from === to ? 0 : Math.min(1, Math.max(0, (cursor - this.anchors[from]) / span));

    const candidate = t > 0.54 ? to : from;
    if (candidate !== this.lastActive && (t > 0.6 || t < 0.4)) this.lastActive = candidate;
    const totalSpan = Math.max(1, this.anchors.at(-1)! - this.anchors[0]);
    const progress = Math.min(1, Math.max(0, (cursor - this.anchors[0]) / totalSpan));
    this.current = { from, to, t, active: this.lastActive, progress };
    this.onChange(this.current);
  }
}
