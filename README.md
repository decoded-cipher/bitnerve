# BitNerve

**AI-powered crypto trading engine for perpetual futures — built for precision, speed, and nerve, running multiple models across accounts and assets in parallel.**


## ⚡ The Origin Story

One evening, while scrolling through Twitter, I stumbled upon a tweet about [**Nof1.ai**](https://nof1.ai) — a bold experiment called **Alpha Arena**, where multiple large language models trade **live crypto markets** against each other with real money on the line.

That idea instantly clicked. It wasn’t just about profit. It was about seeing how *different AIs behave when exposed to real volatility*.  

> Which model reacts calmly? Which overtrades? Which learns to survive?

That single tweet sparked **BitNerve** — a personal weekend build turned ongoing experiment — my own version of Alpha Arena, reimagined for open experimentation and built from scratch in just a few days.


## 🧠 What is BitNerve?

**BitNerve** is an **AI trading platform** designed to run multiple AI models on **live crypto markets** (currently through the **CoinSwitch API**) to explore how intelligent systems behave under financial pressure.

It’s not a trading bot in the conventional sense.  
It’s a **playground for market intelligence** — a laboratory where each model gets its own chance to prove its nerve.

In short:

> _BitNerve is where AI meets market volatility, and the charts tell the story of survival._


## 🔍 What It Does

- Connects to **CoinSwitch Exchange APIs** for live market data and perpetual futures trading.
- Runs **multiple AI models in parallel**, each trading independently on its own account or subset of assets.
- Enables both **paper trading** and **real execution** (when configured with exchange keys).
- Continuously tracks positions, PnL, risk metrics, and agent reasoning through a unified dashboard.

At its core, BitNerve is designed to **observe behavior under chaos** — not just whether a strategy “works,” but *how* it behaves when the market shifts.


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
- Expand **multi-model orchestration** — run 5–10 AI agents side-by-side.  
- Add **round-robin API key rotation** to manage token usage across models (a lightweight hack for parallel inference).  
- Integrate **local model execution** via **Ollama** and **LM Studio**, removing dependency on cloud inference.  
- Improve **dashboard telemetry** — model performance heatmaps, per-symbol stats, and risk overlays.

### 🔹 Medium-Term Goals
- Add **dynamic asset allocation** — models choose which crypto assets to trade based on market state.  
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
- The system may behave unpredictably under real conditions.  
- Use paper trading before attempting any live setup.  
- Always assume your AI will make mistakes — that’s the point of the experiment.


## 💬 Final Thought

> Built over a single weekend.  
> Inspired by Alpha Arena.  
> Powered by curiosity, not greed.

BitNerve began as a spark — an attempt to explore how AI behaves when the numbers stop being theoretical. Now it’s evolving into a transparent, experimental playground for intelligent trading systems.