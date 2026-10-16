# Nexions — NexGameWorld portal

Статическая приветственная страница для `https://nexions.ru/`.

## Ссылки

- **NexGameWorld:** https://nexions-link.github.io/Nexgame/planet-test/
- **Атлас:** https://nexions-link.github.io/Nexgame/bestiary/atlas.html

Не переносить игру в этот репозиторий: сохранения NexGameWorld остаются привязаны к её прежнему GitHub Pages origin.

## Включение GitHub Pages

1. Открыть https://github.com/Nexions-link/Nexions-portal/settings/pages.
2. В **Build and deployment → Source** выбрать **Deploy from a branch**.
3. Выбрать **main**, **/(root)** и нажать **Save**.
4. В **Custom domain** ввести `nexions.ru` и сохранить. Файл `CNAME` уже находится в корне.
5. Когда GitHub выпустит сертификат, включить **Enforce HTTPS**.

## DNS у регистратора

Для корня `nexions.ru`:

| Тип | Имя | Значение |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | nexions-link.github.io |

При наличии конфликтующих старых A/AAAA/CNAME-записей для сайта сначала проверить, куда они ведут, затем заменить. MX/TXT-записи почты не удалять. Не создавать wildcard `*` CNAME.

Рекомендации DNS: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

После настройки DNS корневой адрес должен открывать эту страницу, а `www` — вести на основной домен. На распространение DNS может потребоваться до 24 часов.
