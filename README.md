# ANGELUS

Agents that read tokenized stocks while Wall Street is closed, publish an estimate of the next official opening price ("the Bell"), and grade themselves at the bell.

## Run

```bash
npm install
npm run dev -- -p 3217
```

No keys are needed locally. Calls and nightly locks are stored as JSON in `.data/`.

## Data

- Live pool prices: DexScreener (`token-pairs/v1`), Robinhood Chain, Solana (xStocks), Ethereum (Ondo).
- Official daily open/close: Yahoo Finance chart API.
- Hourly history for the replayed record: GeckoTerminal (rate limited, roughly one request a minute when busy).

## The record

- `src/data/record.json` is the replayed history shipped with the build. Rebuild it locally with `GET /api/cron/record` on the dev server (slow, resumable; candles are cached in `.data/`), then copy `.data/record.json` over it.
- In production, `/api/cron/lock` stores the board at 04:00 ET each night (Vercel cron at 08:00 and 09:00 UTC; only the run inside the hour after 04:00 ET acts). The official open settles it when the record is read.

## Deploy (Vercel)

The full launch, step by step with scripts, is in [DEPLOY.md](DEPLOY.md). The summary:

Keys and accounts needed:

1. Supabase project: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (no service-role key). Generate `ANGELUS_DB_TOKEN` (long random string), run `supabase/schema.sql`, then `select private.angelus_set_token('<token>');`. The tables are closed to the publishable key; the site reads and writes only through the `angelus_*` functions, which check the token.
2. `CRON_SECRET`: any long random string.
3. `NEXT_PUBLIC_SITE_URL`: the production domain.
4. `NEXT_PUBLIC_TOKEN_CA`: only after the token launches.
5. `NEXT_PUBLIC_REOWN_PROJECT_ID` (optional): WalletConnect for phone users without a wallet browser.
6. `ANTHROPIC_API_KEY` (optional): turns on the Vigil, one short note per stock written by Claude Opus 5.5 at the 04:00 ET lock, with server-side refusal fallback enabled. One request per night.
7. `NEXT_PUBLIC_BELL_REGISTRY`, `KEEPER_PRIVATE_KEY`, `ROBINHOOD_RPC_URL` (optional): the nightly on-chain seal, below.

Without Supabase the site still renders, but calls cannot be saved and nightly locks are not kept.

## The on-chain seal (contracts/)

`contracts/src/BellRegistry.sol` keeps one receipt per night on Robinhood Chain (chain ID 4663): the digest of each stock's prior close and Bell, written at the 04:00 ET lock. The contract refuses a seal after 13:30 UTC on the session day (never later than the 09:30 ET open), accepts one per night, only moves forward, cannot edit or delete, and holds no funds. `/api/seals` lists every seal with the numbers sent, so anyone can rebuild the digest.

```bash
cd contracts
forge install foundry-rs/forge-std --no-git   # once
forge test
OWNER=0x... KEEPER=0x... forge script script/Deploy.s.sol --rpc-url robinhood --broadcast --private-key <deployer key>
```

OWNER should be a cold wallet: it can only rotate the keeper. KEEPER is the hot key on the server; it needs a little ETH for gas (about 140k gas a night). Then set the three variables above and redeploy. The lock never fails because of the seal: if a seal does not land, the second cron run retries it.

After the first deploy, run `supabase/cron.sql` (with the site URL and `CRON_SECRET` filled in). It calls the lock at exactly 08:00 and 09:00 UTC from Supabase. Vercel's Hobby crons can fire anywhere inside their hour, which could lock as late as 04:59 ET; the Vercel crons stay as a backup and a repeat call does nothing.
