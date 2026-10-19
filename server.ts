import express, { Request, Response } from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { handleMarketProxy } from './src/lib/market/proxyHandler'
import { getQuotes, normalizeSymbol, discoverStocks, isScanMode } from './src/lib/tools/tw-stock-target/service'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = 3000
const HOST = '0.0.0.0'

app.use(cors())
app.use(express.json())

// --- Health check ---
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

// --- Market Proxy GET endpoint ---
app.get('/api/market-proxy', async (req: Request, res: Response) => {
  const source = (req.query.source as string) || ''
  const targetPath = (req.query.path as string) || ''
  const query = (req.query.query as string) || undefined

  try {
    const result = await handleMarketProxy(source, targetPath, query)
    res.status(result.status).json(result.body)
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || 'Proxy error' })
  }
})

// --- Taiwan Stock Target: Quotes ---
app.get('/api/tw-stock-target/stocks', async (req: Request, res: Response) => {
  const raw = ((req.query.symbols as string) || '').split(',').filter(Boolean)
  const symbols = Array.from(new Set(raw.map(normalizeSymbol).filter((s): s is string => !!s)))

  if (!raw.length || raw.length > 50 || symbols.length !== raw.length) {
    return res.status(400).json({ error: '請提供 1–50 個有效的台股代號（支援 .TW 與 .TWO）。' })
  }

  try {
    const quotes = await getQuotes(symbols)
    if (!quotes.length) {
      return res.status(502).json({ error: '無法取得報價，請檢查股票代號或稍後重試。' })
    }
    res.setHeader('Cache-Control', 'no-store')
    return res.json(quotes)
  } catch (error) {
    return res.status(502).json({ error: '報價服務暫時無法使用，請稍後重試。' })
  }
})

// --- Taiwan Stock Target: Discover ---
app.get('/api/tw-stock-target/discover', async (req: Request, res: Response) => {
  const mode = (req.query.mode as string) || 'strong'
  if (!isScanMode(mode)) {
    return res.status(400).json({ error: '不支援的掃描模式。' })
  }

  try {
    const result = await discoverStocks(mode)
    res.setHeader('Cache-Control', 'no-store')
    return res.json(result)
  } catch (error: any) {
    return res.status(502).json({ error: error?.message || '市場掃描暫時無法使用。' })
  }
})

// --- In-memory backend API fallback stores ---
interface WatchlistItemRecord {
  id: string
  user_id: string
  type: 'stock' | 'fund'
  symbol: string
  name: string
  source?: string
  created_at: string
  updated_at: string
}

interface AnalysisRecord {
  id: string
  user_id: string
  watchlist_id?: string
  tool: string
  result: Record<string, unknown>
  created_at: string
}

const inMemoryWatchlist: WatchlistItemRecord[] = []
const inMemoryAnalysis: AnalysisRecord[] = []

// --- Backend API: Auth Mock ---
app.post('/api/v1/auth/register', (req: Request, res: Response) => {
  const { email, name } = req.body || {}
  const mockToken = 'mock_jwt_access_token_' + Date.now()
  res.status(201).json({
    access_token: mockToken,
    refresh_token: 'mock_jwt_refresh_token',
    token_type: 'bearer',
    user: { id: 'usr-1', email: email || 'user@example.com', name: name || 'User' },
  })
})

app.post('/api/v1/auth/login', (req: Request, res: Response) => {
  const { email } = req.body || {}
  const mockToken = 'mock_jwt_access_token_' + Date.now()
  res.json({
    access_token: mockToken,
    refresh_token: 'mock_jwt_refresh_token',
    token_type: 'bearer',
    user: { id: 'usr-1', email: email || 'user@example.com', name: 'User' },
  })
})

app.get('/api/v1/auth/me', (_req: Request, res: Response) => {
  res.json({ id: 'usr-1', email: 'user@example.com', name: 'User' })
})

// --- Backend API: Watchlist ---
app.get('/api/v1/watchlist', (req: Request, res: Response) => {
  const type = req.query.type as string | undefined
  let items = inMemoryWatchlist
  if (type) {
    items = items.filter((i) => i.type === type)
  }
  res.json({
    data: items,
    total: items.length,
    page: 1,
    limit: 50,
  })
})

app.post('/api/v1/watchlist', (req: Request, res: Response) => {
  const { type, symbol, name, source } = req.body || {}
  if (!symbol || !name) {
    return res.status(400).json({ error: 'Missing symbol or name' })
  }
  const newItem: WatchlistItemRecord = {
    id: 'wl-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    user_id: 'usr-1',
    type: type === 'fund' ? 'fund' : 'stock',
    symbol,
    name,
    source,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  inMemoryWatchlist.push(newItem)
  res.status(201).json(newItem)
})

app.delete('/api/v1/watchlist/:id', (req: Request, res: Response) => {
  const { id } = req.params
  const index = inMemoryWatchlist.findIndex((i) => i.id === id)
  if (index >= 0) {
    inMemoryWatchlist.splice(index, 1)
  }
  res.json({ success: true })
})

// --- Backend API: Analysis ---
app.post('/api/v1/analysis', (req: Request, res: Response) => {
  const { watchlist_id, tool, result } = req.body || {}
  const record: AnalysisRecord = {
    id: 'ana-' + Date.now(),
    user_id: 'usr-1',
    watchlist_id,
    tool: tool || 'general',
    result: result || {},
    created_at: new Date().toISOString(),
  }
  inMemoryAnalysis.push(record)
  res.status(201).json(record)
})

app.get('/api/v1/analysis', (_req: Request, res: Response) => {
  res.json({
    data: inMemoryAnalysis,
    total: inMemoryAnalysis.length,
    page: 1,
    limit: 50,
  })
})

// --- Serve Frontend ---
async function start() {
  const isProd = process.env.NODE_ENV === 'production'

  if (!isProd) {
    const fs = await import('fs')
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true, host: HOST, port: PORT },
      appType: 'spa',
    })
    app.use(vite.middlewares)

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8')
        template = await vite.transformIndexHtml(url, template)
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template)
      } catch (e: any) {
        vite.ssrFixStacktrace(e)
        next(e)
      }
    })
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')))
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'))
    })
  }

  app.listen(PORT, HOST, () => {
    console.log(`[Sagafisc] Server running on http://${HOST}:${PORT}`)
  })
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
