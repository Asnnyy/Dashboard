/* DINING CITY — standalone build.
   Opens directly from index.html (file://) without ES module imports.
   The project still uses ES6+ classes, arrow functions, destructuring and async/await.
*/

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const makeId = () => `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`;

class UIComponent {
  constructor({ id = makeId(), title = 'Widget' } = {}) {
    this.id = id;
    this.title = title;
    this.root = null;
    this.abortController = null;
    this.listeners = [];
  }

  render() {
    if (this.root) return this.root;
    const element = document.createElement('article');
    element.className = 'widget';
    element.dataset.widgetId = this.id;
    element.innerHTML = `
      <header class="widget__header">
        <h3 class="widget__title">${this.title}</h3>
        <div class="widget__actions">
          <button class="icon-button" data-action="minimize" type="button" aria-label="Свернуть">−</button>
          <button class="icon-button" data-action="remove" type="button" aria-label="Удалить">×</button>
        </div>
      </header>
      <div class="widget__body"></div>
      <div class="widget-status" data-status="idle"></div>`;
    this.root = element;
    this.bindShellActions();
    return element;
  }

  bindShellActions() {
    const minimize = $('[data-action="minimize"]', this.root);
    const remove = $('[data-action="remove"]', this.root);
    const onMinimize = () => this.root.classList.toggle('is-minimized');
    const onRemove = () => this.emitRemove?.();
    minimize.addEventListener('click', onMinimize);
    remove.addEventListener('click', onRemove);
    this.listeners.push(
      [minimize, 'click', onMinimize],
      [remove, 'click', onRemove]
    );
  }

  body() { return $('.widget__body', this.root); }
  status(message = '', type = 'idle') {
    const node = $('.widget-status', this.root);
    node.textContent = message;
    node.dataset.status = type;
  }

  onRemove(callback) { this.emitRemove = callback; }

  listen(element, event, handler) {
    element.addEventListener(event, handler);
    this.listeners.push([element, event, handler]);
  }

  destroy() {
    this.abortController?.abort();
    this.listeners.forEach(([element, event, handler]) => element.removeEventListener(event, handler));
    this.listeners = [];
    this.root?.remove();
    this.root = null;
  }
}

class WeatherWidget extends UIComponent {
  constructor(config = {}) { super({ ...config, title: 'Weather / St. Petersburg' }); }

  render() {
    const root = super.render();
    this.body().innerHTML = `
      <div class="weather-content">
        <div class="weather-hero"><span class="weather-temp">—°</span><span class="weather-condition">LOADING</span></div>
        <div class="metric-row"><div><span>WIND</span><strong>— m/s</strong></div><div><span>HUMIDITY</span><strong>—%</strong></div></div>
        <div class="mini-forecast"></div>
      </div>`;
    return root;
  }

