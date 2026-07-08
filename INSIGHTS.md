# INSIGHTS — прозрачное видео (alpha) для Safari/iOS на вебе

Полная инструкция, как правильно адаптировать присланный **WebM/VP9 с альфой** так, чтобы
прозрачность работала **во всех браузерах, включая iOS Safari и desktop Safari**. Собрано по
итогам интеграции VFX от Pavel в этот лендинг. Следуй пунктам по порядку — и проблем не будет.

---

## TL;DR (короткая версия)
1. Один прозрачный клип = **ДВА файла**: `*.webm` (VP9-alpha, для Chrome/Firefox/Android) и
   `*.mp4` (HEVC `hvc1` с альфой, для Safari).
2. HEVC кодируй **родным macOS-энкодером** `hevc_videotoolbox` и обязательно **premultiply**
   (иначе по мягким краям лезет светлое гало).
3. Источник выбирай **в JavaScript по платформе**, НЕ порядком `<source>` (Safari «съедает» VP9
   без альфы → чёрный box, если webm идёт первым).
4. Проверяй локально **без айфона** через `mdls` и `qlmanage` (тот же движок AVFoundation, что
   у Safari).

---

## 1. Почему так (корень проблемы)
- **iOS и desktop Safari НЕ показывают VP9/WebM-альфу.** Современный Safari умеет ДЕКОДИРОВАТЬ
  VP9, но **игнорирует альфа-канал** → видео рисуется как непрозрачный (часто чёрный/тёмный) box.
- Единственный прозрачный формат, который Safari компонует, — **HEVC с альфой** (многослойный
  HEVC, `hvc1`, альфа во вспомогательном слое `nuh_layer_id:1`). Это формат Apple VideoToolbox.
- Chrome/Firefox/Android — наоборот: умеют VP9-alpha, но **НЕ умеют HEVC-alpha** (покрасят `hvc1`
  непрозрачным, если им его подсунуть).
- Поэтому: **webm для одних, mp4(hevc) для других, и выбор в JS.**

---

## 2. ffmpeg: как сделать оба файла

### 2.1 Декод VP9-alpha из исходника
Дефолтный декодер ffmpeg `vp9` **молча выбрасывает альфу**. Нужен **`libvpx-vp9`**:
```bash
# проверить, что в исходнике есть альфа:
ffprobe -v error -show_entries stream_tags=alpha_mode -of csv=p=0 in.webm   # -> 1 = альфа есть
# при декоде ВСЕГДА указывай декодер явно:
ffmpeg -c:v libvpx-vp9 -i in.webm ...     # иначе alphaextract упадёт "Requested planes not available"
```

### 2.2 WebM для Chrome/Android (re-encode для размера, опц.)
VP9-alpha можно пережать (`libvpx-vp9` умеет кодировать альфу). Альфу НЕ премультиплексируем —
Chrome компонует straight:
```bash
ffmpeg -c:v libvpx-vp9 -i in.webm \
  -vf "scale=540:-2,fps=24" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -crf 40 -b:v 0 -row-mt 1 -cpu-used 1 -an out.webm
# крупнее crf = меньше файл. Можно вообще не пережимать, если исходник ок.
```

### 2.3 MP4 (HEVC hvc1 с альфой) для Safari — ГЛАВНОЕ
- Кодируй **`hevc_videotoolbox`** (родной Apple-энкодер; только на macOS).
- **Обязательно `premultiply=inplace=1`** в фильтре — иначе по полупрозрачным/мягким краям
  (свечение, перо) в Safari будет **светлое гало** (Safari компонует HEVC-альфу как premultiplied).
- Тег `-vtag hvc1` (НЕ `hev1`) — иначе Safari не проиграет.
- Кодируй **сразу в `.mp4`** (`-movflags +faststart`). **НЕ ремукси** `.mov`→`.mp4` через
  `-c copy` — это ломает параметр-сеты альфа-слоя (PPS errors), Safari может не увидеть альфу.
```bash
ffmpeg -c:v libvpx-vp9 -i in.webm \
  -vf "scale=540:-2,fps=24,premultiply=inplace=1" \
  -c:v hevc_videotoolbox -allow_sw 1 -alpha_quality 0.6 -vtag hvc1 \
  -pix_fmt yuva420p -b:v 600k -movflags +faststart -an out.mp4
```
Непрозрачные пиксели (α=1, текст/арт) premultiply НЕ меняет — резкость сохраняется.

---

## 3. Разметка `<video>` + выбор источника в JS

### 3.1 HTML — БЕЗ `<source>`, src ставится в JS. Атрибуты для inline-автоплея на iOS:
```html
<video class="myfx" data-webm="fx.webm" data-hevc="fx.mp4"
       loop muted playsinline webkit-playsinline preload="metadata"
       disablepictureinpicture aria-hidden="true"></video>
```
(`muted` + `playsinline` + `webkit-playsinline` обязательны для автоплея на iOS. Можно добавить
`autoplay`, но в прелоадере лучше стартовать `.play()` из JS в нужный момент, а не на загрузке —
чтобы видео не отъедало декодер/трафик пока грузится основной контент.)

