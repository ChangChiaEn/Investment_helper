# 台股目標價追蹤器

由提供的「台股目標價追蹤器.zip」整合為 Sagafisc 的第 9 個研究工具。UI 保留原工具的深色版面與紅漲綠跌慣例，改用 Next.js 頁面和 API routes，不需另啟 Express / Vite 服務。

## 使用

- 從側邊欄或首頁選擇「台股目標價追蹤器」，路徑為 `/tools/tw-stock-target`，也可在設定中設為首頁。
- 輸入台股代號，例如 `2330`、`0050`、`006208`。未指定市場時，先查上市 `.TW`，再查上櫃 `.TWO`；可用 `6488.TWO` 明確指定市場。
- 最多追蹤 50 檔股票。每檔可新增多組自訂目標價與標籤，依距離現價的百分比比較；若沒有目標價且 Yahoo 有資料，會帶入「法人目標價」。
- 追蹤分頁每 30 秒要求更新，也能手動同步。資料來源可能延遲，更新時間不代表交易所即時成交時間。
- 透過股票卡片的書籤加入平台關注清單，或點擊「深度分析」帶入 Gemini Stock Prophet。也支援 `?symbol=2330&name=台積電` 帶入追蹤。
- 目標價與追蹤股票保存在目前瀏覽器的 `sagafisc_tw_stock_targets`，會讀取舊工具的 `stock-targets` 作為初次遷移來源。新使用者從空清單開始，不預填示範目標價。
- 不需要 Gemini API Key、使用者登入或資料庫。平台其他 AI 分析工具仍需要使用者自己的 API Key。

## 潛力股掃描

以證交所最近 **5 個交易日** 的「外陸資買賣超股數（不含外資自營商）」篩選上市普通股；排除 ETF 與權證，不包含上櫃股票。

| 模式 | 條件 |
| --- | --- |
| 短線確認 | 最近交易日買超大於 1,000 張 |
| 波段趨勢 | 最近 5 個交易日累計買超大於 3,000 張 |
| 最強趨勢 | 同時符合以上兩項 |

僅列出有有效股價及法人目標價的標的，依 `(目標價 - 現價) / 現價 × 100%` 由大到小取前 20 檔。1 張以 1,000 股換算，負數賣超會納入累計。畫面顯示實際交易日期，避免把假日或尚未公布的當日資料當成「昨日」。若不足 5 個交易日或上游阻擋連線，會顯示錯誤，不產生不完整的五日結果。

## 資料來源與執行方式

- [Yahoo Finance](https://finance.yahoo.com/)：透過 [yahoo-finance2](https://github.com/gadicc/yahoo-finance2/tree/v3) 的 `quoteSummary` 取得股價及分析師目標價中位數。部分股票與 ETF 沒有分析師目標價。
- [證交所三大法人買賣超日報](https://www.twse.com.tw/zh/trading/foreign/t86.html)：外資買賣超與上市股票中文名稱。使用 `selectType=ALLBUT0999` 排除權證，避免下載與篩選無關的大量資料。
- 報價快取 30 秒、掃描結果快取 10 分鐘。首次掃描需依序讀取交易報告與多檔股票資料，可能耗時數分鐘。快取存於服務程序記憶體，重啟即清空。
- 上游服務可能有流量限制、延遲或存取封鎖；工具會提示無法取得資料，保留使用者設定。目標價為預測，僅供研究參考。

需要 Node.js 20+（建議 22 LTS），於 `frontend` 執行：

```bash
npm install
npm run dev
# 正式環境
npm run build
npm start
```

必須使用支援 **Next.js Node.js API routes** 的主機，並允許服務對外連線到 Yahoo Finance 與證交所。保持目前的 Next.js 伺服器模式；純靜態 `output: 'export'` 無法提供此工具的報價與掃描。掃描 route 的 `maxDuration` 為 300 秒，實際執行上限仍依主機方案。既有 FastAPI 與資料庫為獨立的選用功能。

| 方法 | 路徑 | 說明 |
| --- | --- | --- |
| GET | `/api/tw-stock-target/stocks?symbols=2330,6488.TWO` | 一次 1–50 個代號；可取得的報價陣列，全部失敗回傳 502 |
| GET | `/api/tw-stock-target/discover?mode=strong` | `short` / `swing` / `strong`；回傳 `stocks` 與 `tradingDates` |

無效參數回傳 400，上游錯誤回傳 502 與中文 `error` 訊息。資料來源請求均在伺服器執行，瀏覽器不直接連線上游。

## 驗證

```bash
cd frontend
npm run test:tw-stock-target
npx tsc --noEmit --incremental false
npm run build
```

測試以固定的上游回應驗證代號處理、上櫃 fallback、ETF 報價、漲跌幅換算、快取與部分失敗、三種外資篩選、交易日完整性、潛在漲幅排序及本機資料驗證；不依賴即時行情或外部網路。
