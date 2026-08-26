export interface MotionPointer {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  activity: number;
}

export interface PointerMotionSnapshot extends MotionPointer {
  targetX: number;
  targetY: number;
  active: boolean;
}

const clamp = (value: number, minimum: number, maximum: number): number => Math.min(maximum, Math.max(minimum, value));

export function dampingFactor(response: number, deltaMs: number): number {
  const seconds = clamp(deltaMs / 1000, 1 / 240, 0.05);
  return 1 - Math.exp(-response * seconds);
}

/** Converts noisy device-rate pointer input into one shared motion signal. */
export class CinematicPointerController {
  private targetX = 0;
  private targetY = 0;
  private x = 0;
  private y = 0;
  private velocityX = 0;
  private velocityY = 0;
  private activity = 0;
  private active = false;

  setTarget(x: number, y: number): void {
    this.targetX = clamp(x, -1, 1);
    this.targetY = clamp(y, -1, 1);
    this.active = true;
  }

  release(): void {
    this.targetX = 0;
    this.targetY = 0;
    this.active = false;
  }

  advance(deltaMs: number, reduced = false): MotionPointer {
    if (reduced) {
      this.x = 0;
      this.y = 0;
      this.velocityX = 0;
      this.velocityY = 0;
      this.activity = 0;
      return this.frame();
    }
    const seconds = clamp(deltaMs / 1000, 1 / 240, 0.05);
    const follow = dampingFactor(this.active ? 8.5 : 5.2, deltaMs);
    const previousX = this.x;
    const previousY = this.y;
    this.x += (this.targetX - this.x) * follow;
    this.y += (this.targetY - this.y) * follow;
    const rawVelocityX = clamp((this.x - previousX) / seconds, -8, 8);
    const rawVelocityY = clamp((this.y - previousY) / seconds, -8, 8);
    const velocityFollow = dampingFactor(12, deltaMs);
    this.velocityX += (rawVelocityX - this.velocityX) * velocityFollow;
    this.velocityY += (rawVelocityY - this.velocityY) * velocityFollow;
    const targetActivity = clamp(Math.hypot(this.x, this.y) * 0.72 + Math.hypot(this.velocityX, this.velocityY) * 0.08, 0, 1);
    this.activity += (targetActivity - this.activity) * dampingFactor(targetActivity > this.activity ? 10 : 3.8, deltaMs);
    return this.frame();
  }

  snapshot(): PointerMotionSnapshot {
    return { ...this.frame(), targetX: this.targetX, targetY: this.targetY, active: this.active };
  }

  private frame(): MotionPointer {
    return { x: this.x, y: this.y, velocityX: this.velocityX, velocityY: this.velocityY, activity: this.activity };
  }
}