### 3.2 JS — детект Apple/WebKit и подстановка src:
```js
function isAppleWebKit(){
  var ua = navigator.userAgent;
  if (/iP(hone|ad|od)/.test(navigator.platform)) return true;            // iOS (все браузеры = WebKit)
  if (navigator.maxTouchPoints > 1 && /Macintosh/.test(ua)) return true; // iPadOS (репортит как Mac)
  return /Safari/.test(ua) && /Version\//.test(ua) &&
         !/(Chrome|Chromium|CriOS|FxiOS|Edg|OPR|SamsungBrowser|Android)/.test(ua); // desktop Safari
}
var useHEVC = isAppleWebKit();
document.querySelectorAll('.myfx').forEach(function(v){
  v.src = useHEVC ? v.getAttribute('data-hevc') : v.getAttribute('data-webm');
});
```
**Почему не `<source>` по порядку:** Safari играет VP9 (но без альфы), поэтому при webm-first он
берёт webm и красит непрозрачным; при hevc-first его может схватить Chrome-с-HEVC и тоже
покрасить непрозрачным. JS-выбор детерминирован.

Желательно повесить fallback: при `error` у `<video>` попробовать второй кодек, затем — CSS/статику.

---

## 4. Проверка БЕЗ айфона (тот же движок, что у Safari)
macOS QuickLook/Spotlight используют AVFoundation — ровно то, чем Safari декодит HEVC-альфу.
```bash
# 1) распознаётся ли альфа?
mdls out.mp4 | grep Codecs        # -> kMDItemCodecs = ("HEVC with Alpha", Video)
                                  # (после перезаписи файла кэш Spotlight может врать — переименуй и проверь)
# 2) есть ли альфа-слой в битстриме?
ffmpeg -v debug -i out.mp4 -frames:v 1 -f null - 2>&1 | grep -i "is alpha video"   # -> "Multi layer video, is alpha video"
# 3) рендер через AVFoundation -> RGBA-превью:
qlmanage -t -s 360 out.mp4 -o /tmp/ql        # /tmp/ql/out.mp4.png должен быть pix_fmt=rgba
# 4) проверка гало: наложи RGBA-превью на СВЕТЛО-СЕРЫЙ фон — не должно быть светлой рамки/дымки:
ffmpeg -f lavfi -i "color=c=0xcccccc:s=WxH" -i /tmp/ql/out.mp4.png \
  -filter_complex "[0][1]overlay=shortest=1" -frames:v 1 /tmp/halo_check.png
# (qlmanage сам выбирает кадр; суди по СТРУКТУРЕ гало, не по точной яркости —
#  straight-композит слегка недосвечивает premult-файл, в Safari яркость восстановится)
```

---

## 5. Оптимизация размера (с потолком качества)
- **Разрешение под показ:** карточка max ~190px CSS → при DPR 3 нужно ~570px. Мягкое свечение
  (glow) можно отдавать сильно меньше (320–400px) — апскейл по CSS незаметен. Резкий арт/текст —
  держи ~540px.
- **fps:** 24 для луп-свечения вместо 30 (≈−20%, незаметно).
- **WebM:** `-crf 38..42 -b:v 0` (VP9 CQ).
- **HEVC:** `videotoolbox` управляется битрейтом (`-b:v`), CRF нет. `alpha_quality 0.55..0.7` —
  баланс; **НЕ ставь 1.0** (файл раздувается в разы). premultiply обычно ещё и жмётся лучше.

---

## 6. Грабли (чек-лист «почему не работает»)
| Симптом | Причина | Фикс |
|---|---|---|
| iOS/Safari: чёрный/тёмный box вместо прозрачности | Safari взял VP9-webm (без альфы) | выбор src в JS → отдать `.mp4` (hevc) |
| Светлое гало/дымка по краям свечения в Safari | не-premultiplied альфа | `premultiply=inplace=1` перед `hevc_videotoolbox` |
| `alphaextract` падает "Requested planes not available" | дефолтный `vp9` декодер выбросил альфу | декодить `-c:v libvpx-vp9` |
| Safari не играет mp4 вообще | тег `hev1` вместо `hvc1`, или ремукс сломал слой | `-vtag hvc1`, кодить сразу в mp4 (не `-c copy` из mov) |
| Chrome красит mp4 непрозрачным | Chrome не умеет HEVC-alpha, но схватил mp4 | НЕ ставить mp4 первым `<source>`; выбирать в JS |
| Видео тормозит загрузку прелоадера | `autoplay`+`preload=auto` декодит во время загрузки | `preload=metadata`, `.play()` из JS по событию |

---

## 7. Где это вживую в проекте
`index.html` → блок `Pavel flame-frame VFX` (элемент `.sword-video-frame`, функция
`isAppleWebKit()`, `setMode`/`syncVideos`). Ассеты: `cardfx-frame.webm` / `cardfx-frame.mp4`.
План/история эффектов — [SPARKLES.md](SPARKLES.md).
