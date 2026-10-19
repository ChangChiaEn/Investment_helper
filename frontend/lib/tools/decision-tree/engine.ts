/**
 * 決策樹單路徑執行引擎。
 */

import { resolveIndicator, type ResolveContext } from './resolvers'
import type {
  CompareOp,
  ConditionGroup,
  DecisionInventory,
  DecisionTreeDoc,
  ExecutionStep,
  IndicatorValue,
  MetricCondition,
  RunState,
  TreeNode,
} from './types'

/** 引擎執行選項 */
export interface EngineOptions {
  tree: DecisionTreeDoc
  symbol: string
  inventory: DecisionInventory
  /** 繼續先前狀態（人工確認後） */
  previous?: RunState
  /** 人工節點選擇 */
  manualAnswer?: 'yes' | 'no'
  /**
   * 可選：批次執行共用快取（全市場表只打一次）。
   * 未傳時每次新建空 Map。
   */
  sharedCache?: Map<string, unknown>
}

/**
 * 判斷決策樹是否含人工確認節點（批次執行時需改為單檔）。
 * @param tree - 決策樹文件
 * @returns 是否含 manual 節點
 */
export function treeHasManualNode(tree: DecisionTreeDoc): boolean {
  return Object.values(tree.nodes).some((n) => n.kind === 'manual')
}

/**
 * 執行或繼續決策樹；遇人工節點會回傳 awaiting_manual。
 * @param options - 樹、標的、庫存與可選繼續狀態
 * @returns 執行狀態
 */
export async function runDecisionTree(options: EngineOptions): Promise<RunState> {
  const { tree, symbol, inventory, previous, manualAnswer, sharedCache } = options
  const cache = sharedCache || new Map<string, unknown>()
  const ctx: ResolveContext = { symbol, inventory, cache }

  let state: RunState = previous
    ? { ...previous, path: [...previous.path] }
    : {
        status: 'running',
        treeId: tree.id,
        symbol,
        currentNodeId: tree.rootId,
        path: [],
      }

  state.status = 'running'
  state.error = undefined
  state.pendingPrompt = undefined

  // 人工確認後：依答案選分支並寫入上一步
  if (previous?.status === 'awaiting_manual' && previous.currentNodeId && manualAnswer) {
    const node = tree.nodes[previous.currentNodeId]
    if (!node || node.kind !== 'manual') {
      return fail(state, '人工節點狀態不一致')
    }
    const nextId = manualAnswer === 'yes' ? node.yesTarget : node.noTarget
    const last = state.path[state.path.length - 1]
    if (last) last.branchTaken = manualAnswer
    if (!nextId) {
      return fail(state, '人工節點缺少後續分支')
    }
    state.currentNodeId = nextId
  }

  const guard = new Set<string>()

  while (state.currentNodeId) {
    if (guard.has(state.currentNodeId)) {
      return fail(state, '偵測到循環路徑')
    }
    guard.add(state.currentNodeId)

    const node = tree.nodes[state.currentNodeId]
    if (!node) {
      return fail(state, `找不到節點：${state.currentNodeId}`)
    }

    if (node.kind === 'result') {
      state.path.push({
        nodeId: node.id,
        label: node.label,
        kind: 'result',
        note: node.advice,
      })
      state.status = 'completed'
      state.resultAdvice = node.advice || node.label
      state.resultParams = node.adviceParams
      state.currentNodeId = null
      return state
    }

    if (node.kind === 'manual') {
      state.path.push({
        nodeId: node.id,
        label: node.label,
        kind: 'manual',
        note: node.prompt,
      })
      state.status = 'awaiting_manual'
      state.pendingPrompt = node.prompt || node.label
      return state
    }

    // decision
    if (!node.condition) {
      return fail(state, `決策節點缺少條件：${node.id}`)
    }

    const { passed, results } = await evaluateConditionGroup(node.condition, ctx)
    // 任一步錯誤 → 中止（不當成否）
    const err = results.find((r) => r.resolvedSource === 'error')
    if (err) {
      state.path.push({
        nodeId: node.id,
        label: node.label,
        kind: 'decision',
        indicatorResults: results,
        conditionPassed: undefined,
        note: err.error,
      })
      return fail(state, err.error || '指標取得失敗')
    }

    const branch: 'yes' | 'no' = passed ? 'yes' : 'no'
    const nextId = passed ? node.yesTarget : node.noTarget
    state.path.push({
      nodeId: node.id,
      label: node.label,
      kind: 'decision',
      branchTaken: branch,
      indicatorResults: results,
      conditionPassed: passed,
    })

    if (!nextId) {
      return fail(state, `節點「${node.label}」的 ${branch} 分支未連接`)
    }
    state.currentNodeId = nextId
  }

  return fail(state, '執行結束但未到達結果節點')
}

/**
 * 評估條件群組。
 * @param group - 條件群組
 * @param ctx - 解析上下文
 * @returns 是否通過與各指標結果
 */
