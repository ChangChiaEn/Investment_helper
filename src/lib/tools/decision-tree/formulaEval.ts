/**
 * 公式表達式解析與求值（四則運算、括號、指標 id、數字常數）。
 */

/** Token 種類 */
type TokenKind = 'number' | 'id' | 'op' | 'lparen' | 'rparen'

/** 詞法 token */
interface Token {
  kind: TokenKind
  value: string
}

/**
 * 自表達式抽出被引用的指標 id（依出現順序、去重）。
 * @param expression - 公式字串
 * @returns 指標 id 列表
 */
export function extractFormulaDeps(expression: string): string[] {
  const tokens = tokenize(expression)
  const seen = new Set<string>()
  const deps: string[] = []
  for (const t of tokens) {
    if (t.kind !== 'id') continue
    if (seen.has(t.value)) continue
    seen.add(t.value)
    deps.push(t.value)
  }
  return deps
}

/**
 * 以已知變數對公式求值。
 * @param expression - 公式
 * @param vars - 指標 id → 數值
 * @returns 數值
 * @throws 語法或除零／缺變數錯誤
 */
export function evaluateFormula(
  expression: string,
  vars: Record<string, number>
): number {
  const tokens = tokenize(expression)
  if (tokens.length === 0) throw new Error('公式為空')
  let pos = 0

  /**
   * 讀取目前 token 或結束。
   * @returns token 或 null
   */
  const peek = (): Token | null => tokens[pos] ?? null

  /**
   * 消耗一個 token。
   * @returns 消耗的 token
   */
  const consume = (): Token => {
    const t = tokens[pos]
    if (!t) throw new Error('公式意外結束')
    pos += 1
    return t
  }

  /**
   * 解析加減層。
   * @returns 數值
   */
  const parseExpr = (): number => {
    let left = parseTerm()
    while (peek()?.kind === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value
      const right = parseTerm()
      left = op === '+' ? left + right : left - right
    }
    return left
  }

  /**
   * 解析乘除層。
   * @returns 數值
   */
  const parseTerm = (): number => {
    let left = parseUnary()
    while (peek()?.kind === 'op' && (peek()!.value === '*' || peek()!.value === '/')) {
      const op = consume().value
      const right = parseUnary()
      if (op === '/') {
        if (right === 0) throw new Error('公式除以零')
        left = left / right
      } else {
        left = left * right
      }
    }
    return left
  }

  /**
   * 解析一元正負與原子。
   * @returns 數值
   */
  const parseUnary = (): number => {
    if (peek()?.kind === 'op' && (peek()!.value === '+' || peek()!.value === '-')) {
      const op = consume().value
      const v = parseUnary()
      return op === '-' ? -v : v
    }
    return parseAtom()
  }

  /**
   * 解析數字、變數或括號。
   * @returns 數值
   */
  const parseAtom = (): number => {
    const t = peek()
    if (!t) throw new Error('公式意外結束')
    if (t.kind === 'number') {
      consume()
      return Number(t.value)
    }
    if (t.kind === 'id') {
      consume()
      if (!(t.value in vars)) throw new Error(`公式缺少變數：${t.value}`)
      const v = vars[t.value]
      if (typeof v !== 'number' || Number.isNaN(v)) {
        throw new Error(`公式變數非數值：${t.value}`)
      }
      return v
    }
    if (t.kind === 'lparen') {
      consume()
      const v = parseExpr()
      if (peek()?.kind !== 'rparen') throw new Error('缺少右括號')
      consume()
      return v
    }
    throw new Error(`無法解析：${t.value}`)
  }

  const result = parseExpr()
  if (pos < tokens.length) throw new Error(`公式多餘內容：${tokens[pos].value}`)
  return result
}

/**
 * 驗證公式語法（不求值）。
 * @param expression - 公式
 * @returns 錯誤訊息；合法則 null
 */
export function validateFormulaSyntax(expression: string): string | null {
  try {
    // 以 0 填所有 id 做語法檢查
    const deps = extractFormulaDeps(expression)
    const vars: Record<string, number> = {}
    for (const d of deps) vars[d] = 0
    evaluateFormula(expression, vars)
    return null
  } catch (err) {
    return err instanceof Error ? err.message : String(err)
  }
}

/**
 * 詞法分析。
 * @param input - 原始字串
 * @returns token 陣列
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const s = input.trim()
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if ('+-*/'.includes(ch)) {
      tokens.push({ kind: 'op', value: ch })
      i += 1
      continue
    }
    if (ch === '(') {
      tokens.push({ kind: 'lparen', value: ch })
      i += 1
      continue
    }
    if (ch === ')') {
      tokens.push({ kind: 'rparen', value: ch })
      i += 1
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i + 1
      while (j < s.length && /[0-9.]/.test(s[j])) j += 1
      tokens.push({ kind: 'number', value: s.slice(i, j) })
      i = j
      continue
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let j = i + 1
      while (j < s.length && /[a-zA-Z0-9_]/.test(s[j])) j += 1
      tokens.push({ kind: 'id', value: s.slice(i, j) })
      i = j
      continue
    }
    throw new Error(`非法字元：${ch}`)
  }
  return tokens
}
