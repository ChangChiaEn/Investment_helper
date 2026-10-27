/**
 * 決策樹文件 ↔ React Flow nodes/edges 同步；含階層式自動排版。
 */

import type { Edge, Node } from '@xyflow/react'
import type { ConditionGroup, DecisionTreeDoc, FlowNodeData, NodeKind, TreeNode } from './types'

/** Flow 節點資料型別 */
export type DtFlowNode = Node<FlowNodeData>

/** 排版參數 */
const LAYOUT = {
  nodeWidth: 200,
  hGap: 48,
  vGap: 110,
  startY: 40,
}

/**
 * 依根節點與通過／未通過分支，計算階層座標（通過在左、未通過在右）。
 * @param doc - 決策樹文件
 * @returns 各節點座標
 */
export function computeTreeLayout(doc: DecisionTreeDoc): Record<string, { x: number; y: number }> {
  const positions: Record<string, { x: number; y: number }> = {}
  const placed = new Set<string>()
  const widthMemo = new Map<string, number>()

  /**
   * 計算子樹所需寬度（葉節點為 nodeWidth）；以 stack 防循環。
   * @param id - 節點 id
   * @param stack - 目前路徑（偵測環）
   * @returns 寬度
   */
  const subtreeWidth = (id: string, stack: Set<string> = new Set()): number => {
    if (widthMemo.has(id)) return widthMemo.get(id)!
    if (stack.has(id)) return LAYOUT.nodeWidth
    const node = doc.nodes[id]
    if (!node) return LAYOUT.nodeWidth
    stack.add(id)
    const yes = node.yesTarget && doc.nodes[node.yesTarget] ? node.yesTarget : null
    const no = node.noTarget && doc.nodes[node.noTarget] ? node.noTarget : null
    let w = LAYOUT.nodeWidth
    if (yes && no) {
      w = subtreeWidth(yes, stack) + subtreeWidth(no, stack) + LAYOUT.hGap
    } else if (yes) {
      w = Math.max(LAYOUT.nodeWidth, subtreeWidth(yes, stack))
    } else if (no) {
      w = Math.max(LAYOUT.nodeWidth, subtreeWidth(no, stack))
    }
    stack.delete(id)
    widthMemo.set(id, w)
    return w
  }

  /**
   * 遞迴放置：目前層以 centerX 為中心；通過分支在左、未通過在右。
   * @param id - 節點
   * @param depth - 深度（0 起）
   * @param centerX - 水平中心
   */
  const place = (id: string, depth: number, centerX: number) => {
    if (placed.has(id) || !doc.nodes[id]) return
    placed.add(id)
    positions[id] = {
      x: centerX - LAYOUT.nodeWidth / 2,
      y: LAYOUT.startY + depth * LAYOUT.vGap,
    }

    const node = doc.nodes[id]
    const yes = node.yesTarget && doc.nodes[node.yesTarget] ? node.yesTarget : null
    const no = node.noTarget && doc.nodes[node.noTarget] ? node.noTarget : null

    if (yes && no) {
      const yw = subtreeWidth(yes)
      const nw = subtreeWidth(no)
      const total = yw + nw + LAYOUT.hGap
      const leftCenter = centerX - total / 2 + yw / 2
      const rightCenter = centerX + total / 2 - nw / 2
      place(yes, depth + 1, leftCenter)
      place(no, depth + 1, rightCenter)
    } else if (yes) {
      place(yes, depth + 1, centerX)
    } else if (no) {
      place(no, depth + 1, centerX)
    }
  }

  const rootId =
    doc.rootId && doc.nodes[doc.rootId] ? doc.rootId : Object.keys(doc.nodes)[0]

  if (rootId) {
    const rootW = subtreeWidth(rootId)
    place(rootId, 0, Math.max(rootW, LAYOUT.nodeWidth) / 2 + 40)
  }

  // 未連到樹上的孤立節點：排在下方，避免與主樹重疊
  let orphanIndex = 0
  Object.keys(doc.nodes).forEach((id) => {
    if (positions[id]) return
    positions[id] = {
      x: 40 + orphanIndex * (LAYOUT.nodeWidth + LAYOUT.hGap),
      y: LAYOUT.startY + 4 * LAYOUT.vGap + orphanIndex * 20,
    }
    orphanIndex += 1
  })

  return positions
}

/**
 * 將邏輯樹轉成 React Flow 節點與邊（預設階層排版）。
 * @param doc - 決策樹文件
 * @param positions - 可選既有座標（有則優先；無則自動排版）
 * @returns nodes 與 edges
 */
