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
```

Проверка 402-ответа (без оплаты):
```bash
curl -i http://localhost:4021/v1/funding/apy   # ожидаем HTTP 402 + payment-заголовки
```

## Деплой

Локально + Cloudflare quick tunnel (бесплатно, без аккаунта):
```bash
cloudflared tunnel --url http://localhost:4021
# получить URL вида https://xxx.trycloudflare.com -> зарегистрировать в Bazaar
```

Платный хостинг (стабильный URL, рекомендуется после валидации):
- Railway $5/мес (git-деплой, Dockerfile приложен)
- Render free tier (спит после 15 мин idle — для 402-флоу лучше paid)
- Vercel/Cloudflare Workers (нужна адаптация middleware, см. docs.x402.org)

## Регистрация в Bazaar (дискавери)

Листинг уже объявлен через `declareDiscoveryExtension` в route-конфиге — при работе через x402.org/facilitator эндпоинты автоматически видны в x402scan. Дополнительно: https://www.x402scan.com/resources/register

## Кошельки (приём USDC)

- EVM (Base): `0xD4D124D375775a146218dBD8243A2d17ba540596`
- Solana: `3DNVJvjEx5pjiy7hJb3QanLm4N3kWN2nLQVLTryXpQNx`

Ключи: `../airdrop_farm/keys/` (те же кошельки, что и для фарма).

## Ограничения / риски

- Приём USDC на Base не требует газа; для перевода накопленного USDC нужен ETH на Base (~$1-3 разово).
- Конкуренция растёт (с марта 2026 число продавцов выросло с ~500 до ~30K), но объём тоже растёт: $1.2M/30д.
- Не финансовый совет; данные с пометкой источников.
