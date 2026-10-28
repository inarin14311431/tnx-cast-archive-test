// A very small stand-in for the DOM, just enough for the generator's scene selector (no jsdom in this repo).
// Elements keep children and listeners, a <select> normalises its value to one of its options like the browser does,
// and dispatchEvent calls the listeners of that element.
export class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.dataset = {};
    this.className = "";
    this.hidden = false;
    this.textContent = "";
    this.nodes = [];
    this.listeners = new Map();
    this._value = "";
  }
  get children() { return this.nodes.filter(node => node instanceof FakeElement); }
  get options() { return this.tagName === "SELECT" ? this.children.filter(child => child.tagName === "OPTION") : []; }
  get value() { return this._value; }
  set value(next) {
    const text = String(next);
    this._value = this.tagName === "SELECT" && !this.options.some(option => option.value === text) ? "" : text;
  }
  append(...items) { this.nodes.push(...items); if (this.tagName === "SELECT" && !this._value && this.options.length) this._value = this.options[0].value; }
  replaceChildren(...items) { this.nodes = [...items]; if (this.tagName === "SELECT") this._value = this.options[0]?.value ?? ""; }
  addEventListener(type, listener) { this.listeners.set(type, [...(this.listeners.get(type) || []), listener]); }
  dispatchEvent(event) { for (const listener of this.listeners.get(event.type) || []) listener.call(this, event); return true; }
  querySelectorAll(selector) {
    const match = selector.match(/^select\[data-scene-frame\]$/) ? node => node.tagName === "SELECT" && "sceneFrame" in node.dataset : () => false;
    const found = [];
    const walk = element => { for (const child of element.children) { if (match(child)) found.push(child); walk(child); } };
    walk(this);
    return found;
  }
}

export function createFakeDocument() {
  const doc = { createElement: tag => new FakeElement(tag, doc) };
  return doc;
}
