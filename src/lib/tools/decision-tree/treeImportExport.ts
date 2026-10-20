/**
 * 決策樹匯入／匯出：JSON 檔案格式與驗證。
 */

import { migrateTreeNodes } from './engine'
import { loadFormulas, saveFormulas } from './formulaStore'
import type { DecisionTreeDoc, FormulaIndicator, TreeNode } from './types'
import { loadTrees, saveTrees, setActiveTreeId, type TreeListState } from './treeStore'

/** 匯出檔格式版本 */
export const TREE_EXPORT_VERSION = 1

/** 匯出檔根物件 */
export interface DecisionTreeExportFile {
  version: number
  kind: 'sagafisc-decision-tree'
  exportedAt: number
  trees: DecisionTreeDoc[]
  /** 樹內條件有引用到的自訂公式（可選） */
  formulas?: FormulaIndicator[]
}

/**
 * 自決策樹節點收集條件用到的指標 id。
 * @param tree - 決策樹
 * @returns 指標 id 集合
 */
function collectIndicatorIds(tree: DecisionTreeDoc): Set<string> {
  const ids = new Set<string>()
  for (const node of Object.values(tree.nodes)) {
    for (const c of node.condition?.conditions || []) {
      if (c.indicatorId) ids.add(c.indicatorId)
    }
  }
  return ids
}

/**
 * 依樹列表挑出被引用的本機公式。
 * @param trees - 決策樹列表
 * @returns 相關公式
 */
export function formulasUsedByTrees(trees: DecisionTreeDoc[]): FormulaIndicator[] {
  const used = new Set<string>()
  for (const t of trees) {
    for (const id of collectIndicatorIds(t)) used.add(id)
  }
  return loadFormulas().filter((f) => used.has(f.id))
}

/**
 * 建立匯出檔物件。
 * @param trees - 要匯出的樹
 * @param includeFormulas - 是否附帶相關公式
 * @returns 匯出檔
 */
export function buildExportPayload(
  trees: DecisionTreeDoc[],
  includeFormulas = true
): DecisionTreeExportFile {
  return {
    version: TREE_EXPORT_VERSION,
    kind: 'sagafisc-decision-tree',
    exportedAt: Date.now(),
    trees: trees.map((t) => migrateTreeNodes(t)),
    ...(includeFormulas
      ? { formulas: formulasUsedByTrees(trees) }
      : {}),
  }
}

/**
 * 觸發瀏覽器下載 JSON。
 * @param filename - 檔名
 * @param data - 可序列化物件
 */
export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * 匯出目前作用中的一棵樹。
 * @param tree - 決策樹
 */
export function exportSingleTree(tree: DecisionTreeDoc): void {
  const payload = buildExportPayload([tree])
  const safe = tree.name.replace(/[\\/:*?"<>|]+/g, '_').slice(0, 40) || 'decision-tree'
  downloadJson(`${safe}.json`, payload)
}

/**
 * 匯出本機全部決策樹。
 */
export function exportAllTrees(): void {
  const { trees } = loadTrees()
  if (!trees.length) throw new Error('尚無決策樹可匯出')
  const payload = buildExportPayload(trees)
  downloadJson(`decision-trees-${formatStamp()}.json`, payload)
}

/**
 * 時間戳字串（檔名用）。
 * @returns YYYYMMDD-HHmm
 */
function formatStamp(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

/**
 * 粗略驗證是否為合法節點。
 * @param n - 未知物件
 * @returns 是否像 TreeNode
 */
function isTreeNode(n: unknown): n is TreeNode {
  if (!n || typeof n !== 'object') return false
  const o = n as Record<string, unknown>
  return typeof o.id === 'string' && typeof o.kind === 'string' && typeof o.label === 'string'
}

/**
 * 驗證並正規化單一決策樹文件。
 * @param raw - 未知資料
 * @returns 決策樹或錯誤訊息
 */
export function parseTreeDoc(raw: unknown): { ok: true; tree: DecisionTreeDoc } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: '決策樹格式無效' }
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.name !== 'string' || typeof o.rootId !== 'string') {
    return { ok: false, error: '缺少 id／name／rootId' }
  }
  if (!o.nodes || typeof o.nodes !== 'object') return { ok: false, error: '缺少 nodes' }
  const nodes: Record<string, TreeNode> = {}
  for (const [id, node] of Object.entries(o.nodes as Record<string, unknown>)) {
    if (!isTreeNode(node)) return { ok: false, error: `節點格式無效：${id}` }
    nodes[id] = node as TreeNode
  }
  if (!nodes[o.rootId]) return { ok: false, error: `rootId「${o.rootId}」不存在於 nodes` }
  const tree = migrateTreeNodes({
    id: o.id,
    name: o.name,
    rootId: o.rootId,
    nodes,
    updatedAt: typeof o.updatedAt === 'number' ? o.updatedAt : Date.now(),
  })
  return { ok: true, tree }
}

