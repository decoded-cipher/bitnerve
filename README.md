# BitNerve

AI-powered crypto trading engine for perpetual futures — built for precision, speed, and nerve, driven by Claude through the Model Context Protocol.


## 🧠 What is BitNerve?

**BitNerve** is an **AI trading platform** designed to run AI models against **live crypto markets** (currently through the **CoinSwitch API**) to explore how intelligent systems behave under financial pressure.

It’s not a trading bot in the conventional sense.  
It’s a **playground for market intelligence** — a laboratory where each model gets its own chance to prove its nerve.

In short:

> _BitNerve is where AI meets market volatility, and the charts tell the story of survival._


## 🔍 What It Does

- Connects to **CoinSwitch Exchange APIs** for live market data on USDT-margined perpetual futures.
- Hands a model the full market picture each cycle and lets it decide: open, manage, or stay flat.
- Simulates execution against **live prices** — positions, margin, leverage, realized and unrealized PnL are all modelled against real marks.
- Tracks positions, PnL, risk metrics and the agent's own reasoning through a unified dashboard.

**Trading is simulated.** Market data is live, but no order ever reaches the exchange — every position is booked by the paper-trading engine in `server/src/lib/exchange/helper.ts`. There is no live execution path wired today.


## ⚙️ How It Works

BitNerve runs on the **Model Context Protocol**. Instead of the bot calling an LLM API, the relationship is inverted: BitNerve *is* an MCP server exposing trading tools, and Claude Code connects to it as the client. That means the model runs on a **Claude Code subscription** — no API credits required.

One cycle looks like this:

```
bun run brief   →  fetches market data, marks open positions to market,
                   snapshots the account, and prints the complete prompt

claude -p "<brief>"  →  reasons over it and calls back into the MCP server
                        to open, close, or record its analysis
```

The brief carries everything the model needs in a single prompt — account state, a comparison table across every tracked symbol, and the full indicator series for each. There is **no scoring, ranking or bias applied in code**: the screen reports measurements, and the model does the judging. That's deliberate, and it's the main design principle here.

Four tools are exposed:

| tool | purpose |
|---|---|
| `create_position` | open a long or short, with exchange constraints enforced |
| `close_position` | close fully or partially at the live mark |
| `record_analysis` | persist the cycle's reasoning for the dashboard |
| `record_lesson` | save a durable observation, carried into every future cycle |

The brief also carries the account's recent closed trades with the fee each one paid, the previous cycle's conclusion, and the saved lessons — the model's only memory between otherwise independent cycles.

The `accounts` table is keyed on `(provider, model_name)`, so several models can run side by side with independent balances and histories. Today one does.


## 🚀 Getting Started

