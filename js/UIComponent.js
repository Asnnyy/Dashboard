export default class UIComponent {
  constructor({ title = 'Widget', id = globalThis.crypto?.randomUUID?.() ?? `widget-${Date.now()}-${Math.random().toString(16).slice(2)}` } = {}) {
    this.title = title;
    this.id = id;
    this.element = null;
    this.listeners = [];
  }

  createBaseElement() {
    const wrapper = document.createElement('section');
    wrapper.className = 'widget';
    wrapper.dataset.widgetId = this.id;
    this.element = wrapper;
    return wrapper;
  }

  createShell() {
    const wrapper = this.createBaseElement();
    const header = document.createElement('div');
    header.className = 'widget__header';

    const title = document.createElement('h2');
    title.className = 'widget__title';
    title.textContent = this.title;

    const actions = document.createElement('div');
    actions.className = 'widget__actions';

    const minimize = document.createElement('button');
    minimize.type = 'button';
    minimize.className = 'icon-button';
    minimize.textContent = '−';
    minimize.title = 'Свернуть';
    minimize.setAttribute('aria-label', `Свернуть ${this.title}`);
    this.addListener(minimize, 'click', () => this.minimize());

    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'icon-button';
    close.textContent = '×';
    close.title = 'Удалить';
    close.setAttribute('aria-label', `Удалить ${this.title}`);
    this.addListener(close, 'click', () => this.close());

    actions.append(minimize, close);
    header.append(title, actions);
    wrapper.append(header);
    return wrapper;
  }

  addListener(target, event, handler, options) {
    target.addEventListener(event, handler, options);
    this.listeners.push({ target, event, handler, options });
  }

  setStatus(message, type = 'loading') {
    if (!this.element) return;
    let status = this.element.querySelector('.widget-status');
    if (!status) {
      status = document.createElement('div');
      status.className = 'widget-status';
      this.element.append(status);
    }
    status.dataset.status = type;
    status.textContent = message;
  }

  minimize() {
    this.element?.classList.toggle('is-minimized');
  }

  close() {
    this.destroy();
  }

  destroy() {
    this.controller?.abort();
    this.listeners.forEach(({ target, event, handler, options }) => target.removeEventListener(event, handler, options));
    this.listeners = [];
    this.element?.remove();
    this.element = null;
  }
}
