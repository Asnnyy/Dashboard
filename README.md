// WHERE TO EAT

Dashboard для подбора ресторана.

// Запуск без localhost

Откройте `index.html` двойным кликом. В браузере не используются ES-модули, поэтому проект работает как обычный `file://` документ.

// OOP

Рабочий standalone-вариант содержит классы `UIComponent`, `WeatherWidget`, `RestaurantWidget`, `CuisineWidget`, `SavedWidget`, `PlansWidget` и `Dashboard` в `main.js`. Используются ES6+ классы, стрелочные функции, деструктуризация, async/await, Map, optional chaining и template literals.


// API

- Open-Meteo — текущая погода и прогноз.
- OpenStreetMap Overpass — рестораны и кафе.

Если API недоступен при открытии файла, интерфейс не ломается: виджет показывает состояние ошибки или демонстрационные данные.
