/**
 * 決策樹工具核心型別：指標、庫存、樹節點與執行結果。
 */

/** 指標資料來源標籤 */
export type IndicatorSource = 'openapi' | 'ai' | 'manual'

/** 比較運算子 */
export type CompareOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'truthy'

/** 條件組合方式 */
export type ConditionMode = 'all' | 'any' | 'atLeast'

/** 指標參數定義（供編輯器顯示） */
export interface IndicatorParamDef {
  key: string
  label: string
  type: 'number' | 'string' | 'select'
  default?: number | string
  options?: { value: string; label: string }[]
  min?: number
  max?: number
}

/** 指標目錄項目 */
export interface IndicatorDef {
  id: string
  name: string
  description: string
  source: IndicatorSource
  /** 回傳值語意：number 可比較；boolean 用於 truthy */
  valueType: 'number' | 'boolean' | 'string'
  unit?: string
  params?: IndicatorParamDef[]
}

/** 指標解析後的實際結果 */
export interface IndicatorValue {
  indicatorId: string
  /** 實際取得來源（可能因降級與目錄標籤不同） */
  resolvedSource: IndicatorSource | 'error'
  value: number | boolean | string | null
  display: string
  error?: string
}

/** 持股項目 */
export interface HoldingItem {
  id: string
  symbol: string
  name: string
  entryPrice: number
  shares: number
  entryDate: string
  swingHigh: number
  note?: string
}

/** 觀察／候選清單項目 */
export interface ListItem {
  id: string
  symbol: string
  name: string
  note?: string
  addedAt: number
}

/** 決策樹庫存（本機） */
export interface DecisionInventory {
  holdings: HoldingItem[]
  watchlist: ListItem[]
  candidates: ListItem[]
  /** 手動全域參數 */
  totalCapital: number
  cashRemaining: number
  maxHoldings: number
  maxWatchlist: number
}

/** 單一條件：對某指標比較 */
export interface MetricCondition {
  indicatorId: string
  op: CompareOp
  /** 比較目標；between 時用 value 與 valueTo */
  value?: number | string | boolean
  valueTo?: number
  /** 指標參數覆寫 */
  params?: Record<string, number | string>
}

/** 決策節點條件群組 */
export interface ConditionGroup {
  mode: ConditionMode
  /** mode=atLeast 時的門檻，預設 2 */
  atLeast?: number
  conditions: MetricCondition[]
}

/** 節點種類 */
export type NodeKind = 'decision' | 'manual' | 'result'

/** 決策樹節點（邏輯模型，與 React Flow 分離） */
export interface TreeNode {
  id: string
  kind: NodeKind
  label: string
  /** decision：條件通過走 yesTarget，否則 noTarget */
  condition?: ConditionGroup
  /** manual：問題文字，使用者必須選是／否 */
  prompt?: string
  yesTarget?: string | null
  noTarget?: string | null
  /** result：建議 */
  advice?: string
  /** 建議參數（如賣出比例 0.33），僅顯示用 */
  adviceParams?: Record<string, number | string>
}

/** 一棵決策樹 */
export interface DecisionTreeDoc {
  id: string
  name: string
  rootId: string
  nodes: Record<string, TreeNode>
  updatedAt: number
}

/** 執行路徑上的一步 */
export interface ExecutionStep {
  nodeId: string
  label: string
  kind: NodeKind
  branchTaken?: 'yes' | 'no'
  indicatorResults?: IndicatorValue[]
  conditionPassed?: boolean
  note?: string
}

/** 執行狀態 */
export type RunStatus = 'running' | 'awaiting_manual' | 'completed' | 'error'

/** 一次執行的狀態快照 */
export interface RunState {
  status: RunStatus
  treeId: string
  symbol: string
  currentNodeId: string | null
  path: ExecutionStep[]
  /** 待人工確認時的問題 */
  pendingPrompt?: string
  resultAdvice?: string
  resultParams?: Record<string, number | string>
  error?: string
}

/** React Flow 畫布額外資料（與邏輯樹同步） */
export interface FlowNodeData extends Record<string, unknown> {
  kind: NodeKind
  label: string
  prompt?: string
  advice?: string
  adviceParams?: Record<string, number | string>
  condition?: ConditionGroup
}