**Prerequisites:** [Bun](https://bun.sh) 1.3+, Node 20+, Docker, and the [Claude Code CLI](https://claude.com/claude-code) with an active subscription.

```bash
# 1. Start Postgres
docker compose up -d postgres

# 2. Configure the server
cp server/.env.example server/.env     # then fill in your CoinSwitch keys
cd server && bun install

# 3. Create the schema
bun run db:migrate

# 4. Refresh exchange constraints (min sizes, leverage caps, fees)
bun run symbols:sync

# 5. Configure and start the dashboard
cd ../client && npm install
cp .env.example .env                   # set NUXT_NODE_ENV=development for local Postgres
npm run dev                            # http://localhost:3000
```

### Environment

| variable | purpose |
|---|---|
| `COINSWITCH_API_KEY` / `COINSWITCH_SECRET_KEY` | exchange credentials (market data) |
| `POSTGRES_*` | local database connection |
| `DB_CONNECTION_STRING` | used instead of `POSTGRES_*` when `NODE_ENV=production` |
| `INITIAL_BALANCE` | starting balance, applied **only** when the account is first created |
| `TRADING_PROVIDER` / `TRADING_MODEL` | recorded against every trade — keep in sync with `--model` |

Which symbols are traded lives in `server/src/config/symbols.json`, owned by the backend. The frontend never decides.


## ▶️ Running a Cycle

```bash
claude -p "$(cd server && bun run --silent brief)" \
  --append-system-prompt "$(cat server/prompts/system.md)" \
  --mcp-config .mcp.json \
  --strict-mcp-config \
  --model claude-opus-5 \
  --allowed-tools "mcp__bitnerve__create_position mcp__bitnerve__close_position mcp__bitnerve__record_analysis mcp__bitnerve__record_lesson" \
  --output-format text
```

`--strict-mcp-config` matters — without it, every other MCP server you have configured loads into the trading session too.

The dashboard needs **two** cycles before the chart can draw a line, since one snapshot isn't a series.

### Scheduling

`run-cycle.sh` wraps the above with a PID lock (a slow cycle never collides with the next tick), an explicit `PATH` and `NODE_EXTRA_CA_CERTS`, and logging to `.cycle.log`.

```bash
cp com.bitnerve.cycle.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.bitnerve.cycle.plist
tail -f .cycle.log
```

`StartInterval` is in seconds, and it defaults to 15 minutes. **Be deliberate about it** — the dominant timeframe is 4h, so most cycles see an unchanged 4h series and exist to manage open positions rather than to open new ones. Each cycle also consumes a slice of a subscription's limits, so 96 runs a day adds up.


## 🗂 Project Layout

```
server/
  src/mcp/          MCP server, session state, brief assembly, market rendering
  src/lib/exchange/ CoinSwitch client, indicators, paper-trading engine
  src/config/       database schema and migrations, tracked symbols
  prompts/          the system prompt the model is given
client/             Nuxt 3 dashboard reading the same Postgres database
```

The two `schema.ts` files are kept identical by `bun run schema:sync` — edit the server copy, never the client one.


## 🌱 Why BitNerve Exists

Most “AI trading” platforms today either hide behind proprietary models or oversimplify what “AI” really means.  
BitNerve was built for a different purpose:

- To **democratize the experiment** — anyone can run and compare models locally or remotely.  
- To **visualize decision-making** — each AI is transparent, auditable, and accountable.  
- To **push model boundaries** — from simple LLMs to hybrid systems mixing rule-based risk logic with AI intuition.  
- To **treat trading as a behavioral study** — of models, not markets.

> The goal isn’t to automate profits.
> It’s to watch intelligence evolve under pressure.


## 🧭 The Roadmap Ahead

BitNerve was built in a single weekend — but its future will evolve far beyond that.

### 🔹 Immediate Goals
- Expand **multi-model orchestration** — run several agents side-by-side on the same market.
- Charge **funding** in the simulator; the rate is synced from the exchange and shown to the model, but not yet deducted.
- Improve **dashboard telemetry** — model performance heatmaps, per-symbol stats, and risk overlays.
- Integrate **local model execution** via **Ollama** and **LM Studio**.

### 🔹 Medium-Term Goals
- Add **dynamic asset allocation** — let the model pick from the exchange's full catalogue instead of a fixed watchlist.
- Introduce **replay & backtest modes** to simulate sessions using recorded market data.
- Enable **risk governors** — per-model drawdown caps, kill-switches, and automatic cool-downs.
- Support **ensemble trading**, where multiple AI votes combine into a consensus trade.

### 🔹 Long-Term Vision
- Connect to **more exchanges** (Backpack, Lighter, Binance, Bitget, OKX) via a pluggable adapter layer.
- Open a **public leaderboard** for AI trading agents to compete in live markets.
- Publish **research findings** on AI behavior in live markets.


## 🧩 Philosophy

> “Markets are the best Turing tests.”

BitNerve treats the market as a real-world benchmark for intelligence — not accuracy on a dataset, but resilience in uncertainty. Every trade, loss, or hesitation is a behavioral datapoint.

AI isn’t judged by profit alone. It’s judged by how it **thinks**, **adapts**, and **recovers** — when everything goes wrong.


## ⚠️ Disclaimer

**BitNerve is experimental software.**  
It’s meant for research, not financial advice or guaranteed performance.

- Trading crypto and perpetual futures involves significant risk.  
- Execution is simulated today; treating its results as a live track record would be a mistake, not least because fees aren't charged yet.
- The system may behave unpredictably under real conditions.  
- Always assume your AI will make mistakes — that’s the point of the experiment.


## 💬 Final Thought

> Built over a single weekend.  
> Inspired by Alpha Arena.  
> Powered by curiosity, not greed.

BitNerve began as a spark — an attempt to explore how AI behaves when the numbers stop being theoretical. Now it’s evolving into a transparent, experimental playground for intelligent trading systems.