  async load() {
    this.render();
    this.status('LOADING WEATHER…', 'loading');
    this.abortController = new AbortController();
    try {
      const url = 'https://api.open-meteo.com/v1/forecast?latitude=59.9386&longitude=30.3141&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=6&timezone=Europe%2FMoscow';
      const response = await fetch(url, { signal: this.abortController.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const { current, daily } = data;
      $('.weather-temp', this.root).textContent = `${Math.round(current.temperature_2m)}°`;
      $('.weather-condition', this.root).textContent = 'ST. PETERSBURG / CURRENT';
      const metrics = $$('.metric-row strong', this.root);
      metrics[0].textContent = `${Math.round(current.wind_speed_10m)} m/s`;
      metrics[1].textContent = `${Math.round(current.relative_humidity_2m)}%`;
      $('.mini-forecast', this.root).innerHTML = daily.time.map((date, i) => `
        <div class="forecast-item"><span>${new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}</span><strong>${Math.round(daily.temperature_2m_max[i])}° / ${Math.round(daily.temperature_2m_min[i])}°</strong></div>`).join('');
      this.status('', 'success');
    } catch (error) {
      if (error.name === 'AbortError') return;
      $('.weather-condition', this.root).textContent = 'DATA UNAVAILABLE';
      this.status('API UNAVAILABLE — DASHBOARD STILL WORKS', 'error');
    }
  }
}

class RestaurantWidget extends UIComponent {
  constructor(config = {}) { super({ ...config, title: 'Restaurants / Nearby' }); }

  render() {
    const root = super.render();
    this.body().innerHTML = '<div class="restaurant-list"></div>';
    return root;
  }

  async load() {
    this.render();
    this.status('LOADING RESTAURANTS…', 'loading');
    this.abortController = new AbortController();
    const query = `[out:json][timeout:12];(nwr[amenity=restaurant](around:3500,59.9386,30.3141);nwr[amenity=cafe](around:3500,59.9386,30.3141););out center tags 12;`;
    try {
      const response = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST', body: query, signal: this.abortController.signal,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const { elements = [] } = await response.json();
      const places = elements.filter(({ tags }) => tags?.name).slice(0, 7);
      if (!places.length) throw new Error('EMPTY');
      $('.restaurant-list', this.root).replaceChildren(...places.map((place, index) => {
        const row = document.createElement('div');
        row.className = 'restaurant-row';
        const tags = place.tags ?? {};
        const name = tags.name;
        const cuisine = tags.cuisine || 'restaurant';
        row.innerHTML = `<span class="row-index">0${index + 1}</span><div class="restaurant-info"><h3></h3><p></p></div><button class="row-action" type="button">SAVE</button>`;
        $('.restaurant-info h3', row).textContent = name;
        $('.restaurant-info p', row).textContent = cuisine;
        const save = $('.row-action', row);
        this.listen(save, 'click', () => {
          const saved = JSON.parse(localStorage.getItem('dining-city-saved') || '[]');
          if (!saved.includes(name)) saved.push(name);
          localStorage.setItem('dining-city-saved', JSON.stringify(saved));
          save.textContent = 'SAVED';
        });
        return row;
      }));
      this.status('', 'success');
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.renderFallback();
      this.status('LIVE API UNAVAILABLE — SAMPLE DATA SHOWN', 'error');
    }
  }

  renderFallback() {
    const sample = [
      ['01', 'North Kitchen', 'modern / local'],
      ['02', 'Market 24', 'asian / street food'],
      ['03', 'Nevsky Table', 'european / cafe'],
      ['04', 'Fontanka House', 'russian / seasonal'],
      ['05', 'Island Coffee', 'coffee / bakery']
    ];
    const list = $('.restaurant-list', this.root);
    list.replaceChildren(...sample.map(([index, name, type]) => {
      const row = document.createElement('div'); row.className = 'restaurant-row';
      row.innerHTML = `<span class="row-index">${index}</span><div class="restaurant-info"><h3></h3><p></p></div><button class="row-action" type="button">SAVE</button>`;
      $('.restaurant-info h3', row).textContent = name; $('.restaurant-info p', row).textContent = type;
      const save = $('.row-action', row);
      this.listen(save, 'click', () => {
        const saved = JSON.parse(localStorage.getItem('dining-city-saved') || '[]');
        if (!saved.includes(name)) saved.push(name);
        localStorage.setItem('dining-city-saved', JSON.stringify(saved)); save.textContent = 'SAVED';
      });
      return row;
    }));
  }
}

class CuisineWidget extends UIComponent {
  constructor(config = {}) { super({ ...config, title: 'Cuisine / City Mix' }); }
  render() {
    const root = super.render();
    const values = [['EUROPEAN', 82], ['ASIAN', 68], ['RUSSIAN', 57], ['ITALIAN', 49], ['CAFE', 42]];
    this.body().innerHTML = `<div class="cuisine-content">${values.map(([name, value], i) => `<div class="cuisine-row ${i === values.length - 1 ? 'is-last' : ''}"><span>${name}</span><span class="cuisine-bar"><i style="width:${value}%"></i></span><strong>${value}</strong></div>`).join('')}</div>`;
    return root;
  }
}

class SavedWidget extends UIComponent {
  constructor(config = {}) { super({ ...config, title: 'Saved / Places' }); }
  render() {
    const root = super.render();
    const saved = JSON.parse(localStorage.getItem('dining-city-saved') || '[]');
    const list = saved.length ? saved : ['No saved places yet', 'Use SAVE in Restaurants'];
    this.body().innerHTML = `<div class="saved-list">${list.map((name, i) => `<div class="saved-item"><span class="row-index">0${i + 1}</span><span></span><button class="row-action" type="button">REMOVE</button></div>`).join('')}</div>`;
    $$('.saved-item', this.root).forEach((row, i) => {
      $('span:nth-child(2)', row).textContent = list[i];
      this.listen($('.row-action', row), 'click', () => {
        const next = JSON.parse(localStorage.getItem('dining-city-saved') || '[]').filter((item) => item !== list[i]);
        localStorage.setItem('dining-city-saved', JSON.stringify(next)); this.render();
      });
    });
    return root;
  }
}

class PlansWidget extends UIComponent {
  constructor(config = {}) { super({ ...config, title: 'Plans / My Dining Week' }); }
  render() {
    const root = super.render();
    const plans = JSON.parse(localStorage.getItem('dining-city-plans') || '[]');
    this.body().innerHTML = `<form class="plan-form"><input name="plan" placeholder="ADD DINING PLAN…" aria-label="Новый план"><button class="outline-button" type="submit">ADD</button></form><div class="plans-list"></div>`;
    const form = $('.plan-form', this.root);
    this.listen(form, 'submit', (event) => {
      event.preventDefault(); const input = $('input', form); const value = input.value.trim(); if (!value) return;
      const next = [...JSON.parse(localStorage.getItem('dining-city-plans') || '[]'), { text: value, done: false }]; localStorage.setItem('dining-city-plans', JSON.stringify(next)); this.render();
    });
    const list = $('.plans-list', this.root);
    plans.forEach(({ text, done }, i) => {
      const row = document.createElement('div'); row.className = `plan-item${done ? ' is-done' : ''}`;
      row.innerHTML = `<span class="row-index">0${i + 1}</span><span></span><button class="row-action" type="button">${done ? 'OPEN' : 'DONE'}</button>`;
      $('span:nth-child(2)', row).textContent = text;
      this.listen($('.row-action', row), 'click', () => { const next = JSON.parse(localStorage.getItem('dining-city-plans') || '[]'); next[i].done = !next[i].done; localStorage.setItem('dining-city-plans', JSON.stringify(next)); this.render(); });
      list.append(row);
    });
    return root;
  }
}

class Dashboard {
  constructor(container) {
    this.container = container;
    this.widgets = new Map();
    this.registry = { restaurants: RestaurantWidget, weather: WeatherWidget, cuisine: CuisineWidget, saved: SavedWidget, plans: PlansWidget };
  }

  addWidget(type) {
    const WidgetClass = this.registry[type];
    if (!WidgetClass) return null;
    const widget = new WidgetClass({ id: makeId() });
    widget.onRemove(() => this.removeWidget(widget.id));
    this.widgets.set(widget.id, widget);
    this.container.append(widget.render());
    widget.load?.();
    return widget;
  }

  removeWidget(id) {
    const widget = this.widgets.get(id);
    if (!widget) return;
    widget.destroy();
    this.widgets.delete(id);
  }

  clear() {
    [...this.widgets.values()].forEach((widget) => widget.destroy());
    this.widgets.clear();
  }
}

const dashboard = new Dashboard($('#dashboard'));
const updateClock = () => {
  const now = new Date();
  $('#current-time').textContent = now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  $('#current-date').textContent = now.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

$$('[data-add-widget]').forEach((button) => button.addEventListener('click', () => dashboard.addWidget(button.dataset.addWidget)));
$('#reset-dashboard').addEventListener('click', () => {
  dashboard.clear();
  ['weather', 'restaurants', 'cuisine', 'saved', 'plans'].forEach((type) => dashboard.addWidget(type));
});

updateClock();
setInterval(updateClock, 30000);
['weather', 'restaurants', 'cuisine'].forEach((type) => dashboard.addWidget(type));
