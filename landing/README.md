# Koredigital — лендинг цифровых решений для автобизнеса

Отдельный B2B-проект бренда Koredigital внутри `autoexport/landing`. AutoExport представлен как продуктовый кейс. Базовая система бренда: `docs/brand-koredigital.md`.

## Запуск

```sh
cd /Users/koreakim/Developer/autoexport/landing
npm ci
npm run dev
```

URL: http://127.0.0.1:3100

Проверки: `npm run build`, `npm run typecheck`.
Production: `npm run build`, затем `npm start`.

Зависимости, lockfile и конфигурация независимы от родительского приложения. Секреты и база родительского проекта не используются. Основной домен — `https://koredigital.co.kr`; `www.koredigital.co.kr` перенаправляется на него. Сайт открыт для индексации. Форма открывает черновик обращения в Telegram без хранения на сайте. Яндекс.Метрика подключена для production; настройки счётчика и идентификаторы целей перечислены в `docs/05-analytics-readiness.md`.

Аудит: docs/01-product-audit.md. Production: https://koredigital.co.kr.
