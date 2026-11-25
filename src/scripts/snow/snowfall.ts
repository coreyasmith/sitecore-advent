import type { Snowbank } from './snowbank';

interface Flake {
  x: number;
  y: number;
  size: number;
  speed: number;
  sway: number;
  swaySpeed: number;
  phase: number;
  opacity: number;
}

// Snow each landing flake adds to the bank, in square pixels for a 5px flake
const FLAKE_VOLUME = 90;

// Snowflakes falling onto the snowbank, or anything that stands in for one
export class Snowfall {
  private flakes: Flake[] = [];
  private width = 0;

  constructor(private bank: Pick<Snowbank, 'surfaceAt' | 'add'>) {}

  // Keeps the snow that's already falling, spread across the new width, and only adds or drops
  // flakes to keep the density, so resizing the window doesn't start the snowfall over
  resize(width: number, height: number) {
    if (this.width) {
      const stretch = width / this.width;
      for (const flake of this.flakes) flake.x *= stretch;
    }
    this.width = width;

    const count = Math.round(Math.min(160, Math.max(40, width / 10)));
    const kept = this.flakes.slice(0, count);
    const added = Array.from({ length: count - kept.length }, () => this.create(Math.random() * height));
    this.flakes = [...kept, ...added];
  }

  update(dt: number, time: number) {
    for (const flake of this.flakes) {
      flake.y += flake.speed * dt;
      const x = this.xOf(flake, time);
      if (flake.y + flake.size / 2 < this.bank.surfaceAt(x)) continue;

      this.bank.add(x, (FLAKE_VOLUME * flake.size) / 5, 28);
      Object.assign(flake, this.create(-flake.size - Math.random() * 60));
    }
  }

  // Draw before the snowbank, so the flakes disappear into it as they land
  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (const flake of this.flakes) {
      ctx.globalAlpha = flake.opacity;
      ctx.beginPath();
      ctx.arc(this.xOf(flake, time), flake.y, flake.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private xOf(flake: Flake, time: number) {
    return flake.x + Math.sin(time * flake.swaySpeed + flake.phase) * flake.sway;
  }

  private create(y: number): Flake {
    const size = 2 + Math.random() ** 2 * 8;
    return {
      x: Math.random() * this.width,
      y,
      size,
      speed: 20 + size * 5 + Math.random() * 15,
      sway: 6 + Math.random() * 24,
      swaySpeed: 0.3 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      opacity: 0.35 + Math.random() * 0.65,
    };
  }
}
