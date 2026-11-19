<p align="center">
  <img src="public/favicon.svg" width="64" height="64" alt="ANGELUS">
</p>

<h1 align="center">ANGELUS</h1>

<p align="center"><b>The stock market's night, priced.</b></p>

<p align="center">
  <a href="https://angelus-rho.vercel.app">Live site</a> ·
  <a href="https://angelus-rho.vercel.app/docs">Method</a> ·
  <a href="https://angelus-rho.vercel.app/record">Record</a> ·
  <a href="https://angelus-rho.vercel.app/api/bell.json">Open data</a> ·
  <a href="https://robinhoodchain.blockscout.com/address/0x8c4dD82cB1560B3f4DC5293e2C159DeD2a5b9ccf">Contract</a> ·
  <a href="https://x.com/useangelus">@useangelus</a>
</p>

---

Wall Street trades six and a half hours a day. For the other seventeen and a half, its stocks keep trading as tokens on public blockchains.

ANGELUS reads those overnight markets and publishes, every weekday night, where each of sixteen US stocks should open at 09:30 ET. That number is **the Bell**. It is locked before the market opens, sealed on Robinhood Chain, and graded against the official open in public, every morning, whether it was right or not.

## Contents

- [How a night works](#how-a-night-works)
- [Coverage](#coverage)
- [The agents](#the-agents)
- [Track record](#track-record)
- [On-chain seal](#on-chain-seal)
- [Calls](#calls)
- [Open data](#open-data)
- [Architecture](#architecture)
- [Running locally](#running-locally)
- [Deployment](#deployment)
- [Security](#security)
- [Disclaimer](#disclaimer)

## How a night works

| Time (ET) | Event | What happens |
|---|---|---|
| **16:00** | Closing bell | The exchange closes. Tokens keep trading. Estimates start moving and calls open for the next morning. |
| **04:00** | The lock | Every number for the morning is frozen and published, and its digest is sealed on Robinhood Chain. Calls close. |
| **09:30** | Opening bell | The official open settles every Bell. Each miss, in basis points, is added to the public record. |

Nothing published at the lock can be changed afterwards, so every score is checked against numbers that were public before Wall Street opened.

## Coverage

**Sixteen stocks:** NVDA, TSLA, AAPL, MSFT, AMZN, META, GOOGL, AMD, PLTR, COIN, MSTR, CRCL, NFLX, AVGO, SPY, QQQ.

**Three chains:**

| Chain | Issuer | Source |
|---|---|---|
| Robinhood Chain | Robinhood | Every pool, read live from DexScreener |
| Solana | xStocks | Every pool, read live from DexScreener |
| Ethereum | Ondo | Every pool, read live from DexScreener |

Official daily opens and closes come from a public market-data feed; hourly history for the chart and the replayed record comes from GeckoTerminal.

## The agents

Three agents read the same night in different ways. The Bell blends them.

| Agent | Thesis | Method |
|---|---|---|
| **Lauds** | Every chain is a witness. Ask all of them. | Takes the stock's price on all three chains, sets aside any chain that is too shallow or drifts more than 1% from the others, and averages the rest weighted by the square root of pool depth. |
| **Terce** | Most of a stock's night is the market's night. | Splits the move since the close into a market part (from the SPY token and the stock's 60-day beta) and a stock-specific part kept at half weight. |
| **Compline** | Night books misjudge the size of a move. Learn by how much. | Scales the Robinhood Chain move by how much of it this stock's real opens have kept in the past: below 1 the night overshoots, above 1 it undershoots. |
| **The Bell** | Trust each agent as much as it has earned. | Weights each agent by the inverse square of its recent error against real opens. An agent that misses more is heard less. |

Every formula is written out on the [Method](https://angelus-rho.vercel.app/docs) page and implemented in [`src/lib/agents.ts`](src/lib/agents.ts).

## Track record

40 mornings, September 22 to November 16, 2026, 546 graded opens. Average absolute miss against the official open, in basis points (lower is better):

| Estimate | Average miss | Right direction |
|---|---:|---:|
| **The Bell** | **107.7 bp** | **71.8%** |
| Lauds | 107.9 bp | 70.7% |
| Compline | 110.9 bp | 70.1% |
| Terce | 120.3 bp | 68.4% |
| Opens where it closed | 149.4 bp | |

The Bell beats "it opens where it closed" on 13 of 16 stocks. On the three quietest (AAPL, MSFT, SPY) it does not, and the site says so.

Nights before ANGELUS went live are **replayed** from hourly pool history and official prices, using only data available before each night; nights since launch are **locked live**. The record page labels which is which. The live figures are always at [`/record`](https://angelus-rho.vercel.app/record) and [`/api/bell.json`](https://angelus-rho.vercel.app/api/bell.json).

## On-chain seal

[`BellRegistry`](contracts/src/BellRegistry.sol) keeps one receipt per night on Robinhood Chain (chain ID 4663).

| | |
|---|---|
| **Address** | [`0x8c4dD82cB1560B3f4DC5293e2C159DeD2a5b9ccf`](https://robinhoodchain.blockscout.com/address/0x8c4dD82cB1560B3f4DC5293e2C159DeD2a5b9ccf) (source verified) |
| **Digest** | `keccak256(abi.encode(uint32 session, bytes8[] tickers, uint64[] closes, uint64[] bells))`, prices in USD with 6 decimals, tickers ascending |
| **Deadline** | Refuses any seal after 13:30 UTC on the session day, which is never later than the 09:30 ET open |
| **Rules** | One seal per night, only forward in time, no edit, no delete, holds no funds |
| **Roles** | A cold owner that can only rotate the keeper; a hot keeper on the server that seals at 04:00 ET |

To check a night yourself, take its numbers from [`/api/seals`](https://angelus-rho.vercel.app/api/seals), rebuild the digest and compare it with `sealOf(session)`, or call `verify(...)` on the contract.

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge test          # 21 tests
```

## Calls

Anyone can call over or under the Bell on any of the sixteen opens, from the closing bell until 04:00 ET, by signing a plain-text message with a wallet. There is no transaction, no gas, no deposit and no prize. Calls are recorded once, cannot be edited, are settled by the official open, and appear on a public season table.

## Open data

No key, no account, CORS open.

| Endpoint | Returns |
|---|---|
| [`GET /api/bell.json`](https://angelus-rho.vercel.app/api/bell.json) | Tonight's Bell for every stock, each agent's estimate and weight, price and depth on every chain, and the record |
| [`GET /api/seals`](https://angelus-rho.vercel.app/api/seals) | Every on-chain seal with the numbers sent |
| [`GET /api/health`](https://angelus-rho.vercel.app/api/health) | Status of the price sources, storage and the nightly lock |

```bash
curl -s https://angelus-rho.vercel.app/api/bell.json | jq '.stocks[] | {ticker, close, bell}'
```

## Architecture

```
src/
  app/            Pages (board, stock, record, calls, edition, watch, flow, method, token) and the API routes
  components/     The 3D belfry and mark (three.js), charts, call sheet, share cards
  lib/
    sources.ts    Every pool on three chains, with a last-good fallback when a source is down
    agents.ts     Lauds, Terce, Compline and the blend
    record.ts     How each morning is graded
    seal.ts       Building and sending the nightly seal
    store.ts      Storage: Supabase in production, JSON files locally
contracts/        BellRegistry (Foundry): contract, tests, deploy script
supabase/         Schema (closed by RLS, reached only through token-checked functions) and the 04:00 ET cron
scripts/          Secrets, environment, database and smoke-test helpers
video/            The ANGELUS film (Remotion), with its sound credits
```

**Stack:** Next.js 16, React 19, three.js, viem and WalletConnect, Supabase (Postgres, pg_cron, pg_net), Foundry, Vercel.

## Running locally

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

No keys are needed. Prices come from public APIs, and calls and nightly locks are stored as JSON in `.data/`. Every optional variable is listed in [`.env.example`](.env.example).

| Command | Does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `node scripts/smoke.mjs <url>` | Checks every page, the health endpoint and that the bells are priced |

## Deployment

The full launch runbook, step by step, is in [DEPLOY.md](DEPLOY.md): Supabase, Vercel, the exact-time cron, the on-chain seal and the production smoke test.

## Security

- The database tables are closed to the public key by row-level security. The site reads and writes only through `angelus_*` SQL functions that check a server-side token. No service-role key is used anywhere.
- Calls are signatures over a plain message; ANGELUS never asks for a transaction, an approval or a private key.
- The keeper key can only seal the current night inside the contract's window. The owner, a cold wallet, can rotate it.
- Security headers (CSP frame-ancestors, HSTS, nosniff, referrer and permissions policies) are set in [`next.config.ts`](next.config.ts).

## Disclaimer

ANGELUS publishes estimates, not investment advice. It is independent and not affiliated with, endorsed by or sponsored by Robinhood, Nasdaq, NYSE, any listed company or any token issuer. Company names, tickers and logos belong to their owners. See the [Terms](https://angelus-rho.vercel.app/terms).
