# Храмы Мостовского района — Research Ledger

Проект: сайт-маршрут по 17 храмам Мостовского района (Гродненская область, Беларусь).
Статусы: researched / confirmed / hypotheses / decisions / implemented / verified.
Источники приоритета: planetabelarus.by (владелец подтвердил), orthos.org, Wikipedia ru/be,
sobory.ru, poshyk.info, ldd.by, OSM Nominatim.

## Сводка по объектам

| # | Slug | Объект | Координаты | История | Фото |
|---|------|--------|-----------|---------|------|
| 1 | mosty-vseh-skorbyaschih | г. Мосты — иконы БМ «Всех скорбящих Радость» (1995) | confirmed (53.4232392, 24.5384966) | hypotheses | gap |
| 2 | mosty-iliinskiy | г. Мосты — пророка Илии (1988) | hypotheses (нет точки OSM) | hypotheses | gap |
| 3 | mosty-sofii-sluckoy | г. Мосты — Софии Слуцкой (стр-во с 2011) | hypotheses (храма может не быть) | hypotheses | gap |
| 4 | pacevichi-rozhdestva | д. Пацевичи — Рождества Пресвятой Богородицы (1867) | confirmed (53.3233392, 24.6928864) | hypotheses | gap |
| 5 | samuilovichi-nikolaya | д. Самуйловичи Дольные — Николая Чудотворца (1801) | hypotheses (центр НП 53.3121134, 24.6956235) | hypotheses | gap |
| 6 | lunno-predtechi | д. Лунно — Рождества Иоанна Предтечи (1889) | confirmed (53.4539090, 24.2600330) | hypotheses | gap |
| 7 | gudevichi-rozhdestva | д. Гудевичи — Рождества Пресвятой Богородицы (1852) | confirmed (53.3681291, 24.1700933) | hypotheses | gap |
| 8 | belavichi-pokrova | д. Белавичи — Покрова Пресвятой Богородицы (1822) | confirmed (53.3274168, 24.5433547) | hypotheses | gap |
| 9 | kurilovichi-troitsy | д. Куриловичи — Святой Живоначальной Троицы (2022) | hypotheses (центр НП 53.3542348, 24.8768328) | hypotheses | gap |
| 10 | cherlena-rozhdestva | д. Черлёна — Рождества Пресвятой Богородицы (1871) | hypotheses (центр НП 53.4995908, 24.2845629) | hypotheses | gap |
| 11 | peski-nikolaya | д. Пески — Николая Чудотворца (1870) | hypotheses (центр НП ~53.355, 24.624) | hypotheses | gap |
| 12 | dubno-nikolaya | д. Дубно — Николая Чудотворца (1844) | hypotheses (центр НП 53.4438088, 24.3769294) | hypotheses | gap |
| 13 | lunno-sv-anna | аг. Лунно — костёл Святой Анны (1782) | confirmed (53.4553706, 24.2616695) | hypotheses | gap |
| 14 | mosty-pravye-ioanna | Мосты Правые — костёл Иоанна Крестителя (1992/1539) | confirmed (53.4303903, 24.6350379) | hypotheses | gap |
| 15 | peski-ruzhentsovoy | аг. Пески — костёл Богоматери Руженцовой (1915) | confirmed (53.3557587, 24.6235994) | hypotheses | gap |
| 16 | bolshaya-rogoznitsa-marii | аг. Большая Рогозница — костёл Девы Марии (1926) | confirmed (53.2747013, 24.6829699) | hypotheses | gap |
| 17 | strubnitsa-troitsky | д. Струбница (Плябановцы) — Свято-Троицкий костёл (1740) | confirmed (53.3275314, 24.5914643) | hypotheses | gap |

## Решения (Decision Gates)
- DG1: репозиторий публичный, GitHub Pages. **решено**
- DG2: ровно 17 объектов; Малые Степанишки, Понижаны, Плодовая — НЕ входят. **решено**
- DG3: контент не урезать; резерв времени — на UI/UX. **решено**
- DG4: слитые метки (Лунно/Пески/Мосты) — дефолт «номера шагов рядом + подпись N храмов», ревью на этапе 5.
- DG5: fallback координат — центр НП с пометкой «уточнить». Открыт до конца этапа 1.

## Источники (проверенные)
- orthos.org/khramy/blagochiniya/mostovskoe-blagochinie/ — 12 православных приходов
- sobory.ru/geo/distr/2842 — 15 объектов района
- mosty.rajon.by/spravka/religioznye-organizaczii/ — католические вкл.
- OSM Nominatim — координаты (confirmed у 9 объектов)
- planetabelarus.by — **проверить все 17** (этап 1)
