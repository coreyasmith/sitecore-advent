// Width of each column in the snowbank's height map, in CSS pixels
const COLUMN = 4;
const MIN_DEPTH = 6;

interface Sparkle {
  x: number;
  depth: number;
  phase: number;
  speed: number;
}

// The snow along the bottom of the screen. Falling snow adds to it, snowball makers dig into it.
export class Snowbank {
  private depths = new Float32Array(0);
  private sparkles: Sparkle[] = [];
  private width = 0;
  private height = 0;
  private maxDepth = 0;

  resize(width: number, height: number) {
    const count = Math.ceil(width / COLUMN) + 2;
    const previous = this.depths;
    const depths = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      if (previous.length) {
        // Stretch the existing snow to the new width
        const f = (i / (count - 1)) * (previous.length - 1);
        const j = Math.floor(f);
        const k = Math.min(j + 1, previous.length - 1);
        depths[i] = previous[j] + (previous[k] - previous[j]) * (f - j);
      } else {
        const x = i * COLUMN;
        depths[i] = 12 + Math.sin(x / 140) * 4 + Math.sin(x / 53 + 1) * 2;
      }
    }

    this.depths = depths;
    this.width = width;
    this.height = height;
    this.maxDepth = Math.max(36, Math.min(80, height * 0.1));
    this.sparkles = Array.from({ length: Math.round(width / 40) }, () => ({
      x: Math.random() * width,
      depth: 0.15 + Math.random() * 0.6,
      phase: Math.random() * Math.PI * 2,
      speed: 0.5 + Math.random() * 1.5,
    }));
  }

  depthAt(x: number) {
    const last = this.depths.length - 1;
    const f = Math.max(0, Math.min(last, x / COLUMN));
    const i = Math.floor(f);
    const j = Math.min(i + 1, last);
    return this.depths[i] + (this.depths[j] - this.depths[i]) * (f - i);
  }

  surfaceAt(x: number) {
    return this.height - this.depthAt(x);
  }

  // Piles `volume` square pixels of snow in a mound `radius` pixels either side of x.
  // The deeper the snow, the less settles, so the bank levels off at its maximum depth.
  add(x: number, volume: number, radius: number) {
    this.spread(x, volume, radius, (depth, amount) => depth + amount * Math.max(0, 1 - depth / this.maxDepth));
  }

  remove(x: number, volume: number, radius: number) {
    this.spread(x, volume, radius, (depth, amount) => Math.max(MIN_DEPTH, depth - amount));
  }

  // Slowly evens out the surface so landings blend into gentle drifts
  settle(dt: number) {
    const depths = this.depths;
    const rate = Math.min(0.25, dt * 0.8);
    let previous = depths[0];
    for (let i = 1; i < depths.length - 1; i++) {
      const current = depths[i];
      depths[i] += rate * (previous + depths[i + 1] - 2 * current);
      previous = current;
    }
    depths[0] = depths[1];
    depths[depths.length - 1] = depths[depths.length - 2];
  }

  draw(ctx: CanvasRenderingContext2D, time: number) {
    const { width, height, depths } = this;

    ctx.beginPath();
    ctx.moveTo(0, height);
    for (let i = 0; i < depths.length; i++) {
      ctx.lineTo(i * COLUMN, height - depths[i]);
    }
    ctx.lineTo(width + COLUMN, height);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(0, height - this.maxDepth, 0, height);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(1, '#cfe0f0');
    ctx.save();
    ctx.shadowColor = 'rgba(200, 225, 255, 0.6)';
    ctx.shadowBlur = 14;
    ctx.fillStyle = gradient;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 1.2;
    for (const sparkle of this.sparkles) {
      const twinkle = Math.sin(time * sparkle.speed + sparkle.phase);
      if (twinkle < 0.75) continue;
      const size = 3 * ((twinkle - 0.75) / 0.25);
      const y = this.surfaceAt(sparkle.x) + this.depthAt(sparkle.x) * sparkle.depth;
      ctx.strokeStyle = `rgba(120, 170, 255, ${size / 3})`;
      ctx.beginPath();
      ctx.moveTo(sparkle.x - size, y);
      ctx.lineTo(sparkle.x + size, y);
      ctx.moveTo(sparkle.x, y - size);
      ctx.lineTo(sparkle.x, y + size);
      ctx.stroke();
    }
    ctx.restore();
  }

  private spread(x: number, volume: number, radius: number, apply: (depth: number, amount: number) => number) {
    const columns = Math.max(1, radius / COLUMN);
    const centre = x / COLUMN;
    const from = Math.max(0, Math.floor(centre - columns));
    const to = Math.min(this.depths.length - 1, Math.ceil(centre + columns));
    // A triangle of weights that sums to about `columns`, so the mound holds `volume` in total
    for (let i = from; i <= to; i++) {
      const weight = 1 - Math.abs(i - centre) / columns;
      if (weight > 0) {
        this.depths[i] = apply(this.depths[i], ((volume / COLUMN) * weight) / columns);
      }
    }
  }
}
