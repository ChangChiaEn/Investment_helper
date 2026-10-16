const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

// Load the production TypeScript with isolated upstream clients and caches.
function load(file, overrides = {}) {
  const source = fs.readFileSync(path.join(__dirname, '../lib/tools/tw-stock-target', file), 'utf8')
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  })
  const module = { exports: {} }
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-10-15T04:00:00Z'])) }
    static now() { return new Date('2026-10-15T04:00:00Z').getTime() }
  }
  vm.runInNewContext(outputText, {
    module, exports: module.exports, Intl, AbortSignal, Date: FixedDate,
    setTimeout: callback => { callback(); return 0 },
    fetch: overrides.fetch || (() => { throw new Error('Unexpected network access') }),
    require: name => {
      assert.equal(name, 'yahoo-finance2')
      return class { quoteSummary = overrides.quoteSummary || (() => { throw new Error('No quote') }) }
    },
  }, { filename: file })
  return module.exports
}

const plain = value => JSON.parse(JSON.stringify(value))
const fields = ['證券代號', '證券名稱', '外陸資買賣超股數(不含外資自營商)']
const report = (date, rows) => ({ date, fields, data: rows })
const summary = (price = 100, target = 150) => ({
  price: { regularMarketPrice: price, regularMarketChange: 2.5, regularMarketChangePercent: 0.025,
    regularMarketTime: new Date('2026-10-15T05:30:00Z'), shortName: 'Test stock' },
  financialData: { targetMedianPrice: target },
})

test('accepts Taiwan stock codes and market suffixes, rejects unsupported input', () => {
  const service = load('service.ts')
  for (const code of ['2330', '0050', '006208', '00632R', '00403A.TW', '6488.TWO']) assert.equal(service.normalizeSymbol(code), code)
  assert.equal(service.normalizeSymbol(' 2330.tw '), '2330.TW')
  for (const code of ['', 'AAPL', '123', '2330.TW.TW', '2330,2317', '../2330', '1234567']) {
    assert.equal(service.normalizeSymbol(code), null)
  }
})

test('computes five-day net buying and distinguishes all three scan modes', () => {
  const service = load('service.ts')
  const days = [report('20261015', [
    ['2330', '台積電', '1,500,000'], ['2317', '鴻海', '500,000'],
    ['2454', '聯發科', '1,500,000'], ['0050', 'ETF', '9,000,000'], ['123456', '權證', '9,000,000'],
  ]), ...Array.from({ length: 4 }, (_, index) => report(String(index), [
    ['2330', '台積電', '500,000'], ['2317', '鴻海', '1,000,000'], ['2454', '聯發科', '-500,000'],
  ]))]
  assert.deepEqual(plain(service.selectCandidates(days, 'short')).map(stock => stock.symbol), ['2330', '2454'])
  assert.deepEqual(plain(service.selectCandidates(days, 'swing')).map(stock => stock.symbol), ['2330', '2317'])
  const strong = plain(service.selectCandidates(days, 'strong'))
  assert.equal(strong.length, 1)
  assert.equal(strong[0].netBuy5Day, 3_500_000)
})

test('strict thresholds exclude exactly 1000/3000 lots; changed TWSE schemas fail visibly', () => {
  const service = load('service.ts')
  assert.equal(service.selectCandidates([report('date', [['2330', '台積電', '1,000,000']])], 'short').length, 0)
  assert.equal(service.selectCandidates([report('date', [['2330', '台積電', '3,000,000']])], 'swing').length, 0)
  assert.throws(() => service.selectCandidates([{ fields: [], data: [], date: '' }], 'strong'), /欄位已變更/)
})

test('normalizes quote ratios, dates and targets, retaining the requested symbol', async () => {
  const service = load('service.ts', { quoteSummary: async () => summary() })
  const quote = await service.getQuote('2330.TW')
  assert.equal(quote.symbol, '2330.TW')
  assert.equal(quote.changePercent, 2.5)
  assert.equal(quote.updatedAt, '2026-10-15T05:30:00.000Z')
  assert.equal(quote.targetPrice, 150)
})

