import { Snowbank } from './snowbank';
import { Snowfall } from './snowfall';
import { SnowballFight } from './snowball-fight';

// <snow-scene data-logo="..."><canvas></canvas></snow-scene>
// A custom element, so the scene starts and stops as the client router swaps pages.
class SnowScene extends HTMLElement {
  private stop?: () => void;

  connectedCallback() {
    const canvas = this.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const logo = new Image();
    logo.src = this.dataset.logo ?? '';

    const bank = new Snowbank();
    const snowfall = new Snowfall(bank, logo);
    const fight = new SnowballFight(bank);
    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      if (animate) snowfall.draw(ctx, time);
      bank.draw(ctx, time);
      fight.draw(ctx, time);
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      bank.resize(width, height);
      snowfall.resize(width, height);
      fight.resize(width, height);
      if (!animate) draw(0);
    };

    const tick = (now: number) => {
      // Cap the step so a backgrounded tab doesn't come back to a blizzard
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      snowfall.update(dt, now / 1000);
      fight.update(dt);
      bank.settle(dt);
      draw(now / 1000);
      frame = requestAnimationFrame(tick);
    };

    resize();
    window.addEventListener('resize', resize);
    if (animate) frame = requestAnimationFrame(tick);

    this.stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }

  disconnectedCallback() {
    this.stop?.();
    this.stop = undefined;
  }
}

customElements.define('snow-scene', SnowScene);
