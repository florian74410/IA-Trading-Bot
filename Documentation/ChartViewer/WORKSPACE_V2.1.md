# ChartViewer / Indicator Studio / Drawing Tools — 2.1

Base: PR #7, `feature/indicator-visual-renderer-v2.1`, SHA `8907c6b2b89add55afacd0ccd441184f4981551e`.
Development branch: `feature/chartviewer-studio-drawing-v2.1`. Review as a **stacked draft PR targeting the Renderer branch**, so its diff contains only this UI change. Neither PR is authorized for merge or GEN-1 deployment.

## User behavior

The Trading IA native ChartViewer keeps its existing controller and market pipeline. Search filters the market's current symbol catalogue, including names/type when supplied; Enter selects the first match. Source and symbol lists come from Router capabilities and symbols responses. A catalogue error disables pairs and clears the old chart; it does not manufacture a fallback catalogue. When an old pair is unavailable, selection of the first real catalogue entry is explicitly announced in chat. Request generations suppress late catalogue/candle responses. Adjust, zoom and reset price scale operate on the existing native controller. Incoming chart refreshes no longer reset manual zoom.

Indicator Studio has registry search, categories, active indicators first, price/separate placement, states, hide/show, removal via checkbox, numeric/enum/series inputs and existing JSON import. Numeric inputs respect registry bounds and integer types. Parameters persist locally and participate in computation signatures, preventing old parameter responses from repainting newer settings. The existing selection list remains authoritative and retains its limit of eight. Hide/show only filters presentation; it does not create a second indicator engine. Series colors, widths, cloud opacity and per-series visibility stay in the existing V2 profiles; Studio explicitly says these visual editors are not exposed.

Drawing tools: navigation/crosshair, trend, horizontal, rectangle and Fibonacci; selection, endpoint handles, moving, targeted deletion, undo, redo and confirmed clearing. Drag to create a two-point drawing; click for a horizontal line. Selection mode captures pointer input, preventing simultaneous candle pan. Drag a white handle to edit an endpoint, or a line/rectangle to move the object. Escape cancels unfinished creation or a move; Delete/Backspace removes the selected object. Ctrl/Cmd+Z and Shift+Ctrl/Cmd+Z undo/redo outside form fields. Fibonacci labels include percentages and prices. Coordinates use real chart timestamps/prices and interpolate outside the visible window so objects are clipped instead of disappearing when one endpoint leaves view.

Drawings persist per `source|symbol|timeframe` in browser localStorage (120 objects/context, 60 history entries). Undo history is session/context local. Interval and candle-count preferences, indicator selection and inputs also use browser localStorage. They are local browser preferences, not server accounts or shared layouts. Storage failures do not interrupt charting. Changing timeframe intentionally shows a separate drawing set; returning restores that set. The legacy standalone TradingView page is outside this native Trading IA UI change.

## Files and integration

- `App/Frontend/Pages/app_v1.0.html`: three asset references; existing market catalogue and refresh safeguards; no backend API changes.
- `App/Frontend/JS/chart_workspace_v2.1.js`: toolbar extensions using existing controls/events.
- `App/Frontend/CSS/chart_workspace_v2.1.css`: toolbar, Studio and drawing dock styles, including narrow screens.
- `App/Frontend/JS/chart_drawing_v2.1.js`: extracted/completed overlay, local persistence and bounded history.
- `App/Frontend/JS/indicator_ui_v2.0.js`: Studio backed by existing registry/compute/import Router actions.
- `App/UI/Tests/test_trading_indicators_v204.js`: Firefox integration coverage extended for 2.1. The catalogue-wide test now counts separate panes and verifies price series separately, matching V2's intentional removal of price-only reader cards.
- `.github/workflows/chart-workspace-v21-tests.yml`: Node 22 / Firefox CI and fixture screenshot artifacts.

Existing public APIs/events remain: `IATBActiveChartController`, `IATBIndicatorUI`, `ia-tb:chart-candles-loaded`, `ia-tb:indicator-batch`, `ia-tb:indicator-json-batch`, control `change` events. Drawing debug state is inspectable via `IATBChartDrawingTools.state()`; `refresh()` repaints. Drawing projection reads existing `_geom` and `visibleRows()` without changing the controller or Renderer; this is an integration dependency to retest if chart geometry evolves. A lightweight animation-frame check redraws only on geometry/context changes. No calculation, V2 JSON definition, Renderer, Trading Engine, auth or account file is modified.

## Automated validation

