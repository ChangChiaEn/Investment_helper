import express, { Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { getQuotes, normalizeSymbol, discoverStocks, isScanMode } from './src/lib/tools/tw-stock-target/service'
import { handleMarketProxy } from './src/lib/market/proxyHandler'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local or .env if present (e.g. injected AI Studio secrets)
try {
  const envLocalPath = path.resolve(__dirname, '.env.local')
  if (fs.existsSync(envLocalPath)) {
    const lines = fs.readFileSync(envLocalPath, 'utf8').split('\n')
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/)
      if (match) {
        const k = match[1].trim()
        const v = match[2].trim()
        if (v && (!process.env[k] || process.env[k]?.startsWith('MY_GEM'))) {
          process.env[k] = v
        }
      }
    }
  }
} catch {
  // ignore
}

const app = express()
const PORT = parseInt(process.env.PORT || '3000', 10)

app.use(express.json())

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// Taiwan stock target quotes endpoint
app.get('/api/tw-stock-target/stocks', async (req: Request, res: Response) => {
  const symbolsParam = req.query.symbols as string | undefined
  const raw = symbolsParam ? symbolsParam.split(',') : []
  const symbols = Array.from(new Set(raw.map(normalizeSymbol))).filter(Boolean) as string[]

  if (!raw.length || raw.length > 50 || symbols.length !== raw.length) {
    res.status(400).json({ error: '請提供 1–50 個有效的台股代號（支援 .TW 與 .TWO）。' })
    return
  }

  try {
    const quotes = await getQuotes(symbols)
    if (!quotes.length) {
      res.status(502).json({ error: '無法取得報價，請檢查股票代號或稍後重試。' })
      return
    }
    res.setHeader('Cache-Control', 'no-store')
    res.json(quotes)
  } catch (err: any) {
    console.error('Quotes error:', err)
    res.status(502).json({ error: '報價服務暫時無法使用，請稍後重試。' })
  }
})

// Taiwan stock discovery endpoint
app.get('/api/tw-stock-target/discover', async (req: Request, res: Response) => {
  const mode = (req.query.mode as string) || 'strong'
  if (!isScanMode(mode)) {
    res.status(400).json({ error: '不支援的掃描模式。' })
    return
  }

  try {
    const result = await discoverStocks(mode)
    res.setHeader('Cache-Control', 'no-store')
    res.json(result)
  } catch (error: any) {
    console.error('Discover error:', error)
    res.status(502).json({
      error: error instanceof Error ? error.message : '市場掃描暫時無法使用。',
    })
  }
})

// Market proxy endpoint (TWSE openapi, TWSE rwd, TPEX, MOPS)
app.get('/api/market-proxy', async (req: Request, res: Response) => {
  const source = (req.query.source as string) || ''
  const pathParam = (req.query.path as string) || ''
  const queryParam = (req.query.query as string) || undefined

  try {
    const result = await handleMarketProxy(source, pathParam, queryParam)
    res.status(result.status).json(result.body)
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err?.message || '代理服務異常' })
  }
})

// In-memory watchlist fallback API (from backend)
const watchlistStore: Record<string, any[]> = {}
app.get('/api/v1/watchlist', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default'
  res.json({ success: true, data: watchlistStore[userId] || [] })
})

app.post('/api/v1/watchlist', (req: Request, res: Response) => {
  const userId = (req.query.userId as string) || 'default'
  if (!watchlistStore[userId]) watchlistStore[userId] = []
  watchlistStore[userId].push(req.body)
  res.json({ success: true, data: req.body })
})

function getEffectiveGeminiApiKey(requestKey?: string): string {
  if (requestKey && requestKey !== 'MY_GEMINI_API_KEY' && !requestKey.startsWith('MY_GEM')) {
    return requestKey
  }

  const envKey = process.env.GEMINI_API_KEY
  if (envKey && envKey !== 'MY_GEMINI_API_KEY' && !envKey.startsWith('MY_GEM')) {
    return envKey
  }

  try {
    const envLocalPath = path.resolve(__dirname, '.env.local')
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf8')
      const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/)
      if (match && match[1]?.trim() && !match[1].trim().startsWith('MY_GEM')) {
        return match[1].trim()
      }
    }
  } catch {
    // ignore
  }

  try {
    const envPath = path.resolve(__dirname, '.env')
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8')
      const match = content.match(/GEMINI_API_KEY=([^\r\n]+)/)
      if (match && match[1]?.trim() && !match[1].trim().startsWith('MY_GEM')) {
        return match[1].trim()
      }
    }
  } catch {
    // ignore
  }

  return envKey || ''
}

// Server-side Gemini API endpoint using Gemini 3.8 Flash
app.post('/api/gemini/generate', async (req: Request, res: Response) => {
  try {
    const { contents, config, model = 'gemini-3.8-flash', apiKey } = req.body
    const key = getEffectiveGeminiApiKey(apiKey)
    if (!key) {
      res.status(500).json({ error: 'AI 服務連線初始化中，請稍後重試。' })
      return
    }

    const { GoogleGenAI } = await import('@google/genai')
    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })

    const chosenModel = model || 'gemini-3.8-flash'
    let response: any

    // Clean up config if needed (e.g. remove deprecated thinkingBudget)
    const cleanConfig: any = { ...config }
    if (cleanConfig.thinkingConfig?.thinkingBudget) {
      delete cleanConfig.thinkingConfig.thinkingBudget
    }

    try {
      response = await ai.models.generateContent({
        model: chosenModel,
        contents,
        config: cleanConfig,
      })
    } catch (primaryErr: any) {
      console.warn('Primary Gemini call error:', primaryErr?.message)
      // If error occurred with search grounding, retry without search tool
      if (cleanConfig?.tools?.some((t: any) => t.googleSearch)) {
        console.log('Retrying without googleSearch tool...')
        const fallbackConfig = { ...cleanConfig, tools: undefined }
        try {
          response = await ai.models.generateContent({
            model: chosenModel,
            contents,
            config: fallbackConfig,
          })
        } catch (retryErr: any) {
          if (chosenModel === 'gemini-3.8-flash') {
            console.log('Retrying with gemini-flash-latest...')
            response = await ai.models.generateContent({
              model: 'gemini-flash-latest',
              contents,
              config: fallbackConfig,
            })
          } else {
            throw retryErr
          }
        }
      } else if (chosenModel === 'gemini-3.8-flash') {
        console.log('Retrying with gemini-flash-latest...')
        response = await ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents,
          config: cleanConfig,
        })
      } else {
        throw primaryErr
      }
    }

    res.json({
      text: response.text,
      candidates: response.candidates,
    })
  } catch (error: any) {
    console.error('Server Gemini API error:', error)
    res.status(500).json({ error: error?.message || 'Gemini 呼叫失敗，請稍後再試。' })
  }
})

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite')
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    })
    app.use(vite.middlewares)
  } else {
    const distPath = path.resolve(__dirname, 'dist')
    app.use(express.static(distPath))
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'))
    })
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Sagafisc Server listening on http://0.0.0.0:${PORT}`)
  })
}

startServer()
