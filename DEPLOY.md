# Launching ANGELUS

Everything below is in order. Steps marked **(you)** need the owner's own account, wallet or decision; the rest is scripted.
Secrets live only in `.env.production.local` (git-ignored) and in Vercel. Nothing secret is committed.

## 0. Already done

- `node scripts/secrets.mjs` has created `ANGELUS_DB_TOKEN` and `CRON_SECRET` in `.env.production.local`.

## 1. Accounts (you)

1. **GitHub**: a new organisation or account for ANGELUS. The code repo is created **private**; one squashed commit.
2. **Vercel**: a new account (sign up with that GitHub). Pro is optional: Hobby works, with `supabase/cron.sql` keeping the 04:00 lock on time.
3. **Supabase**: a new account and project (any region near US East). Copy the project URL and the **publishable** key (Settings > API). No service-role key is used.
4. **Domain** (optional at first): without one, the site runs on `*.vercel.app`.

Add to `.env.production.local`:

```
SUPABASE_URL=https://<project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_SITE_URL=https://<domain>
```

`NEXT_PUBLIC_SITE_URL` is optional: without it the site uses Vercel's production domain. `--cron` in step 4 needs it.

## 2. Database

```bash
node scripts/supabase-sql.mjs
```

Paste `supabase/.generated.sql` into the Supabase SQL editor, run it, then delete the file. This creates the tables (closed by RLS), the `angelus_*` functions and stores the hash of `ANGELUS_DB_TOKEN`.

## 3. Repository and first deploy

```bash
git add -A && git commit -m "ANGELUS"        # one commit, no AI attribution
gh repo create <org>/angelus --private --source . --push
npx vercel@latest link                       # in a terminal logged in to the ANGELUS Vercel account
node scripts/vercel-env.mjs                  # pushes .env.production.local to Vercel (secrets as sensitive)
npx vercel@latest --prod
```

Then in Vercel: enable **Web Analytics** (the component is already in the layout) and add the domain if there is one.

## 4. The exact-time lock

```bash
node scripts/supabase-sql.mjs --cron
```

Run `supabase/.generated.sql` in the SQL editor once the site is live, then delete it. Supabase now calls `/api/cron/lock` at exactly 08:00 and 09:00 UTC; the Vercel crons stay as a backup.

## 5. Check production

```bash
node scripts/smoke.mjs https://<domain>
```

Every page 200, health `ok`, at least 12 of 16 bells priced. Point an uptime monitor (any free one) at `https://<domain>/api/health` (it answers 503 when a price source or storage is down).

## 6. Optional switches (each one is just a variable + redeploy)

| Variable | What it turns on | Where it comes from |
|---|---|---|
| `NEXT_PUBLIC_REOWN_PROJECT_ID` | WalletConnect for phones without a wallet browser | dashboard.reown.com (you) |
| `ANTHROPIC_API_KEY` | The Vigil: one short note per stock at the lock | console.anthropic.com (you) |
| `NEXT_PUBLIC_TOKEN_CA` | The $ANGELUS contract on `/token` | after the launch on Pons (you) |
| `NEXT_PUBLIC_BELL_REGISTRY`, `KEEPER_PRIVATE_KEY`, `ROBINHOOD_RPC_URL` | The nightly on-chain seal | step 7 |

X (`@useangelus`) and GitHub (`Useangelus/angelus`) are already wired in.

## 7. The on-chain seal (optional)

Needs **(you)**: an owner wallet (cold; it can only rotate the keeper), a keeper wallet (hot, on the server, a little ETH on Robinhood Chain for ~140k gas a night), and a deployer with a little ETH.

```bash
cd contracts
forge install foundry-rs/forge-std --no-git
forge test
OWNER=0x... KEEPER=0x... forge script script/Deploy.s.sol --rpc-url <provider RPC> --broadcast --private-key <deployer key>
```

Use a provider RPC (Alchemy, NodeFlare, Dwellir) for chain 4663: the public `rpc.mainnet.chain.robinhood.com` is rate-limited, and some local networks cannot reach `*.chain.robinhood.com` at all. Set the three variables, redeploy, and the next 04:00 lock is sealed. `/api/seals` lists every seal.

## 8. After launch

- Put the site link in the @useangelus bio.
- Post the 15 s teaser (rendered from `video/`).

## Decided

- **Calls have no prizes** (owner, 2026-11-18). The season table is for the record only; Terms say so.
