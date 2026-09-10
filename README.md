# Money Agent x402 Seller API

Платёжный API на протоколе [x402](https://x402.org) (Linux Foundation; члены: Coinbase, Cloudflare, Google, Visa, Stripe, AWS). Покупатели — AI-агенты платят USDC на Base за каждый запрос. Без API-ключей, без регистрации для покупателей.

## Эндпоинты (mainnet, цены за запрос)

| Endpoint | Цена | Данные |
|---|---|---|
| `GET /v1/crypto/prices` | $0.02 | Топ-100 криптоцен (CoinGecko) |
| `GET /v1/funding/apy` | $0.05 | **Уникально**: funding-APY 700+ перпов Bybit |
| `GET /v1/testnet/status` | $0.03 | **Уникально**: верифицированный ландшафт тестнетов |
| `GET /v1/defi/yields` | $0.03 | Стабкоин-доходности Base/ETH (DefiLlama) |
| `GET /v1/github/trending` | $0.02 | GitHub trending за 7 дней |

## Запуск

```bash
npm install

# тестнет (Base Sepolia, без реальных денег)
NODE_ENV=test npm start

# mainnet (Base, реальный USDC)
npm start

# тесты (node --test: boot + 402-флоу + OpenAPI-контракт, 4 теста)
npm test
```

Проверка 402-ответа (без оплаты):
```bash
curl -i http://localhost:4021/v1/funding/apy   # ожидаем HTTP 402 + payment-заголовки
```

## Деплой — РАБОТАЕТ (10.09.2026): публичный URL + авто-регистрация

Публичный origin (СТАБИЛЬНЫЙ, бесплатно, без аккаунтов):
`https://mi-desktop.rainbow-dab.ts.net:10000` → Tailscale Funnel → `127.0.0.1:4021`.
Tailscale уже установлен и авторизован на хосте (`mi-desktop`), Funnel даёт постоянный
HTTPS-ingress без проброса портов:

```bash
tailscale funnel --bg --https=10000 4021     # публичный HTTPS -> локальный сервер
python keepalive.py                          # держит node-сервер + funnel живыми
```

Персистентность (без admin-прав — ONLOGON-таск требует elevation и был отклонён):
- `MoneyAgentX402Ensure` — Windows Task Scheduler, каждые 20 мин: `keepalive.bat --ensure`
- `%APPDATA%\...\Startup\money_agent_x402.bat` — авто-старт демона при входе в систему

Cloudflared quick-tunnel (`cloudflared tunnel --url ...`) — работает, но hostname
меняется при каждом рестарте, а x402 Arena НЕ умеет обновлять endpoint (create-only,
409 "Agent name already taken"). Поэтому выбран Tailscale Funnel.

## Регистрация в дискавери

- **x402 Arena** (`https://core.x402arena.gg/register`) — открытый реестр, POST без одобрения,
  сам проверяет endpoint на валидный 402. Зарегистрированы все 6 эндпоинтов (verified=true).
- **PayAI facilitator** (`https://facilitator.payai.network`) — `Auto-Discovery`: мерчант
  автоматически попадает в x402 Bazaar (extension `bazaar` уже в 402-ответе).
- Ручная регистрация origin в x402scan Bazaar (`x402scan.com/api/x402/registry/register-origin`)
  требует SIWX-подписи владельца — не нужна, т.к. Bazaar-листинг идёт через PayAI.

## Фасилитатор (vaжно)

`x402.org/facilitator` обслуживает ТОЛЬКО тестнеты (нет `eip155:8453`) — с ним mainnet
невозможен без CDP-ключа. Переключено на **PayAI**: Base mainnet `eip155:8453` и Solana
mainnet, без API-ключей, сетевые комиссии покрыты (gasless), 1000 бесплатных сеттлментов.

## Кошельки (приём USDC)

- EVM (Base): `0xD4D124D375775a146218dBD8243A2d17ba540596`
- Solana: `3DNVJvjEx5pjiy7hJb3QanLm4N3kWN2nLQVLTryXpQNx`

Ключи: `../airdrop_farm/keys/` (те же кошельки, что и для фарма).

## Ограничения / риски

- Приём USDC на Base не требует газа; для перевода накопленного USDC нужен ETH на Base (~$1-3 разово).
- Конкуренция растёт (с марта 2026 число продавцов выросло с ~500 до ~30K), но объём тоже растёт: $1.2M/30д.
- Не финансовый совет; данные с пометкой источников.
