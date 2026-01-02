# Session Saver Pro — Tab & Window Session Manager

Расширение для Chrome/Chromium (Manifest V3), которое позволяет сохранять текущие окна/вкладки как «сессию», быстро восстанавливать её и искать по **URL**, title и domain.

## Возможности

- Save Current Session (ручное сохранение)
- Список сессий (новые сверху)
- Поиск по подстроке без учета регистра:
  - `tab.url` (включая path/query)
  - `tab.title`
  - `domain` (hostname из URL)
- Restore (восстановление в новых окнах)
- Delete (удаление)
- Автосейв:
  - по таймеру через `chrome.alarms`
  - best-effort сохранение при переходе в спящий режим Service Worker и закрытии окон
- Лимит сессий (`maxSessions`) с сохранением `autosave`

## Настройки

Открой **Options** в настройках расширения.

- **Enable autosave** — включает автосейв
- **Autosave interval (minutes)** — интервал (мин. 1)
- **Max saved sessions** — лимит сессий (мин. 1)

## Локальная разработка (lint/test)

Требования:
- Node.js 18+

Команды:

```bash
npm install
npm run lint
npm test
```

## Версионирование и релизы (SemVer)

Используется **Semantic Versioning**: `MAJOR.MINOR.PATCH`.

Рекомендуемый процесс релиза:

1. Обнови версию в `manifest.json` (и при необходимости в `package.json`) на `X.Y.Z`
2. Сделай коммит в `main`
3. Поставь тег:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

На push тега `v*` GitHub Actions соберёт артефакт.

## Git branching model

- `main` — стабильные релизы
- feature-ветки — короткоживущие

## Best practices (кратко)

- Ошибки чтения вкладок/окон показываются в popup статусом.
- При restore ошибки открытия отдельных вкладок не прерывают процесс.
- Поиск выполняется в popup в памяти (быстро, без лишних запросов к SW).
- Артефакты релизов генерируются автоматически через GitHub Actions для тегов v*.

## Лицензия

MIT