async function evaluateConditionGroup(
  group: ConditionGroup,
  ctx: ResolveContext
): Promise<{ passed: boolean; results: IndicatorValue[] }> {
  const results: IndicatorValue[] = []
  const flags: boolean[] = []

  for (const cond of group.conditions) {
    const resolved = await resolveIndicator(cond.indicatorId, cond.params, ctx)
    results.push(resolved)
    if (resolved.resolvedSource === 'error') {
      return { passed: false, results }
    }
    flags.push(compare(resolved.value, cond.op, cond.value, cond.valueTo))
  }

  if (group.mode === 'all') {
    return { passed: flags.every(Boolean), results }
  }
  if (group.mode === 'any') {
    return { passed: flags.some(Boolean), results }
  }
  const n = group.atLeast ?? 2
  const count = flags.filter(Boolean).length
  return { passed: count >= n, results }
}

/**
 * 比較指標值與門檻。
 * @param actual - 實際值
 * @param op - 運算子
 * @param expected - 期望值
 * @param valueTo - between 上界
 * @returns 是否成立
 */
function compare(
  actual: number | boolean | string | null,
  op: CompareOp,
  expected?: number | string | boolean,
  valueTo?: number
): boolean {
  if (op === 'truthy') {
    return Boolean(actual)
  }
  if (actual === null || actual === undefined) return false

  if (typeof actual === 'boolean') {
    if (op === 'eq') return actual === Boolean(expected)
    if (op === 'neq') return actual !== Boolean(expected)
    return actual
  }

  if (typeof actual === 'string') {
    const e = String(expected ?? '')
    if (op === 'eq') return actual === e
    if (op === 'neq') return actual !== e
    return false
  }

  const a = actual as number
  const b = Number(expected)
  switch (op) {
    case 'eq':
      return a === b
    case 'neq':
      return a !== b
    case 'gt':
      return a > b
    case 'gte':
      return a >= b
    case 'lt':
      return a < b
    case 'lte':
      return a <= b
    case 'between':
      return a >= b && a <= Number(valueTo ?? b)
    default:
      return false
  }
}

function fail(state: RunState, error: string): RunState {
  return { ...state, status: 'error', error, currentNodeId: state.currentNodeId }
}

/**
 * 建立空白樹（單一結果節點）。
 * @param name - 樹名稱
 * @returns 文件
 */
export function createBlankTree(name: string): DecisionTreeDoc {
  const rootId = 'result_root'
  const node: TreeNode = {
    id: rootId,
    kind: 'result',
    label: '建議',
    advice: '請編輯此結果節點的建議內容',
    adviceParams: {},
  }
  return {
    id: `tree_${Date.now().toString(36)}`,
    name,
    rootId,
    nodes: { [rootId]: node },
    updatedAt: Date.now(),
  }
}

/**
 * 範例樹：示範決策 + 人工 + 結果（可刪）。
 * @returns 範例文件
 */
export function createSampleTree(): DecisionTreeDoc {
  const nodes: Record<string, TreeNode> = {
    d1: {
      id: 'd1',
      kind: 'decision',
      label: '投信連買 ≥ 3 天？',
      condition: {
        mode: 'all',
        conditions: [
          {
            indicatorId: 'trust_buy_streak',
            op: 'gte',
            value: 3,
            params: { days: 10 },
          },
        ],
      },
      yesTarget: 'd2',
      noTarget: 'r_hold',
    },
    d2: {
      id: 'd2',
      kind: 'decision',
      label: '是否低檔？',
      condition: {
        mode: 'all',
        conditions: [{ indicatorId: 'is_low_zone', op: 'truthy' }],
      },
      yesTarget: 'm1',
      noTarget: 'r_watch',
    },
    m1: {
      id: 'm1',
      kind: 'manual',
      label: '基本面確認',
      prompt: '基本面是否仍可接受？（請人工判斷）',
      yesTarget: 'r_buy',
      noTarget: 'r_hold',
    },
    r_buy: {
      id: 'r_buy',
      kind: 'result',
      label: '建議加碼',
      advice: '符合連買與低檔條件，建議小額試單或加碼（僅建議，非下單指示）',
      adviceParams: { 建議部位占總資金百分比: 10 },
    },
    r_watch: {
      id: 'r_watch',
      kind: 'result',
      label: '建議觀察',
      advice: '連買成立但未落在低檔定義，建議列入觀察、暫不加碼',
    },
    r_hold: {
      id: 'r_hold',
      kind: 'result',
      label: '建議持有／不動',
      advice: '未滿足進場條件，建議繼續持有或觀望',
    },
  }

  return {
    id: `sample_${Date.now().toString(36)}`,
    name: '範例：投信連買＋低檔',
    rootId: 'd1',
    nodes,
    updatedAt: Date.now(),
  }
}
