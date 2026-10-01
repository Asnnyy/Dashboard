import UIComponent from './UIComponent.js';

export default class PlansWidget extends UIComponent {
  constructor(config = {}) {
    super({ title: 'Dining / Plans', ...config });
    this.plans = JSON.parse(localStorage.getItem('dining-plans') || '[]');
  }

  render() {
    const wrapper = this.createShell();
    const form = document.createElement('form');
    form.className = 'plan-form';
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'ADD A DINING PLAN';
    input.setAttribute('aria-label', 'Новый план');
    const add = document.createElement('button');
    add.type = 'submit';
    add.className = 'outline-button';
    add.textContent = 'ADD';
    form.append(input, add);

    this.list = document.createElement('div');
    this.list.className = 'plans-list';
    wrapper.append(form, this.list);

    this.addListener(form, 'submit', (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      this.plans.push({ id: crypto.randomUUID(), text, done: false });
      input.value = '';
      this.save();
      this.renderData();
      input.focus();
    });

    this.renderData();
    return wrapper;
  }

  renderData() {
    this.list.replaceChildren();
    this.plans.forEach((plan, index) => {
      const item = document.createElement('div');
      item.className = `plan-item${plan.done ? ' is-done' : ''}`;
      const number = document.createElement('span');
      number.className = 'row-index';
      number.textContent = String(index + 1).padStart(2, '0');
      const text = document.createElement('span');
      text.textContent = plan.text;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.className = 'row-action';
      toggle.textContent = plan.done ? 'DONE' : 'OPEN';
      toggle.setAttribute('aria-label', `Изменить статус ${plan.text}`);
      this.addListener(toggle, 'click', () => {
        plan.done = !plan.done;
        this.save();
        this.renderData();
      });
      item.append(number, text, toggle);
      this.list.append(item);
    });
  }

  save() {
    localStorage.setItem('dining-plans', JSON.stringify(this.plans));
  }
}
