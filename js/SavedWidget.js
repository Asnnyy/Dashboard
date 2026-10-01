import UIComponent from './UIComponent.js';

export default class SavedWidget extends UIComponent {
  constructor(config = {}) {
    super({ title: 'Saved / Places', ...config });
    this.saved = JSON.parse(localStorage.getItem('dining-saved') || '[]');
  }

  render() {
    const wrapper = this.createShell();
    this.list = document.createElement('div');
    this.list.className = 'saved-list';
    wrapper.append(this.list);
    this.renderData();

    this.addListener(window, 'dining:saved', () => {
      this.saved = JSON.parse(localStorage.getItem('dining-saved') || '[]');
      this.renderData();
    });
    return wrapper;
  }

  renderData() {
    this.list.replaceChildren();
    if (!this.saved.length) {
      const message = document.createElement('p');
      message.className = 'state-message';
      message.textContent = 'NO SAVED PLACES YET';
      this.list.append(message);
      return;
    }

    this.saved.slice(0, 5).forEach((place, index) => {
      const item = document.createElement('div');
      item.className = 'saved-item';
      const number = document.createElement('span');
      number.className = 'row-index';
      number.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('span');
      name.textContent = place.name;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'row-action';
      remove.textContent = 'REMOVE';
      this.addListener(remove, 'click', () => {
        this.saved = this.saved.filter((entry) => entry.id !== place.id);
        localStorage.setItem('dining-saved', JSON.stringify(this.saved));
        this.renderData();
      });
      item.append(number, name, remove);
      this.list.append(item);
    });
  }
}
