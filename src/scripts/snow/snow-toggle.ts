import { isSnowOff, onSnowOffChange, setSnowOff } from './setting';

// <snow-toggle><button role="switch">…</button></snow-toggle>
// Turns the snow off (hidden entirely) and back on. The button is checked while it's
// snowing, and the element is marked data-off while it isn't, for styling. A custom element, so
// it wires itself up again as the client router swaps pages, and stays in step with the setting.
class SnowToggle extends HTMLElement {
  private stop?: () => void;

  connectedCallback() {
    const button = this.querySelector('button');
    if (!button) return;

    const render = () => {
      const off = isSnowOff();
      this.toggleAttribute('data-off', off);
      button.setAttribute('aria-checked', String(!off));
    };

    const toggle = () => setSnowOff(!isSnowOff());
    button.addEventListener('click', toggle);
    const unlisten = onSnowOffChange(render);
    render();

    this.stop = () => {
      button.removeEventListener('click', toggle);
      unlisten();
    };
  }

  disconnectedCallback() {
    this.stop?.();
    this.stop = undefined;
  }
}

if (!customElements.get('snow-toggle')) customElements.define('snow-toggle', SnowToggle);
