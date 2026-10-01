import UIComponent from './UIComponent.js';

const SPB_BBOX = '59.80,30.10,60.10,30.55';
const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export default class RestaurantWidget extends UIComponent {
  constructor(config = {}) {
    super({ title: 'Restaurants / Nearby', ...config });
    this.controller = null;
    this.restaurants = [];
    this.limit = 8;
  }

  async load() {
    this.controller?.abort();
    this.controller = new AbortController();
    this.setStatus('SEARCHING RESTAURANTS…', 'loading');

    const query = `[out:json][timeout:20];(nwr[amenity=restaurant](${SPB_BBOX});nwr[amenity=cafe](${SPB_BBOX}););out center tags;`;

    try {
      const response = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        body: new URLSearchParams({ data: query }),
        signal: this.controller.signal
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      this.restaurants = data.elements
        .map((item) => ({
          id: `${item.type}-${item.id}`,
          name: item.tags?.name,
          cuisine: item.tags?.cuisine,
          address: [item.tags?.['addr:street'], item.tags?.['addr:housenumber']].filter(Boolean).join(', '),
          lat: item.lat ?? item.center?.lat,
          lon: item.lon ?? item.center?.lon,
          opening: item.tags?.opening_hours
        }))
        .filter((place) => place.name && Number.isFinite(place.lat) && Number.isFinite(place.lon))
        .slice(0, this.limit);

      if (!this.restaurants.length) {
        this.renderEmpty();
        return;
      }

      this.renderData();
      window.dispatchEvent(new CustomEvent('dining:restaurants', { detail: this.restaurants }));
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.renderError();
    }
  }

  render() {
    const wrapper = this.createShell();
    this.list = document.createElement('div');
    this.list.className = 'restaurant-list';
    wrapper.append(this.list);
    return wrapper;
  }

  renderData() {
    this.list.replaceChildren();
    this.restaurants.forEach((place, index) => {
      const article = document.createElement('article');
      article.className = 'restaurant-row';

      const number = document.createElement('span');
      number.className = 'row-index';
      number.textContent = String(index + 1).padStart(2, '0');

      const info = document.createElement('div');
      info.className = 'restaurant-info';
      const name = document.createElement('h3');
      name.textContent = place.name;
      const meta = document.createElement('p');
      meta.textContent = [place.cuisine?.replaceAll(';', ' · '), place.address || 'ADDRESS N/A'].filter(Boolean).join(' · ').toUpperCase();
      info.append(name, meta);

      const save = document.createElement('button');
      save.type = 'button';
      save.className = 'row-action';
      save.textContent = 'SAVE';
      save.setAttribute('aria-label', `Сохранить ${place.name}`);
      this.addListener(save, 'click', () => {
        const saved = JSON.parse(localStorage.getItem('dining-saved') || '[]');
        if (!saved.some((item) => item.id === place.id)) saved.push(place);
        localStorage.setItem('dining-saved', JSON.stringify(saved));
        save.textContent = 'SAVED';
        window.dispatchEvent(new CustomEvent('dining:saved'));
      });

      article.append(number, info, save);
      this.list.append(article);
    });
    this.setStatus('', 'success');
  }

  renderEmpty() {
    this.list.replaceChildren();
    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'NO PLACES FOUND';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'outline-button';
    retry.textContent = 'RETRY';
    this.addListener(retry, 'click', () => this.load());
    this.list.append(message, retry);
    this.setStatus('EMPTY RESULT', 'empty');
  }

  renderError() {
    this.list.replaceChildren();
    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'RESTAURANT DATA UNAVAILABLE';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'outline-button';
    retry.textContent = 'RETRY';
    this.addListener(retry, 'click', () => this.load());
    this.list.append(message, retry);
    this.setStatus('REQUEST ERROR', 'error');
  }

  destroy() {
    this.controller?.abort();
    this.controller = null;
    super.destroy();
  }
}
