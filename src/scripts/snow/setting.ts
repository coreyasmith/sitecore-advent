// Whether the visitor has turned the snow off. Saved in localStorage so it stays off on other
// pages and later visits; kept in memory too, for when storage is blocked.
const KEY = 'snow-off';
const EVENT = 'snow-off-change';

let off = (() => {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
})();

export const isSnowOff = () => off;

export function setSnowOff(value: boolean) {
  off = value;
  try {
    if (value) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {}
  document.dispatchEvent(new CustomEvent(EVENT));
}

/** Calls `listener` whenever the snow is turned on or off. Returns a function that stops it. */
export function onSnowOffChange(listener: () => void) {
  document.addEventListener(EVENT, listener);
  return () => document.removeEventListener(EVENT, listener);
}
