/**
 * 決策樹文件本機列表（localStorage）。
 */

import type { DecisionTreeDoc } from './types'
import { createBlankTree, createSampleTree, migrateTreeNodes } from './engine'

const STORAGE_KEY = 'sagafisc_decision_trees'
const ACTIVE_KEY = 'sagafisc_decision_active_tree'

export interface TreeListState {
  trees: DecisionTreeDoc[]
  activeId: string | null
}

/**
 * 載入所有樹與目前選取 id。
 * @returns 列表狀態
 */
export function loadTrees(): TreeListState {
  if (typeof window === 'undefined') return { trees: [], activeId: null }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: DecisionTreeDoc[] = raw ? JSON.parse(raw) : []
    // 載入時遷移舊 manual 節點；若有變更則寫回
    let dirty = false
    const trees = parsed.map((t) => {
      const migrated = migrateTreeNodes(t)
      if (migrated !== t) dirty = true
      return migrated
    })
    if (dirty) saveTrees(trees)
    const activeId = localStorage.getItem(ACTIVE_KEY)
    return {
      trees,
      activeId: activeId && trees.some((t) => t.id === activeId) ? activeId : trees[0]?.id ?? null,
    }
  } catch {
    return { trees: [], activeId: null }
  }
}

/**
 * 儲存樹列表。
 * @param trees - 全部樹
 */
export function saveTrees(trees: DecisionTreeDoc[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trees))
}

/**
 * 設定目前執行／編輯中的樹 id。
 * @param id - 樹 id
 */
export function setActiveTreeId(id: string | null): void {
  if (typeof window === 'undefined') return
  if (id) localStorage.setItem(ACTIVE_KEY, id)
  else localStorage.removeItem(ACTIVE_KEY)
}

/**
 * 新增空白樹並設為作用中。
 * @param name - 名稱
 * @returns 更新後狀態
 */
export function addBlankTree(name = '未命名決策樹'): TreeListState {
  const { trees } = loadTrees()
  const doc = createBlankTree(name)
  const next = [...trees, doc]
  saveTrees(next)
  setActiveTreeId(doc.id)
  return { trees: next, activeId: doc.id }
}

/**
 * 新增範例樹。
 * @returns 更新後狀態
 */
export function addSampleTree(): TreeListState {
  const { trees } = loadTrees()
  const doc = createSampleTree()
  const next = [...trees, doc]
  saveTrees(next)
  setActiveTreeId(doc.id)
  return { trees: next, activeId: doc.id }
}

/**
 * 更新一棵樹。
 * @param doc - 完整文件
 * @returns 更新後狀態
 */
export function upsertTree(doc: DecisionTreeDoc): TreeListState {
  const { trees, activeId } = loadTrees()
  const idx = trees.findIndex((t) => t.id === doc.id)
  const updated = { ...doc, updatedAt: Date.now() }
  const next =
    idx >= 0 ? trees.map((t, i) => (i === idx ? updated : t)) : [...trees, updated]
  saveTrees(next)
  return { trees: next, activeId: activeId || updated.id }
}

/**
 * 重新命名。
 * @param id - 樹 id
 * @param name - 新名稱
 * @returns 更新後狀態
 */
export function renameTree(id: string, name: string): TreeListState {
  const { trees, activeId } = loadTrees()
  const next = trees.map((t) => (t.id === id ? { ...t, name, updatedAt: Date.now() } : t))
  saveTrees(next)
  return { trees: next, activeId }
}

/**
 * 刪除樹。
 * @param id - 樹 id
 * @returns 更新後狀態
 */
export function deleteTree(id: string): TreeListState {
  const { trees, activeId } = loadTrees()
  const next = trees.filter((t) => t.id !== id)
  saveTrees(next)
  const newActive = activeId === id ? next[0]?.id ?? null : activeId
  setActiveTreeId(newActive)
  return { trees: next, activeId: newActive }
}

/**
 * 取得作用中樹文件。
 * @returns 文件或 null
 */
export function getActiveTree(): DecisionTreeDoc | null {
  const { trees, activeId } = loadTrees()
  return trees.find((t) => t.id === activeId) || null
}