test('bare codes fall back to OTC, while explicit markets remain explicit', async () => {
  const calls = []
  const service = load('service.ts', { quoteSummary: async symbol => {
    calls.push(symbol)
    if (symbol.endsWith('.TW')) throw new Error('Not listed')
    return summary()
  } })
  assert.equal((await service.getQuote('6488')).symbol, '6488')
  assert.ok(calls.includes('6488.TWO'))
  calls.length = 0
  assert.equal(await service.getQuote('6488.TW'), null)
  assert.ok(calls.every(symbol => symbol === '6488.TW'))
})

test('funds without analyst data retain their price and do not invent a target', async () => {
  const service = load('service.ts', { quoteSummary: async (_symbol, options) => {
    if (options.modules.includes('financialData')) throw new Error('No financial data')
    return { price: summary().price }
  } })
  const quote = await service.getQuote('0050')
  assert.equal(quote.price, 100)
  assert.equal(quote.targetPrice, undefined)
})

test('quote caching coalesces concurrent requests and retains successful partial results', async () => {
  let calls = 0
  const service = load('service.ts', { quoteSummary: async symbol => {
    calls++
    if (symbol.startsWith('9999')) throw new Error('Unavailable')
    return summary()
  } })
  await Promise.all([service.getQuote('2330'), service.getQuote('2330')])
  await service.getQuote('2330')
  assert.equal(calls, 1)
  const quotes = await service.getQuotes(['2330', '9999'])
  assert.equal(quotes.length, 1)
  assert.equal(quotes[0].symbol, '2330')
})

test('ignores invalid prices and non-positive analyst targets', async () => {
  const noPrice = load('service.ts', { quoteSummary: async () => summary(0) })
  assert.equal(await noPrice.getQuote('2330'), null)
  const noTarget = load('service.ts', { quoteSummary: async () => summary(100, 0) })
  assert.equal((await noTarget.getQuote('2330')).targetPrice, undefined)
})

test('discovery skips weekends, ranks upside and caches five complete trading reports', async () => {
  const dates = []
  const service = load('service.ts', {
    fetch: async url => {
      dates.push(new URL(url).searchParams.get('date'))
      return { ok: true, json: async () => ({ stat: 'OK', fields, data: [
        ['2330', '台積電', '1,500,000'], ['2317', '鴻海', '1,500,000'],
      ] }) }
    },
    quoteSummary: async symbol => summary(100, symbol.startsWith('2317') ? 200 : 150),
  })
  const result = await service.discoverStocks('strong')
  assert.deepEqual(plain(result.tradingDates), ['20261015', '20261014', '20261013', '20261012', '20261009'])
  assert.equal(result.stocks[0].symbol, '2317')
  assert.equal(result.stocks[0].upside, 100)
  assert.equal(result.stocks[0].foreignNetBuy5Day, 7_500_000)
  await service.discoverStocks('strong')
  assert.equal(dates.length, 5)
})

test('missing TWSE reports and blocked upstream data fail instead of showing false empty scans', async () => {
  const missing = load('service.ts', { fetch: async () => ({ ok: true, json: async () => ({ stat: '很抱歉，沒有符合條件的資料!' }) }) })
  await assert.rejects(missing.discoverStocks('swing'), /完整的近 5 個交易日/)
  const blocked = load('service.ts', { fetch: async () => ({ ok: true, json: async () => { throw new Error('HTML WAF page') } }) })
  await assert.rejects(blocked.discoverStocks('strong'), /拒絕連線/)
})

test('storage recovers corrupt input and validates, deduplicates and caps persisted stocks', () => {
  const { loadTrackedStocks } = load('storage.ts')
  for (const input of [null, '{', '{}', 'null']) assert.equal(loadTrackedStocks(input).length, 0)
  const restored = loadTrackedStocks(JSON.stringify([
    { symbol: '2330', name: '台積電', targets: [
      { id: 'a', price: 1200, label: '自訂' }, { id: 'bad', price: -1, label: '' }, null,
    ] },
    { symbol: '2330', targets: [] }, { symbol: 'AAPL' }, null,
    { symbol: '6488.two', targets: [] },
  ]))
  assert.equal(restored.length, 2)
  assert.equal(restored[0].targets.length, 1)
  assert.equal(restored[0].targets[0].price, 1200)
  assert.equal(restored[1].symbol, '6488.TWO')
  assert.equal(loadTrackedStocks(JSON.stringify(Array.from({ length: 60 }, (_, i) => ({ symbol: String(1000 + i) })))).length, 50)
})
