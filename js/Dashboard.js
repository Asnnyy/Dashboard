import RestaurantWidget from './RestaurantWidget.js';
import WeatherWidget from './WeatherWidget.js';
import CuisineWidget from './CuisineWidget.js';
import SavedWidget from './SavedWidget.js';
import PlansWidget from './PlansWidget.js';

const makeId = () => globalThis.crypto?.randomUUID?.() ?? `widget-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default class Dashboard {
  constructor(container) {
    this.container = container;
    this.widgets = new Map();
    this.registry = { restaurants: RestaurantWidget, weather: WeatherWidget, cuisine: CuisineWidget, saved: SavedWidget, plans: PlansWidget };
  }

  addWidget(type) {
    const WidgetClass = this.registry[type];
    if (!WidgetClass) return null;
    const widget = new WidgetClass({ id: makeId() });
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
