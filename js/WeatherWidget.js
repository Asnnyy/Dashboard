import UIComponent from './UIComponent.js';

const CITY = { name: 'Санкт‑Петербург', latitude: 59.9386, longitude: 30.3141 };

const weatherLabels = {
  0: 'CLEAR SKY', 1: 'MOSTLY CLEAR', 2: 'PARTLY CLOUDY', 3: 'OVERCAST',
  45: 'FOG', 48: 'FOG', 51: 'DRIZZLE', 53: 'DRIZZLE', 55: 'DRIZZLE',
  61: 'LIGHT RAIN', 63: 'RAIN', 65: 'HEAVY RAIN', 71: 'SNOW', 73: 'SNOW',
  75: 'HEAVY SNOW', 80: 'SHOWERS', 81: 'SHOWERS', 82: 'HEAVY SHOWERS',
  95: 'THUNDERSTORM', 96: 'THUNDERSTORM', 99: 'THUNDERSTORM'
};

export default class WeatherWidget extends UIComponent {
  constructor(config = {}) {
    super({ title: 'Weather / Live', ...config });
    this.controller = null;
    this.data = null;
  }

  async load() {
    this.controller?.abort();
    this.controller = new AbortController();
    this.setStatus('LOADING WEATHER…', 'loading');

    const url = new URL('https://api.open-meteo.com/v1/forecast');
    url.searchParams.set('latitude', CITY.latitude);
    url.searchParams.set('longitude', CITY.longitude);
    url.searchParams.set('current', 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m');
    url.searchParams.set('hourly', 'temperature_2m,precipitation_probability');
    url.searchParams.set('forecast_hours', '6');
    url.searchParams.set('timezone', 'Europe/Moscow');

    try {
      const response = await fetch(url, { signal: this.controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (!data.current || !Array.isArray(data.hourly?.time)) throw new Error('Invalid API response');
      this.data = data;
      this.renderData();
    } catch (error) {
      if (error.name === 'AbortError') return;
      this.renderError();
    }
  }

  render() {
    const wrapper = this.createShell();
    this.content = document.createElement('div');
    this.content.className = 'weather-content';
    wrapper.append(this.content);
    return wrapper;
  }

  renderData() {
    this.content.replaceChildren();
    const current = this.data.current;

    const hero = document.createElement('div');
    hero.className = 'weather-hero';

    const temp = document.createElement('div');
    temp.className = 'weather-temp';
    temp.textContent = `${Math.round(current.temperature_2m)}°`;

    const condition = document.createElement('div');
    condition.className = 'weather-condition';
    condition.textContent = weatherLabels[current.weather_code] ?? 'WEATHER UPDATE';

    hero.append(temp, condition);

    const meta = document.createElement('div');
    meta.className = 'metric-row';
    this.addMetric(meta, 'FEELS LIKE', `${Math.round(current.apparent_temperature)}°`);
    this.addMetric(meta, 'WIND', `${Math.round(current.wind_speed_10m)} KM/H`);

    const forecast = document.createElement('div');
    forecast.className = 'mini-forecast';
    this.data.hourly.time.slice(0, 6).forEach((time, index) => {
      const item = document.createElement('div');
      item.className = 'forecast-item';
      const hour = document.createElement('span');
      hour.textContent = new Date(time).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const value = document.createElement('strong');
      value.textContent = `${Math.round(this.data.hourly.temperature_2m[index])}°`;
      item.append(hour, value);
      forecast.append(item);
    });

    this.content.append(hero, meta, forecast);
    this.setStatus('', 'success');
  }

  addMetric(parent, label, value) {
    const block = document.createElement('div');
    const labelElement = document.createElement('span');
    labelElement.textContent = label;
    const valueElement = document.createElement('strong');
    valueElement.textContent = value;
    block.append(labelElement, valueElement);
    parent.append(block);
  }

  renderError() {
    this.content.replaceChildren();
    const message = document.createElement('p');
    message.className = 'state-message';
    message.textContent = 'WEATHER DATA UNAVAILABLE';
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
