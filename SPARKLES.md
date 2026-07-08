# SPARKLES — анимация иконки меча на экране выбора оружия

## Цель
Оживить карточку **SWORD** на экране CHOICE так, чтобы взгляд сразу шёл на неё
(она же «Best choice»). Эффект — «живое, сверкающее легендарное оружие»: блик-проблеск
по клинку, искры-звёздочки, дышащее свечение портала, лёгкое парение. Без тяжёлых
библиотек, в духе текущего self-contained `index.html` (inline CSS/JS, vanilla).

Контекст файла: вся вёрстка в [index.html](index.html); карточка меча — это
`<button class="card sword">` c `<img src="sword.webp">` внутри
([index.html:152](index.html#L152)). Сейчас на ней уже висят `pop`, `glowSword`,
`:active`-scale ([index.html:68](index.html#L68), [index.html:125](index.html#L125)).

---

## Главное ограничение (определяет развилку)
`sword.webp` (24 КБ) — **единая запечённая картинка всей карточки**: клинок + синий
вихрь-портал + синяя рамка. Отдельного слоя «только меч» с прозрачностью нет.

Из этого следуют **два уровня амбиций** (см. развилку в конце):

- **Tier 1 — оверлеи поверх плоской картинки (по умолчанию).** Ничего не режем,
  не трогаем ассет. Блик/искры/свечение/парение накладываем CSS-слоями поверх и под
  карточкой. ~80% «вау» за ~20% усилий. Ограничение: блик идёт по всей карточке
  (читается как «блестящая карта»), а не строго по металлу клинка; вихрь не вращается
  отдельно (он впечён).
- **Tier 2 — разрезать ассет на слои (опционально).** Из `SWORD.png` вырезать
  прозрачный клинок `sword-blade.webp` + фон-вихрь `sword-bg.webp`. Тогда можно: вращать
  вихрь независимо, параллакс-парение клинка, и **маскировать блик строго по металлу**
  (настоящий weapon-gleam). Дороже на резку ассета.

---

## Tier 1 — слои эффектов (по умолчанию)

Порядок по z (снизу вверх): **аура (под картой) → img → блик → искры**.
Анимируем только `transform` / `opacity` / `background-position` (GPU-friendly);
тяжёлый `filter` оставляем как сейчас (он уже есть и приемлем).

### A. Блик-проблеск по клинку (signature gleam)
Диагональная световая полоса, пробегающая по карточке раз в ~3–4 c.
Псевдоэлемент с `mix-blend-mode:screen`, фон клипается рамкой карты (border-radius).

```css
.card.sword::after{                 /* блик */
  content:""; position:absolute; inset:0; border-radius:16px;
  pointer-events:none; z-index:3; mix-blend-mode:screen;
  background:linear-gradient(115deg,
    transparent 42%, rgba(255,255,255,.65) 50%, transparent 58%);
  background-size:250% 250%;
  background-position:120% -20%;
  animation: glint 3.6s ease-in-out 1.1s infinite;
}
@keyframes glint{
  0%   { background-position:120% -20%; opacity:0; }
  10%  { opacity:1; }
  28%  { background-position:-30% 130%; opacity:0; }
  100% { background-position:-30% 130%; opacity:0; }  /* пауза до следующего прогона */
}
```

### B. Искры-звёздочки (twinkle)
3–4 четырёхлучевые звёздочки у острия и гарды, мерцают со сдвигом фаз
(scale + rotate + opacity). Кладём отдельным слоем-контейнером внутрь карточки.

```html
<!-- внутрь <button class="card sword">, после <img> -->
<span class="sparks" aria-hidden="true">
  <svg class="spark s1" viewBox="0 0 24 24"><path d="M12 0c1 6 5 10 11 12-6 1-10 5-11 12-1-7-5-11-11-12 6-2 10-6 11-12z"/></svg>
  <svg class="spark s2" viewBox="0 0 24 24"><path d="M12 0c1 6 5 10 11 12-6 1-10 5-11 12-1-7-5-11-11-12 6-2 10-6 11-12z"/></svg>
  <svg class="spark s3" viewBox="0 0 24 24"><path d="M12 0c1 6 5 10 11 12-6 1-10 5-11 12-1-7-5-11-11-12 6-2 10-6 11-12z"/></svg>
</span>
```
```css
.sparks{ position:absolute; inset:0; z-index:4; pointer-events:none; }
.spark{ position:absolute; width:14px; height:14px; fill:#eaf6ff;
        opacity:0; filter:drop-shadow(0 0 4px #7fc8ff); }
@keyframes twinkle{
  0%,100%{ opacity:0; transform:scale(.2) rotate(0deg); }
  50%    { opacity:1; transform:scale(1)  rotate(90deg); }
}
.s1{ top:14%; left:60%; animation: twinkle 1.9s ease-in-out .2s infinite; }
.s2{ top:30%; left:30%; width:10px; animation: twinkle 2.4s ease-in-out 1.0s infinite; }
.s3{ top:62%; left:66%; width:18px; animation: twinkle 2.1s ease-in-out 1.6s infinite; }
```
Позиции `top/left` подгоняются на превью под реальное положение клинка.

### C. Дышащее свечение портала (aura)
Доп. радиальный ореол ПОД карточкой — усиливает впечатанный вихрь, «дышит» в такт.
Отдельный слой за `<img>` (или `::before` карточки с `z-index:-1`).

```css
.card.sword::before{                /* аура под картой */
  content:""; position:absolute; inset:-18%; z-index:-1;
  pointer-events:none; border-radius:50%;
  background:radial-gradient(closest-side,
    rgba(90,170,255,.55), rgba(90,170,255,0) 70%);
  animation: aura 2.6s ease-in-out .75s infinite;
}
@keyframes aura{
  0%,100%{ transform:scale(.85); opacity:.45; }
  50%    { transform:scale(1.08); opacity:.9; }
}
```
Тогда существующую `glowSword` ([index.html:125](index.html#L125)) можно оставить как
есть или ослабить, чтобы не дублировать свечение.

### D. Лёгкое парение (float) — нюанс наложения transform
Чтобы меч «жил», добавить плавное вертикальное парение. **Проблема:** `pop` и
`:active`-scale уже используют `transform` на `.card` — третья анимация transform на том
же элементе конфликтует (анимации transform не складываются). **Решение — разнести по
слоям:** парение вешаем на внутренний `<img>` (или на новый wrapper), а `pop`/`:active`
оставляем на `.card`.

```css
#choice.show .card.sword img{
  animation: float 3.4s ease-in-out 1s infinite;
}
@keyframes float{
  0%,100%{ transform:translateY(0); }
  50%    { transform:translateY(-2.5%); }
}
```
(Если позже понадобится и масштаб, и парение на одном узле — заводим wrapper-div между
`.card` и `img`.)

---

## Tier 2 — разрезка на слои (опционально, для «настоящего» gleam)
Если нужен блик строго по металлу и независимый вихрь:
1. Из `SWORD.png` (779×1352) вырезать **прозрачный клинок** → `sword-blade.webp`
   и **фон-вихрь+рамку** → `sword-bg.webp` (Photoshop/`rembg`/ручная маска).
2. Вёрстка: `bg` (вращаем/дышим) ← `blade` (парение) ← блик с
   `-webkit-mask-image:url(sword-blade.webp)` (полоса видна только на клинке).
3. Вихрь крутим медленным `rotate` или накладываем `conic-gradient` спиннер под клинком.
   Бонус: микро-параллакс (клинок и вихрь двигаются на разную амплитуду).
Стоимость: +резка ассета (+~1 ассет, ~20–40 КБ), +слои в разметке. «Вау» заметно выше.

---

## Производительность и доступность
- Анимируем `transform`/`opacity`/`background-position` — без layout/paint-трэша.
- Искр ≤ 4, размеры маленькие; `mix-blend-mode:screen` на одном элементе — ок для моб.
- Длительности «дыхания» врозь (2.1 / 2.4 / 2.6 / 3.6 c) — чтобы эффекты не
  «щёлкали» синхронно.
- **`prefers-reduced-motion`**: расширить существующий блок
  ([index.html:129](index.html#L129)) — отключить `glint`/`twinkle`/`float`/`aura`,
  оставить статичную карту (искры/блик `opacity:0` или `animation:none`).
- Эффекты только на CHOICE-фазе (`#choice.show ...`), на REVEAL карточки уже скрыты.

---

## Порядок реализации
1. [ ] **Решить Tier 1 vs Tier 2** (развилка ниже).
2. [ ] Tier 1: добавить `::before` (aura), `::after` (glint), блок `.sparks`+`.spark`,
       `float` на `img`; разнести transform по слоям; ослабить/убрать дубль `glowSword`.
3. [ ] Подогнать позиции искр и угол блика на превью под реальный клинок.
4. [ ] Расширить `prefers-reduced-motion`.
5. [ ] (Если Tier 2) вырезать `sword-blade.webp` / `sword-bg.webp`, перестроить слои,
       замаскировать блик по клинку.
6. [ ] Прогон в превью (Chromium mobile 375×812), проверить, что взгляд идёт на меч и
       нет фризов; снять скрин/видео.

### Нюанс превью (из PLAN.md)
Папка в iCloud — песочница превью к ней доступа не имеет. Статика копируется в
`/tmp/hwa_preview`, сервер `/tmp/serve.py` (см. `.claude/launch.json`, конфиг `hwa`).
После правок `index.html` **пересинхронить копию** в `/tmp/hwa_preview`.

### Критерии приёмки
- На CHOICE карточка меча визуально доминирует над FIRE (блик + искры + дыхание).
- 60 fps на мобильном превью, без дёрганья при входе (`pop` не конфликтует с `float`).
- `prefers-reduced-motion` → статичная карта, без мерцания.
- Размер бандла практически не вырос (Tier 1 — чистый CSS/SVG inline; Tier 2 — +1 ассет).

---

## Развилка (нужно решение)
**Tier 1 (по умолчанию, рекомендую для старта):** оверлеи поверх текущего `sword.webp`,
ассет не трогаем — быстро, заметный эффект, риск минимальный.
**Tier 2:** вырезаем клинок в отдельный слой → блик строго по металлу + вращение вихря +
параллакс. Дороже на резку ассета, но «легендарнее».

Предлагаю сделать Tier 1 сразу (он самодостаточен и почти весь «вау» даёт), а Tier 2
держать как апгрейд, если после превью захочется ещё сочнее.

---

## Tier 3 — готовые VFX-видео от Pavel (РЕАЛИЗОВАНО)

Павел прислал два прозрачных VP9/WebM-клипа (`alpha_mode=1`, 600×1067, 30fps, ~5.3с):
- **полный** «карточка меча + синяя огненная рамка» (всё запечено вместе);
- **только VFX** — огненная рамка с прозрачной серединой (подкладывается под `sword.webp`).

### Главное ограничение: Safari НЕ умеет VP9/WebM-альфу
Safari (iOS и desktop) **декодирует VP9, но игнорирует его альфу** → чистый WebM даёт **чёрный box**.
Поэтому отдаём ДВА файла и **выбираем источник в JS по платформе** (НЕ порядком `<source>`!):
- Apple/WebKit (iOS + desktop Safari) → `*.mp4` (HEVC **hvc1**, многослойная альфа VideoToolbox);
- все остальные (Chrome/Firefox/Android) → `*.webm` (VP9-alpha).
Детект Apple — `isAppleWebKit()` в index.html (`navigator.platform` / `maxTouchPoints` / UA Safari).
Локальная проверка без айфона: `mdls file.mp4` → `kMDItemCodecs=("HEVC with Alpha"…)` и
`qlmanage -t file.mp4` рендерит RGBA-превью (тот же AVFoundation, что у Safari). Детали кодирования —
в памяти `transparent-video-ios`.

### Ассеты (оптимизированы; full 540×960, frame 320×570, @24fps)
| Вариант | WebM (Chrome/Android) | MP4 HEVC hvc1 (iOS) |
|---|---|---|
| 1 — полная карточка (`cardfx-full`)  | 556K | 772K |
| 2 — только рамка (`cardfx-frame`)     | 180K | 344K |

(оригиналы были 1.1M / 888K и БЕЗ формата под iOS.)

### Как включается (в `index.html`)
Класс на `#choice` переключает режим: `mode-full` (видео вместо `sword.webp` и всех CSS-эффектов),
`mode-frame` (видео-рамка ПОД живым `sword.webp`, CSS-эффекты скрыты), `mode-css` (старый ручной
CSS-лук). По умолчанию — `mode-full`. Демо-тумблер появляется на `?demo=1` (чипы сверху слева +
мгновенный показ экрана). Производительность: видео НЕ autoplay и `preload="metadata"` — активный
клип стартует из JS только когда появляется экран выбора (не грузит декодер во время прелоадера);
при `prefers-reduced-motion` видео прячется и показывается статичный `sword.webp`; если ни один
источник не проигрался — откат на `mode-css`.

### Tier 1/2 vs Tier 3 — что выбрать
- **Tier 3 mode-full** — самый «AAA» вид (рамка и карта нарисованы вместе, идеально совпадают),
  но самый тяжёлый (≈944K на iOS) и нельзя поменять арт карты отдельно от видео.
- **Tier 3 mode-frame** — оставляет резкий `sword.webp`, рамка переиспользуемая и легче (≈572K),
  свечение чуть менее ровное по бокам.
- **Tier 1 (CSS)** — почти невесомый, но эффект «рукодельный», не такой богатый.
