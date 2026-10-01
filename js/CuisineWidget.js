import UIComponent from './UIComponent.js';

const SPB_BBOX = '59.80,30.10,60.10,30.55';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export default class CuisineWidget extends UIComponent {
  constructor(config = {}) {
    super({ title: 'Cuisine / City mix', ...config });
    this.controller = null;
    this.cuisines = [];
  }

  async load() {
    this.controller?.abort();
    this.controller = new AbortController();
    this.setStatus('READING CITY DATA…', 'loading');

    const query = `[out:json][timeout:20];nwr[amenity=restaurant][cuisine](${SPB_BBOX});out tags;`;
    try {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: this.controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const counts = new Map();
      data.elements.forEach((item) => {
        const raw = item.tags?.cuisine;
        if (!raw) return;
        raw.split(';').map((entry) => entry.trim()).filter(Boolean).forEach((entry) => {
          const key = entry.replaceAll('_', ' ');
          counts.set(key, (counts.get(key) || 0) + 1);
        });
      });

      this.cuisines = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6);

      if (!this.cuisines.length) {
        this.renderEmpty();
        return;
      }
      this.renderData();
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.renderError();
    }
  }

  render() {
    const wrapper = this.createShell();
    this.content = document.createElement('div');
    this.content.className = 'cuisine-content';
    wrapper.append(this.content);
    return wrapper;
  }

  renderData() {
    this.content.replaceChildren();
    const max = this.cuisines[0][1];
    this.cuisines.forEach(([name, count], index) => {
      const row = document.createElement('div');
      row.className = 'cuisine-row';
      const label = document.createElement('span');
      label.textContent = name.toUpperCase();
      const bar = document.createElement('span');
      bar.className = 'cuisine-bar';
      const fill = document.createElement('i');
      fill.style.width = `${Math.max(12, (count / max) * 100)}%`;
      bar.append(fill);
      const value = document.createElement('strong');
      value.textContent = String(count).padStart(2, '0');
      row.append(label, bar, value);
      this.content.append(row);
      if (index === this.cuisines.length - 1) row.classList.add('is-last');
    });
    this.setStatus('', 'success');
  }

  renderEmpty() {
    this.content.replaceChildren();
    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'NO CUISINE DATA';
    this.content.append(message);
    this.setStatus('EMPTY RESULT', 'empty');
  }

  renderError() {
    this.content.replaceChildren();
    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'ANALYTICS UNAVAILABLE';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'outline-button';
    retry.textContent = 'RETRY';
    this.addListener(retry, 'click', () => this.load());
    this.content.append(message, retry);
    this.setStatus('REQUEST ERROR', 'error');
  }

  destroy() {
    this.controller?.abort();
    this.controller = null;
    super.destroy();
  }
}
