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
  logo: boolean;
  angle: number;
  spin: number;
}

interface SettledLogo {
  x: number;
  y: number;
  size: number;
  angle: number;
  opacity: number;
  age: number;
}

// Snow each landing flake adds to the bank, in square pixels for a 5px flake
const FLAKE_VOLUME = 90;
const LOGO_LIFE = 30;
const MAX_SETTLED_LOGOS = 12;
const LOGO_ASPECT = 457.795 / 481.172;

// Snowflakes and Sitecore logos falling onto the snowbank
export class Snowfall {
  private flakes: Flake[] = [];
  private settled: SettledLogo[] = [];
  private width = 0;

  constructor(private bank: Snowbank, private logo: HTMLImageElement) {}

  resize(width: number, height: number) {
    this.width = width;
    const count = Math.round(Math.min(160, Math.max(40, width / 10)));
    if (this.flakes.length === count) {
      for (const flake of this.flakes) flake.x %= width;
      return;
    }
    const logos = Math.round(count / 9);
    this.flakes = Array.from({ length: count }, (_, i) => this.create(i < logos, Math.random() * height));
  }

  update(dt: number, time: number) {
    for (const flake of this.flakes) {
      flake.y += flake.speed * dt;
      flake.angle += flake.spin * dt;
      const x = this.xOf(flake, time);
      // Logos sink a little way into the snow
      const bottom = flake.y + (flake.logo ? flake.size * 0.2 : flake.size / 2);
      if (bottom < this.bank.surfaceAt(x)) continue;

      if (flake.logo) {
        this.settle(flake, x);
      } else {
        this.bank.add(x, (FLAKE_VOLUME * flake.size) / 5, 28);
      }
      Object.assign(flake, this.create(flake.logo, -flake.size - Math.random() * 60));
    }

    for (const logo of this.settled) logo.age += dt;
    this.settled = this.settled.filter((logo) => logo.age < LOGO_LIFE);
  }

  // Draw before the snowbank, so settled logos are buried as the snow deepens
  draw(ctx: CanvasRenderingContext2D, time: number) {
    ctx.save();
    ctx.fillStyle = '#ffffff';
    for (const flake of this.flakes) {
      if (flake.logo) continue;
      ctx.globalAlpha = flake.opacity;
      ctx.beginPath();
      ctx.arc(this.xOf(flake, time), flake.y, flake.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    if (!this.logo.complete || !this.logo.naturalWidth) return;
    for (const flake of this.flakes) {
      if (flake.logo) this.drawLogo(ctx, this.xOf(flake, time), flake.y, flake.size, flake.angle, flake.opacity);
    }
    for (const logo of this.settled) {
      const fade = Math.min(1, (LOGO_LIFE - logo.age) / 3);
      this.drawLogo(ctx, logo.x, logo.y, logo.size, logo.angle, logo.opacity * fade);
    }
  }

  private drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, angle: number, opacity: number) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(this.logo, (-size * LOGO_ASPECT) / 2, -size / 2, size * LOGO_ASPECT, size);
    ctx.restore();
  }

  private settle(flake: Flake, x: number) {
    this.settled.push({ x, y: flake.y, size: flake.size, angle: flake.angle, opacity: flake.opacity, age: 0 });
    // Fade out the oldest logos rather than letting them pile up
    const excess = this.settled.length - MAX_SETTLED_LOGOS;
    for (let i = 0; i < excess; i++) {
      this.settled[i].age = Math.max(this.settled[i].age, LOGO_LIFE - 3);
    }
  }

  private xOf(flake: Flake, time: number) {
    return flake.x + Math.sin(time * flake.swaySpeed + flake.phase) * flake.sway;
  }

  private create(logo: boolean, y: number): Flake {
    const size = logo ? 12 + Math.random() * 14 : 2 + Math.random() ** 2 * 8;
    return {
      x: Math.random() * this.width,
      y,
      size,
      speed: logo ? 30 + Math.random() * 20 : 20 + size * 5 + Math.random() * 15,
      sway: 6 + Math.random() * 24,
      swaySpeed: 0.3 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
      opacity: logo ? 0.7 + Math.random() * 0.3 : 0.35 + Math.random() * 0.65,
      logo,
      angle: (Math.random() - 0.5) * 0.8,
      spin: (Math.random() - 0.5) * 1.2,
    };
  }
}
