ladder: rung-3 — план-решение до кода: фиксирует человеческое судейство (матрица вариантов, трейд-оффы анимаций/гео, открытые вопросы комплаенса); rung-0 не подходит (рантайма ещё нет), rung-1 — это не голые факты (маппинги при реализации уедут в JS-таблицы), rung-2 — это не процедура, а решения, которые предшествуют коду.

# PLAN — cookie-баннеры поверх тач-лендинга HWA

## Зачем
Серия экспериментов с cookie-попапами: как форма и объём консент-баннера влияют на
конверсию лендинга, оставаясь в рамках комплаенса (референс — док «HWM: Комплаенс и
куки», макеты Frame 1713/1714/1715). Баннеры верстаем **поверх существующего
прелоадер-флоу, не трогая его логику**: база (видео → FIRE/SWORD → плеебл) описана в
[PLAN-preloader-base.md](PLAN-preloader-base.md).

---

## Матрица вариантов: 2 шаблона × 3 типа
Макеты покрывают 3 ячейки, остальные выводим переносом стиля:

|            | type-1 «notice»       | type-2 «choice»       | type-3 «full» |
|------------|-----------------------|-----------------------|---------------|
| **t1**     | ✅ Frame 1715 (пилюля сверху) | ✅ Frame 1714 (нижний док) | — выводим (док + абзац) |
| **t2-ios** | — выводим (glass-пилюля)      | — выводим (компактный шит) | ✅ Frame 1713 (bottom-sheet) |

### Типы (объём контента; выбирается по гео)
| Тип | Текст | Кнопки | Гео (черновик — сверить с комплаенсом, вопрос №1) |
|-----|-------|--------|----|
| **type-1** | “We use cookies” (*cookies* — ссылка на политику) | `OK` | RoW: страны без требований к согласию |
| **type-2** | “We use cookies. Learn more” (*Learn more* — ссылка) | `Custom` · `Essential` · **`Accept all`** | opt-out-режимы: US (CPRA-штаты) и т.п. |
| **type-3** | “We use essential cookies to keep the game running. With your consent, we also use analytics and advertising cookies to improve performance and personalize ads.” | `Cookie Settings` · `Essentials only` · **`Accept All`** | opt-in (GDPR): EEA + UK + CH; кандидаты BR, KR |

Все тексты — в одном JS-объекте `CB_COPY` (менять централизованно; локализация — вопрос №2).

### Шаблоны (визуальный стиль)
**t1 — игровой тёмный** (в стилистике лендинга):
- плашки `rgba(0,0,0,.78)`, скругление 12–14px, белый текст, подчёркнутые ссылки;
- главная кнопка — полноширинная зелёная в духе PLAY NOW (градиент ~`#8ee000→#4caf00`,
  тёмная окантовка, жирный белый текст с лёгкой тенью) — в лендинге такой кнопки нет,
  рисуем свою по Frame 1714;
- вторичные кнопки — тонкая светлая рамка на тёмном (как `Custom`/`Essential` в макете);
- позиции: type-1 — компактная пилюля **сверху** (под логотипом, игру не перекрывает);
  type-2/3 — **нижний док** во всю ширину.

**t2-ios — нативный iOS** (Frame 1713):
- светлый frosted bottom-sheet: `backdrop-filter: blur(24px) saturate(180%)`
  (+ `-webkit-` дубль), фон `rgba(245,245,247,.72)`, скругление 20–24px,
  отступ от краёв 12px + safe-area;
- текст — системный стек (`-apple-system, system-ui`), тёмно-серый;
- вторичные кнопки — серые pill в один ряд (`Cookie Settings` | `Essentials only`),
  главная — синяя полноширинная (`#0A7CFF`, скругление ~14px, белый medium);
- type-1 — маленькая glass-пилюля сверху; type-2 — тот же шит, но с одной строкой текста.

