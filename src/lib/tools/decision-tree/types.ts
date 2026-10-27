/**
 * 決策樹工具核心型別：指標、樹節點與執行結果。
 * 庫存相關型別已移至 `@/lib/inventory`，此處再匯出以相容舊 import。
 */

export type {
  CustomList,
  DecisionInventory,
  HoldingItem,
  Inventory,
  ListItem,
} from '@/lib/inventory'

/**
 * 指標資料來源標籤。
 * - inventory：庫存自填參數
 * - composite：庫存＋行情等複合計算
 * - formula：使用者自訂公式
 * - automation：自動化節點執行結果的 resolvedSource（非條件指標目錄）
 * - manual：舊版相容（讀取時映射為 inventory）
 */
export type IndicatorSource =
  | 'openapi'
  | 'ai'
  | 'inventory'
  | 'composite'
  | 'formula'
  | 'automation'
  | 'manual'

/** 比較運算子 */
export type CompareOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'between' | 'truthy'

/** 條件組合方式 */
export type ConditionMode = 'all' | 'any' | 'atLeast'

/** 指標可調參數定義（供目錄與條件編輯器） */
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
  /** 可調參數 schema（有則條件編輯器顯示輸入） */
  params?: IndicatorParamDef[]
  /** 公式來源時的表達式（例：entry_price - 2 * atr） */
  expression?: string
  /**
   * 參數變體：實際解析改呼叫此基底指標 id。
   * 本機「複製指標」產生的項目會帶此欄。
   */
  baseIndicatorId?: string
  /** 變體預設參數（與條件 params 合併，條件優先） */
  defaultParams?: Record<string, number | string>
}

/**
 * 本機參數變體：複製內建指標並固定另一組參數，可當獨立指標選用。
 */
export interface IndicatorVariant {
  id: string
  name: string
  /** 對應內建指標 id（例：ma） */
  baseIndicatorId: string
  params: Record<string, number | string>
  description?: string
  createdAt: number
}

/**
 * 複合／公式計算時取用的組成數值（供執行過程展開顯示）。
 */
export interface IndicatorComponent {
  /** 顯示名稱（中文） */
  label: string
  /** 對應指標 id（有則可對照目錄） */
  indicatorId?: string
  value: number | boolean | string | null
  display: string
}

/** 指標解析後的實際結果 */
export interface IndicatorValue {
  indicatorId: string
  /** 實際取得來源（可能因降級與目錄標籤不同） */
  resolvedSource: IndicatorSource | 'error'
  value: number | boolean | string | null
  display: string
  error?: string
  /** 複合／公式取用的各個組成數值 */
  components?: IndicatorComponent[]
}

/** 單一條件：對某指標比較 */
export interface MetricCondition {
  indicatorId: string
  op: CompareOp
  /** 比較目標；between 時用 value 與 valueTo */
  value?: number | string | boolean
  valueTo?: number
  /** 指標參數覆寫（例：days、n）；未填則用目錄／變體預設 */
  params?: Record<string, number | string>
}

/** 決策節點條件群組 */
export interface ConditionGroup {
  mode: ConditionMode
  /** mode=atLeast 時的門檻，預設 2 */
  atLeast?: number
  conditions: MetricCondition[]
}

/**
 * 節點種類。
 * - decision：條件通過／未通過雙分支（可加 humanConfirm）
 * - action：自動化副作用，單進單出（下一節點用 yesTarget）
 * - result：終端建議
 * - manual：舊資料相容；載入時遷為 decision + humanConfirm
 */
export type NodeKind = 'decision' | 'manual' | 'result' | 'action'

/** 決策樹節點（邏輯模型，與 React Flow 分離） */
export interface TreeNode {
  id: string
  kind: NodeKind
  label: string
  /** decision：條件通過走 yesTarget，否則 noTarget */
  condition?: ConditionGroup
  /**
   * 需主觀確認：執行時暫停等人選是／否（等同舊 manual 節點）。
   * 舊樹 kind==='manual' 載入時會遷移為此旗標。
   */
  humanConfirm?: boolean
  /** 主觀確認時的問題文字 */
  prompt?: string
  /**
   * 下一節點：decision 的「通過／是」；action 的唯一出口。
   */
  yesTarget?: string | null
  /** decision 的「未通過／否」；action／result 應為 null */
  noTarget?: string | null
  /** result：建議 */
  advice?: string
  /** action：自動化動作 id（見 actionCatalog） */
  actionId?: string
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
  error?: string
}

/** 一次執行批次（可含多標的結果）；重跑會新增批次、不覆寫舊批 */
export interface RunBatch {
  id: string
  treeId: string
  treeName: string
  symbols: string[]
  results: RunState[]
  createdAt: number
}

/**
 * 批次／單檔執行面板的持久化快照（切換分頁後還原）。
 * 以 batches 保留歷史；results 欄位保留舊版相容（載入時遷移）。
 */
export interface RunSessionSnapshot {
  treeId: string | null
  selectedSymbols: string[]
  /** @deprecated 請用 batches；舊資料遷移用 */
  results?: RunState[]
  /** 執行歷史（新到舊），上限由 store 控制 */
  batches: RunBatch[]
  /** 目前檢視的批次 id */
  activeBatchId: string | null
  /** 進行中標記 */
  running: boolean
  updatedAt: number
}

/** React Flow 畫布額外資料（與邏輯樹同步） */
export interface FlowNodeData extends Record<string, unknown> {
  kind: NodeKind
  label: string
  humanConfirm?: boolean
  prompt?: string
  advice?: string
  condition?: ConditionGroup
  /** action 節點：自動化動作 id */
  actionId?: string
}

/** 使用者自訂公式指標（本機儲存） */
export interface FormulaIndicator {
  id: string
  name: string
  expression: string
  description?: string
  createdAt: number
}