export function treeToFlow(
  doc: DecisionTreeDoc,
  positions?: Record<string, { x: number; y: number }>
): { nodes: DtFlowNode[]; edges: Edge[] } {
  const auto = positions && Object.keys(positions).length > 0 ? positions : computeTreeLayout(doc)
  const nodes: DtFlowNode[] = []
  const edges: Edge[] = []
  const list = Object.values(doc.nodes)

  list.forEach((n) => {
    const pos = auto[n.id] || { x: 80, y: 40 }
    nodes.push({
      id: n.id,
      type: 'dtNode',
      position: pos,
      data: {
        kind: n.kind,
        label: n.label,
        humanConfirm: n.humanConfirm,
        prompt: n.prompt,
        advice: n.advice,
        condition: n.condition,
      },
    })
    const human = n.humanConfirm === true || n.kind === 'manual'
    if (n.yesTarget) {
      edges.push({
        id: `${n.id}->yes->${n.yesTarget}`,
        source: n.id,
        target: n.yesTarget,
        sourceHandle: 'yes',
        label: human ? '是' : '通過',
        style: { stroke: '#16a34a' },
        // 預設 bezier；interactionWidth 方便點選以取消連結
        interactionWidth: 24,
      })
    }
    if (n.noTarget) {
      edges.push({
        id: `${n.id}->no->${n.noTarget}`,
        source: n.id,
        target: n.noTarget,
        sourceHandle: 'no',
        label: human ? '否' : '未通過',
        style: { stroke: '#dc2626' },
        interactionWidth: 24,
      })
    }
  })
  return { nodes, edges }
}

/**
 * 將 Flow 狀態寫回決策樹文件（保留 id／name／rootId）。
 * @param doc - 原文件
 * @param nodes - Flow 節點
 * @param edges - Flow 邊
 * @returns 更新後文件
 */
export function flowToTree(
  doc: DecisionTreeDoc,
  nodes: DtFlowNode[],
  edges: Edge[]
): DecisionTreeDoc {
  const logicNodes: Record<string, TreeNode> = {}

  for (const n of nodes) {
    const kind = (n.data.kind || 'result') as NodeKind
    const yesEdge = edges.find(
      (e) => e.source === n.id && (e.sourceHandle === 'yes' || e.label === '是' || e.label === '通過')
    )
    const noEdge = edges.find(
      (e) => e.source === n.id && (e.sourceHandle === 'no' || e.label === '否' || e.label === '未通過')
    )
    // 若無 handle 標記，依邊順序：第一條 yes、第二條 no
    const outs = edges.filter((e) => e.source === n.id)
    const yesTarget = yesEdge?.target ?? (outs[0] && outs[0] !== noEdge ? outs[0].target : null)
    const noTarget =
      noEdge?.target ?? (outs.length > 1 ? outs.find((e) => e.target !== yesTarget)?.target ?? null : null)

    // 舊版 manual 寫回時正規化為 decision + humanConfirm
    const humanConfirm =
      kind === 'manual' ? true : Boolean(n.data.humanConfirm)
    const normalizedKind: NodeKind = kind === 'manual' ? 'decision' : kind

    logicNodes[n.id] = {
      id: n.id,
      kind: normalizedKind,
      label: n.data.label || n.id,
      humanConfirm: humanConfirm || undefined,
      prompt: n.data.prompt,
      advice: n.data.advice,
      condition: humanConfirm ? undefined : n.data.condition,
      yesTarget: normalizedKind === 'result' ? null : yesTarget,
      noTarget: normalizedKind === 'result' ? null : noTarget,
    }
  }

  // root：優先既有 root，否則第一個決策／人工，否則第一個節點
  let rootId = doc.rootId
  if (!logicNodes[rootId]) {
    rootId =
      nodes.find((n) => n.data.kind === 'decision' || n.data.kind === 'manual')?.id ||
      nodes[0]?.id ||
      doc.rootId
  }

  return {
    ...doc,
    rootId,
    nodes: logicNodes,
    updatedAt: Date.now(),
  }
}

/**
 * 建立預設空條件群組。
 * @returns 條件群組
 */
export function defaultCondition(): ConditionGroup {
  return { mode: 'all', atLeast: 2, conditions: [] }
}

/**
 * 產生新節點 id。
 * @param kind - 節點種類
 * @returns id
 */
export function newNodeId(kind: NodeKind): string {
  return `${kind}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`
}
