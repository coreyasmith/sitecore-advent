import { Snowbank } from './snowbank';
import { Snowfall } from './snowfall';
import { SnowballFight } from './snowball-fight';

// <snow-scene data-snowbank><canvas></canvas></snow-scene>
// Snow falling over the page. With data-snowbank it piles up in a snowbank along the bottom of the
// window, with a snowball fight on top; without it, it falls on past the bottom. A custom element,
// so the scene starts and stops as the client router swaps pages.
class SnowScene extends HTMLElement {
  private stop?: () => void;

  connectedCallback() {
    const canvas = this.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = performance.now();

    // Without a snowbank, the snow lands just past the bottom of the window and starts over
    const bank = this.hasAttribute('data-snowbank') ? new Snowbank() : null;
    const fight = bank && new SnowballFight(bank);
    const snowfall = new Snowfall(bank ?? { surfaceAt: () => height + 10, add: () => {} });

    // The bank stays below the element data-keep-clear names (Cookie settings, the footer's
    // lowest line, under its GitHub link). It's measured from the bottom of the page because the
    // canvas is pinned to the window: that's how far up the window it sits at the end of the page.
    const clear = this.dataset.keepClear ? document.querySelector(this.dataset.keepClear) : null;
    const keepClear = () => {
      if (!clear || !bank) return;
      const rect = clear.getBoundingClientRect();
      const above = document.documentElement.scrollHeight - (rect.bottom + window.scrollY);
      bank.keepBelow(above - 6);
    };

    const draw = (time: number) => {
      ctx.clearRect(0, 0, width, height);
      if (animate) snowfall.draw(ctx, time);
      bank?.draw(ctx, time);
      fight?.draw(ctx, time);
    };

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      bank?.resize(width, height);
      keepClear();
      snowfall.resize(width, height);
      fight?.resize(width, height);
      if (!animate) draw(0);
    };

    const tick = (now: number) => {
      // Cap the step so a backgrounded tab doesn't come back to a blizzard
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      snowfall.update(dt, now / 1000);
      fight?.update(dt);
      bank?.settle(dt);
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
