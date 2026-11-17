# ANGELUS

Wall Street sleeps sixteen hours a day. Its stocks keep trading through all of them, as tokens on public blockchains.

ANGELUS reads those after-hours tokens and publishes, every night, where each stock should open at 09:30 ET: **the Bell**. At the open it grades itself against the official price, in public, every morning.

X: [@useangelus](https://x.com/useangelus)

## How it works

- **16 stocks.** NVDA, TSLA, AAPL, MSFT, AMZN, META, GOOGL, AMD, PLTR, COIN, MSTR, CRCL, NFLX, AVGO, SPY, QQQ.
- **Three chains.** Tokenized versions trade on Robinhood Chain (Robinhood), Solana (xStocks) and Ethereum (Ondo). Every pool is read live from DexScreener.
- **Three agents.** Lauds averages the chains by pool depth, Terce splits the move into market and stock-specific parts, and Compline learns how far night books misjudge the size of a move. The Bell blends them, weighting each by its recent error against real opens: an agent that misses more is heard less.
- **04:00 ET lock.** The night's numbers are frozen before the bell, so the score cannot be adjusted after the fact.
- **09:30 ET grade.** The official open settles every Bell. The miss, in basis points, goes on the public record.
- **Calls.** Anyone can call over or under the Bell by signing a plain message with a wallet. Free: no transaction, no gas, no deposit and no prizes.

The full method, every formula and the clock are on the site's Method page (`/docs`).

## Open data

| Endpoint | What it returns |
|---|---|
| `/api/bell.json` | Tonight's Bell for every stock, each agent's estimate and weight, the price and depth on every chain, and the record so far |
| `/api/seals` | Every on-chain seal with the numbers sent, so anyone can rebuild the digest |
| `/api/health` | Whether price sources and storage are up |

## On-chain seal

`contracts/src/BellRegistry.sol` keeps one receipt per night on Robinhood Chain (chain ID 4663): the digest of each stock's prior close and Bell, written at the 04:00 ET lock.

- It refuses a seal after 13:30 UTC on the session day, which is never later than the 09:30 ET open.
- One seal per night, only forward in time, no edit or delete, and no funds held.
- Not deployed yet. Until it is, locked numbers are published on the nightly edition and at `/api/bell.json`.

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge test
```

## Built with

Next.js 16, three.js for the belfry, viem and WalletConnect for signed calls, Supabase (behind token-checked SQL functions, no service-role key), Foundry for the contract, and Remotion for the film in `video/`.

## Run it yourself

```bash
npm install
npm run dev
```

No keys are needed: prices come from public APIs, and calls and nightly locks are stored as JSON in `.data/`. Optional variables are listed in `.env.example`; the full launch steps are in [DEPLOY.md](DEPLOY.md).

## Disclaimer

ANGELUS publishes estimates, not investment advice. It is independent and not affiliated with Robinhood, Nasdaq, NYSE, any listed company or any token issuer. Company names and logos belong to their owners.
