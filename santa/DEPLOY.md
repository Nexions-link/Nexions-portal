# Тайный Санта — развёртывание

Состояние: исходный код MVP добавлен, сервер НЕ развёрнут. GitHub Pages публикует только статический интерфейс.

## Сервер
На VPS Ubuntu 24.04 установить Node.js 20+ и инструменты сборки для better-sqlite3. Отдельный пользователь/каталог, не менять конфигурацию TeamSpeak или NexGameWorld.

```bash
cd /opt/santa/server
npm install --omit=dev
SANTA_DB=/opt/santa/data/santa.sqlite PORT=9810 node index.js
```

Сервис слушает только 127.0.0.1:9810. Требуется systemd unit с Restart=always, ограничением прав и постоянным каталогом данных, резервное копирование SQLite.

В существующий HTTPS nginx vhost api.nexions.ru добавить только отдельный location:

```nginx
location /santa/api/ {
  proxy_pass http://127.0.0.1:9810;
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $remote_addr;
  add_header Access-Control-Allow-Origin "https://nexions.ru" always;
  add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
  add_header Access-Control-Allow-Headers "Content-Type, Authorization" always;
  if ($request_method = OPTIONS) { return 204; }
}
```

Проверить nginx -t и только затем reload. Не менять существующие location игры и порты TeamSpeak.

## Перед приглашением участников
- Добавить ограничение частоты запросов на создание комнат, регистрацию, авторизацию и просмотр карточек.
- Настроить резервное копирование и восстановление БД.
- Проверить CORS, TLS, доступность сайта и API с российских IP.
- Проверить полный сценарий в 2 браузерах: создать комнату, добавить 3 участников, провести жеребьёвку, убедиться в приватности карточек.
- Учитывать: личная ссылка является секретным ключом доступа. Не пересылать её другим людям.
- Текущая версия не поддерживает исключения пар, редактирование участников и восстановление утерянной персональной ссылки.
