# HWA — эксперименты с cookie-баннерами (тач-лендинг)

Форк `touch-preloader-skills`: тот же прелоадер-лендинг (видео → выбор оружия →
предзагруженный плеебл), поверх которого верстаем cookie-баннеры для экспериментов:
**3 типа контента** (по гео) × **2 визуальных шаблона** (`t1` — игровой тёмный,
`t2-ios` — нативный iOS).

**Активный план работ — [PLAN.md](PLAN.md)** (матрица вариантов, слой поверх окон,
анимации, гео-логика, события).
Как устроена база лендинга — [PLAN-preloader-base.md](PLAN-preloader-base.md),
доки по VFX меча — `INSIGHTS.md`, `SPARKLES.md`.

## Флоу базы
1. Автоплей видео (muted) поверх мгновенного poster.
2. Видео доигрывает → заморозка на последнем кадре → затемнение + выбор **FIRE / SWORD**.
3. Клик по карточке → предзагруженный плеебл разворачивается на весь экран.

Cookie-баннер живёт в отдельном слое поверх всех фаз; момент показа — параметр
эксперимента (см. PLAN.md).

## Файлы
| Файл | Назначение |
|------|------------|
| `index.html` | весь лендинг + cookie-модуль (vanilla, inline CSS/JS) |
| `preloader.mp4`, `poster.webp` | видео старта и первый кадр |
| `fire.webp`, `sword.webp` | карточки выбора |
| `cardfx-frame.mp4/.webm`, `fx-*.webp`, `glow-blue.webp` | VFX карточки меча |
| `preload-cast.mov`, `FIRE.png`, `SWORD.png` | мастера (не деплоятся) |
| `PLAN.md` | план работ по cookie-баннерам |
| `PLAN-preloader-base.md`, `INSIGHTS.md`, `SPARKLES.md` | доки базового проекта |

## Пересборка ассетов
```sh
# видео: обрезка до 3.6с, 30fps, 720px, faststart, без звука
ffmpeg -y -i preload-cast.mov -t 3.6 \
  -vf "fps=30,scale=720:-2:flags=lanczos" \
  -c:v libx264 -profile:v main -pix_fmt yuv420p -crf 27 -preset slow \
  -an -movflags +faststart preloader.mp4

# poster (первый кадр)
ffmpeg -y -ss 0 -i preload-cast.mov -frames:v 1 -vf "scale=720:-2" -q:v 80 poster.webp

# карточки
ffmpeg -y -i FIRE.png  -vf "scale=360:-2" -c:v libwebp -q:v 82 fire.webp
ffmpeg -y -i SWORD.png -vf "scale=360:-2" -c:v libwebp -q:v 82 sword.webp
```

## Деплой
Статический сайт. Подключить этот репозиторий к отдельному Vercel-проекту — каждый
push в `main` триггерит деплой. Конфиг — `vercel.json`; `.vercelignore` исключает
мастера и все `*.md`.
