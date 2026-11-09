// A very small stand-in for the DOM, just enough for the generator's scene selector (no jsdom in this repo).
// Elements keep children and listeners, a <select> normalises its value to one of its options like the browser does,
// and dispatchEvent calls the listeners of that element.
export class FakeElement {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.dataset = {};
    this.attributes = {};
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
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return name in this.attributes ? this.attributes[name] : null; }
  removeAttribute(name) { delete this.attributes[name]; }
  click() { this.dispatchEvent({ type: "click" }); }
  // Supports "tag[data-attr]", "[data-attr]" and "tag[data-attr]" with a camel-cased dataset key, which is all the generator's selector needs.
  querySelectorAll(selector) {
    const parsed = selector.match(/^([a-z]*)\[(data-[a-z-]+)\]$/);
    const key = parsed ? parsed[2].slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase()) : "";
    const match = parsed ? node => (!parsed[1] || node.tagName === parsed[1].toUpperCase()) && key in node.dataset : () => false;
    const found = [];
    const walk = element => { for (const child of element.children) { if (match(child)) found.push(child); walk(child); } };
    walk(this);
    return found;
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] ?? null; }
}

export function createFakeDocument() {
  const doc = { createElement: tag => new FakeElement(tag, doc) };
  return doc;
}