### Библиотеки-миметики iOS (ресёрч 08.07.2026)
Вердикт: **верстаем руками, точечно заимствуем**. Наш шит статичный (текст + 3 кнопки,
без драга) → ручной CSS ~100 строк легче и дешевле любой библиотеки, principle
self-contained сохраняется.

| Библиотека | Что даёт | Вердикт |
|---|---|---|
| [cupertino-pane](https://github.com/jakamusic/cupertino-pane) — 5 КБ gz, vanilla, 0 deps | iOS-физика шита: драг, брейкпоинты, backdrop (как Apple Maps/Music) | ✅ **опция**, если решим добавить драг-жесты/свайп-dismiss; можно заинлайнить |
| [Puppertino](https://github.com/codedgar/Puppertino) — модульный чистый CSS по Apple HIG | кнопки, диалоги, свитчи-тогглы, light/dark, без JS и сборки | ✅ **донор токенов/стилей** — особенно тогглы для панели настроек |
| [Konsta UI](https://konstaui.com/) | pixel-perfect iOS-компоненты | ❌ требует Tailwind + React/Vue/Svelte — у нас vanilla single-file |
| Framework7 / Ionic / Onsen UI | полные app-фреймворки с iOS-темой | ❌ вес и инфраструктура (роутинг и т.п.) не для лендинга |
| Liquid Glass киты ([nikdelvin/liquid-glass](https://github.com/nikdelvin/liquid-glass) и др.) | стиль iOS 26 «Liquid Glass» на CSS + SVG-фильтрах | 💡 гипотеза **t2-ios-v2** для будущего эксперимента; макет Frame 1713 — классический frosted; SVG-distortion дорог на слабых девайсах |

---

## Слой поверх всех окон
Текущие слои лендинга: `#preloader` z:10 → `#choice` z:25 → `#playable.reveal` z:30.
Плеебл — кросс-доменный iframe, поэтому наш DOM-слой с бо́льшим z-index гарантированно
поверх **всех** фаз, включая развёрнутую игру.

```html
<!-- в конце <body>, после #loader -->
<div id="cookie-root" data-tpl="t1" data-type="2" data-state="closed" hidden>
  <div class="cb-scrim"></div>                      <!-- только type-3 в t2-ios -->
  <section class="cb" role="dialog" aria-label="Cookies">
    <p class="cb-text">…</p>
    <div class="cb-actions">…</div>
  </section>
  <section class="cb-settings" hidden>…тогглы Analytics / Advertising + Save…</section>
</div>
```

- `#cookie-root{ position:fixed; inset:0; z-index:90; pointer-events:none }`;
  `pointer-events:auto` — только на плашке/шите/скриме. Для type-1/2 фон остаётся
  интерактивным (карточки и плеебл кликабельны); scrim в t2-ios/type-3 перехватывает
  тапы до выбора (блокировать ли игру — вопрос №4).
- Нижние варианты: `padding-bottom: calc(12px + env(safe-area-inset-bottom))`.
- Код — инлайн в `index.html` (принцип self-contained сохраняем): отдельные блоки
  `<style data-cb>` и `<script data-cb>`, чтобы не смешиваться с кодом прелоадера.
  Ожидаемый прирост ~7–9 КБ (сейчас index.html ≈ 35 КБ) — бюджет прелоадера не страдает.

### Момент показа (параметр эксперимента `cb_at`)
Хуки — по строке `document.dispatchEvent(new CustomEvent(...))` внутри существующих
`showChoice()` и `reveal()` (index.html:549, :579), логика фаз не меняется:
- `boot` (дефолт) — сразу, +400 мс после первого кадра постера; по комплаенсу согласие
  нужно **до** запуска не-essential трекеров;
- `choice` — при появлении карточек (задержка 500 мс, чтобы не драться с их scale-in);
- `reveal` — поверх развёрнутого плеебла (как на макетах).

---

## Анимации
Общие правила:
- только `transform` + `opacity` (композитор, 60fps), никаких layout-анимаций;
- машина состояний на атрибуте: `data-state="opening|open|closing|closed"`,
  снятие/`hidden` — по `transitionend` (+страховочный таймер);
- длительности/изинги — в CSS-переменных `--cb-in`, `--cb-out`, `--cb-ease-*`;
- `@media (prefers-reduced-motion: reduce)` → только fade 150 мс (паттерн уже есть в
  проекте для VFX меча — переиспользуем подход).

| Вариант | Появление | Уход |
|---|---|---|
| Пилюля сверху (t1/t2-ios, type-1) | `opacity 0→1`, `translateY(-14px→0)`, `scale(.96→1)`; **280 мс** `cubic-bezier(.34,1.56,.64,1)` — лёгкий overshoot | fade + `scale(.96)` + `translateY(-6px)`; **180 мс** ease-in |
| Нижний док t1 (type-2/3) | `translateY(112%→0)`; **380 мс** `cubic-bezier(.22,1,.36,1)`; кнопки — stagger +60 мс (fade + 8px вверх) | `translateY(112%)`; **260 мс** ease-in |
| Шит t2-ios | scrim `opacity 0→1` 240 мс; шит `translateY(100%→0)`; **440 мс** `cubic-bezier(.32,.72,0,1)` — фирменный iOS-морф | шит вниз **300 мс** ease-in; scrim fade 200 мс |

- Переход в настройки (`Custom`/`Cookie Settings`): кросс-фейд панелей 200 мс
  (обе абсолютом в одном контейнере — без прыжков высоты).
- Idle-nudge (опция эксперимента): 6 с без действия → pulse главной кнопки
  (`scale 1→1.03`, 2 цикла по 900 мс).
- После выбора: баннер уходит своей анимацией → `hidden`; фон никогда не «мигает».

---

## Гео-логика
- Статике заголовки недоступны → добавляем `api/geo.js` (Vercel serverless/edge):
  отдаёт `{ country }` из заголовка `x-vercel-ip-country`. Кэш ответа в `sessionStorage`.
- Цепочка определения: `?geo=XX` (форс) → `/api/geo` → эвристика по
  `Intl.DateTimeFormat().resolvedOptions().timeZone` → **дефолт type-3** (строжайший
  вариант — комплаенс-safe при любой неопределённости).
- Маппинг `COUNTRY → type` — таблица в JS; списки стран финализируем по доку (вопрос №1).
- Локально (`python3 serve.py`) `/api/geo` нет → фолбэк-цепочка обязана работать без него.

## Согласие: хранение и эффект
- `localStorage['hwa.cc.v1'] = { v, ts, country, type, tpl, choice, cats:{ analytics, ads } }`;
  запись есть → баннер не показываем. Bump `v` → перепоказ после смены текстов/правил.
- Публичное API для будущих пикселей: `cbConsent.get()` / `cbConsent.onChange(fn)` —
  аналитика/реклама инициализируются только при соответствующем `cats.* === true`
  (совместимо с Google Consent Mode: маппинг на `analytics_storage` / `ad_storage`).
  Сейчас трекеров в лендинге нет — закладываем интерфейс.
- Согласие в кросс-доменный плеебл не передаётся; если понадобится — `postMessage`
  или URL-параметр (вопрос №6).

## Параметры QA/экспериментов
`?cb=0` (выключить) · `?cb_tpl=t1|t2-ios` · `?cb_type=1|2|3` · `?cb_at=boot|choice|reveal`
· `?geo=DE` · `?cb_reset=1` (сброс сохранённого выбора).
Без параметров: гео → тип; шаблон — из параметра рекламной ссылки (детерминированный
сплит на стороне закупки, вопрос №5).

## События (оценка эффекта)
- `cb_impression { tpl, type, at, geo }`;
- `cb_action { action: accept_all | essentials | ok | custom_save, ms_to_action }`;
- `cb_learn_more`, `cb_settings_open`;
- плюс базовые конверсии лендинга (клик по карточке / reveal) — мерим влияние баннера на CR.
Трекер не выбран (вопрос №5) → первый этап: буфер `window.cbEvents[]` + `console.debug`.

---

## Порядок реализации
1. [x] **Каркас**: `#cookie-root`, state-машина показа, URL-параметры, storage,
   хуки фаз (`boot/choice/reveal`); проверить слой поверх BOOT / PLAYING / CHOICE / REVEAL.
2. [x] **t1**: type-1 пилюля, type-2 док, type-3 док+абзац; зелёная кнопка; анимации.
3. [x] **t2-ios**: шит + frosted (+фолбэк без `backdrop-filter`) + safe-area; анимации.
4. [x] **Панель настроек** (`Custom` / `Cookie Settings`): тогглы Analytics/Advertising + Save.
5. [x] **Гео**: `api/geo.js` + маппинг + фолбэк-цепочка + строгий дефолт.
6. [x] **События** (буфер) + `cbConsent`-API.
7. [~] **QA-матрица**: ✅ превью Chromium 375×812 (08.07.2026): все 6 ячеек матрицы,
   панель настроек (open→toggles→save→consent), повторный визит (не показывается),
   `cb_reset`, `cb_at=reveal` (баннер ждёт фазу и открывается поверх плеебла, z 90>30),
   консоль чистая. ⏳ Осталось: реальный iOS Safari (blur, safe-area, Low Power Mode),
   Android Chrome, in-app WebView (FB/TikTok), `prefers-reduced-motion`.
8. [ ] **Деплой**: подключить репозиторий `ternome/hwa-cookies` к Vercel-проекту
   (ручной шаг в дашборде); дальше push в `main` → деплой.

## Технические заметки
- `backdrop-filter` требует `-webkit-`-дубля на iOS; `@supports not (backdrop-filter: blur(1px))`
  → непрозрачный светлый фон `rgba(244,244,247,.96)` (заодно спасает слабые Android, где blur дорог).
- Шрифты не подключаем: t2-ios — системный стек (нативно для iOS), t1 — тот же стек 700/800.
- Доступность: `role="dialog"`, `aria-label`, все действия — `<button>`; для type-3
  фокус на главную кнопку при показе.
- `vercel.json` менять не нужно (папка `api/` подхватывается Vercel автоматически).

## Превью (нюанс iCloud)
Как в базовом проекте: песочница превью не читает `Mobile Documents` напрямую из cwd —
сервер держит абсолютный путь. Перед первым превью: скопировать `.claude/serve.py` в
`/tmp/serve-cookies.py`; конфиг `hwa-cookies` в `.claude/launch.json` (порт **4601**,
не конфликтует с базовым 4599). Прогон: `http://127.0.0.1:4601/?cb_tpl=…&cb_type=…`.

## Открытые вопросы
1. Точные списки стран для type-1/2/3 — сверить с комплаенс-доком/юристами.
2. Финальные тексты и URL политик (Privacy/Cookie Policy); нужна ли локализация (пока EN везде).
3. ✅ Решено (08.07.2026): для type-3 «Cookie Settings» открывает модалку «Learn more
   about cookies» по прод-окну HW (EU-вариант): аккордеоны свернуты по умолчанию,
   тумблеры Advertising/Partners включены, футер Save my preferences / Accept all;
   в consent добавлена категория `partners` (только type-3). Для type-2 `Custom` —
   компактная панель тогглов. US-версия окна (без тумблера, кнопка Accept) — при
   необходимости для type-2.
4. Блокировать ли взаимодействие с игрой до выбора в GDPR-зоне
   (сейчас: t2-ios/type-3 — блокирует scrim'ом, t1 — нет).
5. Каким трекером шлём события и как задаётся сплит `t1`/`t2-ios` (параметр в рекламной ссылке?).
6. Нужно ли передавать согласие внутрь плеебла (кросс-домен akamaihd).
