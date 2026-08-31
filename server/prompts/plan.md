# Execution plan — in force until replaced

Derived from the 31 Aug run: 59 cycles, 21 closed round trips, 6 wins and 15 losses, -1,105.92 on a 10,000 account. Equity peaked at +6.38% and ended at -11.06%, a 16.6% round trip. Three numbers explain all of it. One position, re-averaged into eight times, lost 870 — 79% of the total. Fees came to 242, 22% of the loss, on 48 orders in 17 hours. And of 13 armed ladders the +1R rung filled twice; both of those trades made money and the other eleven lost.

The read was rarely the problem. The position management was.

## 1. Two rules are enforced in code — you cannot override them

- **Adding to a losing position is rejected.** `adjust_position` refuses any add while the position is underwater. Averaging down converts one sized loss into a compounding one. A loser is cut or held at its current size.
- **New entries are rejected more than 8% below the rolling 12-hour equity peak.** Closing, trimming, moving stops and adding to winners all still work. If you hit this, you do not argue with it — you manage what you hold until equity recovers or the peak ages out.

Do not spend a cycle designing a trade either rule will refuse.

## 2. Entry gate — both conditions, every time

- **4h and 1h trends agree in direction.** Every loss last run came from a 1h signal traded against a neutral or decaying 4h.
- **Stop distance ÷ round-trip fee >= 12x.** Below ~8x the symbol is untradeable at any size.

Budget the round trip as the quoted fee **plus ~0.2% slippage** — about 0.33% on majors, not the 0.13% shown. Name your target, state the ratio in `record_analysis`, and require target >= 4x that true cost.

A symbol failing exactly one gate is a named trigger for next cycle, never a reduced-size entry.

## 3. Time the entry on a turned 15m

Rank by which symbol's 15m has **stopped making new lows**, not by which has the cleanest 4h/1h structure. Best structure still falling is a watch, not a position. Take the ~85% size haircut only when entering against the immediate 15m direction or when 15m ATR3 > ATR14; buying a turned 15m fills near the mark even in a small cap.

## 4. Size from the stop, and check the rung is reachable

Pick the invalidation level first, then size so being stopped there costs **1.5-3% of equity**. R = (entry - stop) x quantity.

Arming a stop arms the ladder: **+1R** closes a third, **+1.5R** moves the stop to entry, **+2R** trails 1x 1h ATR3 behind the extreme. A watcher runs these on 1-minute bars between cycles, so they fire at the level whether or not you are looking.

**But check +1R is reachable before you enter.** A +1R rung further than ~1x the 1h ATR3 above entry will not be hit — the trade then has no profit-taking rung and is a coin flip on the stop. If +1R sits outside 1x ATR3, tighten the stop until R fits, or skip the trade. This is the single biggest gap in the last run.

## 5. Stops

Place a stop **below the swing it relies on**, never on top of it, and at least 1x the 15m ATR3 from the mark. Re-measure every inherited stop each cycle in **both** directions: under ~1x ATR3 it is noise and will be hit; beyond real structure it silently breaches the risk band. Move the stop to structure first, then size quantity around it. On any partial close, set the new stop from the **actual fill**, never the displayed mark.

Leave a winner alone only while its ratcheted stop is >= 1x the 15m ATR away. Closer than ~0.5x it is a market sell at a worse price — bank it yourself.

## 6. Cutting

Cut on the first failed thesis. The ladder measures from entry, so an underwater position has **no** automatic upside management — winners are managed by the watcher between cycles, losers only by you, on 15-minute snapshots. A loser is strictly more work and more risk than the same idea in profit.

Close when the trigger named at entry breaks, or when "would I open this fresh right now?" is no. Never hold to avoid an exit fee. After two losing round trips in one symbol, drop it for the session unless you can name a completed turn.

## 7. Concentration and churn

Per-position risk 1.5-3%, book 6-10%; a single qualifying idea may carry 5% alone. Choose leverage so margin lands near 35-40% of equity — margin footprint, not risk, is what forecloses a second idea. Never buy a ranked no-trade to fill the band.

**Frequency is not aggression.** 48 orders in 17 hours paid 242 in fees at a 28.6% win rate. A position touched more than three times — entry plus two adjustments — is being churned, not managed. A partial close pays the full round trip on the closed quantity, so size correctly at entry rather than trimming later.

More than 5% below the session equity peak, halve intended risk on every new entry.

## Reporting

Every `record_analysis` gives, per open position: R multiple, mark-to-stop risk as % of equity, whether +1R sits inside 1x the 1h ATR3, and which rule above fires next at what price.
