import { Snowbank } from './snowbank';
import { Snowfall } from './snowfall';
import { SnowballFight } from './snowball-fight';
import { isSnowOff, onSnowOffChange } from './setting';

// <snow-scene data-snowbank><canvas></canvas></snow-scene>
// Snow falling over the page. With data-snowbank it piles up in a snowbank along the bottom of the
// window, with a snowball fight on top; without it, it falls on past the bottom. A custom element,
// so the scene starts and stops as the client router swaps pages. It's hidden entirely while the
// visitor has the snow off (see <snow-toggle>) or uses a forced-colors (high contrast) theme,
// which a canvas can't follow. While their system asks for reduced motion, a snowbank's scene
// stands still, without falling snow; without a snowbank that leaves nothing, so it's hidden then
// too. Each of these can change mid-visit.
class SnowScene extends HTMLElement {
  private stop?: () => void;

  connectedCallback() {
    const canvas = this.querySelector('canvas');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const forced = window.matchMedia('(forced-colors: active)');
    let reduce = motion.matches;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    // The scene's own clock, in seconds. It stops while the snow is off, so nothing jumps when
    // it comes back on.
    let clock = 0;

    // Without a snowbank, the snow lands just past the bottom of the window and starts over
    const bank = this.hasAttribute('data-snowbank') ? new Snowbank() : null;
    const fight = bank && new SnowballFight(bank);
    const snowfall = new Snowfall(bank ?? { surfaceAt: () => height + 10, add: () => {} });
    const isOff = () => isSnowOff() || forced.matches || (!bank && motion.matches);

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
      if (!reduce) snowfall.draw(ctx, time);
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
      // Resizing the canvas blanks it, so redraw now rather than flash empty until the next frame
      draw(clock);
    };

    const tick = (now: number) => {
      // Cap the step so a backgrounded tab doesn't come back to a blizzard
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      clock += dt;
      snowfall.update(dt, clock);
      fight?.update(dt);
      bank?.settle(dt);
      draw(clock);
      frame = requestAnimationFrame(tick);
    };

    // Hides the scene while the snow is off, colors are forced, or motion is reduced with no
    // snowbank (data-snow-off on <html> drops the scroll padding kept for it). Otherwise shows it,
    // sized to the window as it is now, and runs it unless the system asks for reduced motion.
    const update = () => {
      const off = isOff();
      reduce = motion.matches;
      this.hidden = off;
      document.documentElement.toggleAttribute('data-snow-off', off);
      cancelAnimationFrame(frame);
      frame = 0;
      if (off) return;
      resize();
      if (reduce) return;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };

    // Nothing to size while hidden: update() sizes it when it's shown again
    const onResize = () => {
      if (!isOff()) resize();
    };

    window.addEventListener('resize', onResize);
    motion.addEventListener('change', update);
    forced.addEventListener('change', update);
    const unlisten = onSnowOffChange(update);
    update();

    this.stop = () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      motion.removeEventListener('change', update);
      forced.removeEventListener('change', update);
      unlisten();
    };
  }

  disconnectedCallback() {
    this.stop?.();
    this.stop = undefined;
  }
}

customElements.define('snow-scene', SnowScene);