/**
 * 解析匯入 JSON（支援完整匯出檔、單樹、或多樹陣列）。
 * @param text - 檔案文字
 * @returns 解析結果
 */
export function parseImportText(text: string): {
  ok: true
  trees: DecisionTreeDoc[]
  formulas: FormulaIndicator[]
} | { ok: false; error: string } {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, error: 'JSON 解析失敗' }
  }

  // 標準匯出檔
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    const root = data as Record<string, unknown>
    if (root.kind === 'sagafisc-decision-tree' || Array.isArray(root.trees)) {
      if (!Array.isArray(root.trees) || root.trees.length === 0) {
        return { ok: false, error: '匯出檔未含任何決策樹' }
      }
      const trees: DecisionTreeDoc[] = []
      for (const item of root.trees) {
        const parsed = parseTreeDoc(item)
        if (parsed.ok === false) return { ok: false, error: parsed.error }
        trees.push(parsed.tree)
      }
      const formulas = Array.isArray(root.formulas)
        ? (root.formulas as FormulaIndicator[]).filter(
            (f) => f && typeof f.id === 'string' && typeof f.expression === 'string'
          )
        : []
      return { ok: true, trees, formulas }
    }
    // 單棵 DecisionTreeDoc
    const one = parseTreeDoc(data)
    if (one.ok) return { ok: true, trees: [one.tree], formulas: [] }
  }

  // 純陣列
  if (Array.isArray(data)) {
    if (!data.length) return { ok: false, error: '陣列為空' }
    const trees: DecisionTreeDoc[] = []
    for (const item of data) {
      const parsed = parseTreeDoc(item)
      if (parsed.ok === false) return { ok: false, error: parsed.error }
      trees.push(parsed.tree)
    }
    return { ok: true, trees, formulas: [] }
  }

  return { ok: false, error: '無法辨識的匯入格式' }
}

/**
 * 為匯入樹產生新 id，避免與本機衝突；名稱加上（匯入）後綴若重複。
 * @param tree - 原始樹
 * @param existingNames - 既有名稱
 * @returns 新樹
 */
function remintTree(tree: DecisionTreeDoc, existingNames: Set<string>): DecisionTreeDoc {
  let name = tree.name.trim() || '未命名決策樹'
  if (existingNames.has(name)) {
    name = `${name}（匯入）`
    let n = 2
    while (existingNames.has(name)) {
      name = `${tree.name}（匯入${n}）`
      n += 1
    }
  }
  existingNames.add(name)
  return {
    ...tree,
    id: `tree_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    updatedAt: Date.now(),
  }
}

/**
 * 合併匯入的公式（同 id 略過，不覆寫本機）。
 * @param incoming - 匯入公式
 * @returns 新增筆數
 */
function mergeFormulas(incoming: FormulaIndicator[]): number {
  if (!incoming.length) return 0
  const existing = loadFormulas()
  const ids = new Set(existing.map((f) => f.id))
  const toAdd = incoming.filter((f) => f.id && f.expression && !ids.has(f.id))
  if (!toAdd.length) return 0
  saveFormulas([...toAdd, ...existing])
  return toAdd.length
}

/**
 * 將解析後的樹寫入本機並設最後一棵為作用中。
 * @param trees - 樹列表
 * @param formulas - 公式
 * @returns 更新後列表狀態與統計
 */
export function applyImport(
  trees: DecisionTreeDoc[],
  formulas: FormulaIndicator[] = []
): { list: TreeListState; importedTrees: number; importedFormulas: number } {
  const { trees: current } = loadTrees()
  const names = new Set(current.map((t) => t.name))
  const minted = trees.map((t) => remintTree(migrateTreeNodes(t), names))
  const next = [...current, ...minted]
  saveTrees(next)
  const last = minted[minted.length - 1]
  if (last) setActiveTreeId(last.id)
  const importedFormulas = mergeFormulas(formulas)
  return {
    list: { trees: next, activeId: last?.id ?? null },
    importedTrees: minted.length,
    importedFormulas,
  }
}

/**
 * 讀取 File 並匯入。
 * @param file - 使用者選取的檔案
 * @returns 結果
 */
export async function importFromFile(file: File): Promise<
  | { ok: true; list: TreeListState; importedTrees: number; importedFormulas: number }
  | { ok: false; error: string }
> {
  const text = await file.text()
  const parsed = parseImportText(text)
  if (parsed.ok === false) return { ok: false, error: parsed.error }
  const result = applyImport(parsed.trees, parsed.formulas)
  return { ok: true, ...result }
}
