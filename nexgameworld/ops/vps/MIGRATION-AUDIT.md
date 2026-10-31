# Аудит переноса NexGameWorld — 31.10.2026

Причина отказа: неполный пакет общих модулей. Node не находил bestiary/chest-preview-motion.js через planet-test/gather-world.js; systemd циклически перезапускал процесс, публичный proxy отдавал 502. Проверка существования исходников не проверяла фактическое содержимое пакета. Старый deploy.yml не доставлял новую версию server/ и мог смешивать разные коммиты.

Исправление запуска: 1e41bbeec01a6c41cda8f40eb49cd8304b148836. После него локальные health/ready и публичный health вернули 200.

Исправление доставки: 16d4bdfa852fa7136160342bc63dd4143ad72bf5. Отдельный полный релиз, тесты, фактический импорт, проверка БД, атомарная ссылка current, откат при ошибке. Конфигурация не перезаписывается секретом из Actions при каждом обновлении. Docker, Nginx и TeamSpeak не меняются.

Переключение клиента и production audit: 298aad9b4d76db0d5812b8f85b7956afaae472b8, Alpha 0.6.45.42. Публичный API и WSS — api.nexions.ru. Страница аккаунта и CSP переключены отдельно в Nexions-portal; зеркало игровых файлов публикуется только штатным sync workflow с тестами.

Подтверждённый деплой VPS: https://github.com/Nexions-link/Nexgame/actions/runs/41211009086 — success; BUILD 0.6.45.42, локальные и публичные health/ready, аккаунты и экономика, progressSaveFailures=0, PUBLIC_WSS_OK, ActiveState=active, NRestarts=0.

Окончательный статус сайта определяется последней зелёной проверкой Verify live NexGameWorld on nexions.ru после публикации Pages; история этого файла сама по себе не подтверждает публичную выдачу.