Use Node 22, `npm ci --omit=dev` in `App`, and Playwright 1.62.1 with Firefox. Run registry mutation suites sequentially: parallel legacy tests temporarily create definitions in a shared directory and can race.

```sh
node --test --test-concurrency=1 \
 App/Indicators/Tests/test_indicator_engine.js \
 App/Indicators/Tests/test_indicator_settings_v1.js \
 App/Indicators/Tests/test_indicator_complete_v2.js \
 App/Indicators/Tests/test_indicator_ir_v2.js \
 App/Indicators/Tests/test_indicator_language_v2.js \
 App/Indicators/Tests/test_indicator_analysis_v1.js \
 App/Core/Communication/Tests/test_communication_router_v1.js \
 App/UI/Tests/test_indicator_visual_v2.js \
 App/UI/Tests/test_ui_contract_v2.js \
 App/UI/Tests/test_ui_routes_v2.js \
 App/UI/Tests/test_architecture_boundaries_v2.0.js \
 App/UI/Tests/test_engine_http_surface_v2.0.js \
 App/UI/Tests/test_marketdata_v2.0.js
node --test App/UI/Tests/test_trading_indicators_v204.js
```

In sandboxed containers the existing Firefox harness supports `IATB_FIREFOX_CONTAINER=1`. Set `IATB_QA_SCREENSHOTS=1` to produce `/tmp/iatb-ui-*.png` at 1440/768/390 px (Studio open and closed). These are clearly synthetic **test-only OHLCV fixtures**, never production feed fallbacks. The tests exercise actual browser assets, actual Indicator Engine computations, Router-shaped requests, resize/pan/zoom, warmup/error handling, stale results, imports, configured inputs, drawing gestures/history/context reload and failed catalogues.

The legacy `test_router_normalization_v1.8.12.js` fails on the untouched base as well: it expects Supervisor `RESERVED` while the protocol registry says `ACTIVE`. This unrelated backend assertion is retained unchanged. The live `test_indicator_cp1_v2.js` requires running Router and Market Data services and real market access; it cannot pass against an absent runtime and remains a pre-merge integration gate. These limitations are not waived by this UI PR.

## Local result (2026-10-16)

Node 22.23.3: 13 core/contract suites PASS with sequential registry tests; Firefox 18/18 integration tests PASS. The 120-object overlay fixture measured approximately 3.2 ms per repaint over 30 repaints on this container. Syntax and whitespace checks pass. Screenshots at 390/768/1440 px were inspected; the toolbar explicitly overrides the inherited desktop nowrap rule so its status and actions wrap. Renderer, controller, definition and calculation files have no diff against the verified base.

The Router normalization failure was reproduced in a separate checkout of the exact base SHA (`ACTIVE` versus expected `RESERVED`). The live CP/1 test was attempted without services and failed to connect; it is not counted among passing suites. CI results and real-market/manual checks must be reviewed separately from these local results.

## Firefox acceptance before merge / GEN-1

1. Start the complete local runtime under Node 22 and run the live CP/1 indicator test. Verify Router/Data Firewall behavior with real available sources; no browser calls directly to exchange APIs.
2. Select every actually supported source, including Binance/Kraken/OKX/GMX when advertised. Check real pair catalogues, names/type if present, unsupported pair announcement, empty catalogue, disconnected/disabled source and network errors. Rapidly alternate sources/pairs/timeframes; no late chart or indicator may cross contexts.
3. Display Ichimoku + VWAP: only overlays, no empty lower reader. Add RSI + MACD: synchronized lower panes, remove one independently. Inspect clouds/bands/SAR/histograms, warmup gaps, insufficient candles and missing volume. Import a new valid custom JSON and reject invalid/incompatible JSON through the real backend.
4. Draw each tool, move and edit handles, pan/zoom with one endpoint offscreen, resize, cancel, delete, undo/redo and confirm/dismiss clear. Return to another pair/source/timeframe and reload: only the matching drawings restore.
5. Check Studio keyboard search, Escape/focus return, toolbar at 390/768/1440 px, focus/restore, current OHLCV and continued updates with Studio closed. Check Fundamental and Settings visually. Verify JavaScript/CSS MIME and no page exceptions.
6. Inspect multiple indicators, hundreds of real candles and 120 drawings while the live feed updates. Local fixture timing is a regression check, not a live-feed performance certification. PR #7's remaining full Renderer QA still applies.

Integration risk: the shared Trading HTML and indicator UI may conflict with parallel changes. Keep this branch separate; compare newer Renderer commits and rerun these suites before any approved integration. There is no merge/deploy step in this workflow.
