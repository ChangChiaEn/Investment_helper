/**
 * 決策樹文件 ↔ React Flow nodes/edges 同步。
 */

import type { Edge, Node } from '@xyflow/react'
import type { ConditionGroup, DecisionTreeDoc, FlowNodeData, NodeKind, TreeNode } from './types'

/** Flow 節點資料型別 */
export type DtFlowNode = Node<FlowNodeData>

/**
 * 將邏輯樹轉成 React Flow 節點與邊（若無定位則自動排版）。
 * @param doc - 決策樹文件
 * @param positions - 可選既有座標
 * @returns nodes 與 edges
 */
export function treeToFlow(
  doc: DecisionTreeDoc,
  positions?: Record<string, { x: number; y: number }>
): { nodes: DtFlowNode[]; edges: Edge[] } {
  const nodes: DtFlowNode[] = []
  const edges: Edge[] = []
  const list = Object.values(doc.nodes)
  list.forEach((n, i) => {
    const pos = positions?.[n.id] || { x: 80 + (i % 3) * 260, y: 40 + Math.floor(i / 3) * 160 }
    nodes.push({
      id: n.id,
      type: 'dtNode',
      position: pos,
      data: {
        kind: n.kind,
        label: n.label,
        prompt: n.prompt,
        advice: n.advice,
        adviceParams: n.adviceParams,
        condition: n.condition,
      },
    })
    if (n.yesTarget) {
      edges.push({
        id: `${n.id}->yes->${n.yesTarget}`,
        source: n.id,
        target: n.yesTarget,
        sourceHandle: 'yes',
        label: n.kind === 'manual' ? '是' : '通過',
        style: { stroke: '#16a34a' },
      })
    }
    if (n.noTarget) {
      edges.push({
        id: `${n.id}->no->${n.noTarget}`,
        source: n.id,
        target: n.noTarget,
        sourceHandle: 'no',
        label: n.kind === 'manual' ? '否' : '未通過',
        style: { stroke: '#dc2626' },
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
    const yesEdge = edges.find((e) => e.source === n.id && (e.sourceHandle === 'yes' || e.label === '是' || e.label === '通過'))
    const noEdge = edges.find((e) => e.source === n.id && (e.sourceHandle === 'no' || e.label === '否' || e.label === '未通過'))
    // 若無 handle 標記，依邊順序：第一條 yes、第二條 no
    const outs = edges.filter((e) => e.source === n.id)
    const yesTarget = yesEdge?.target ?? (outs[0] && outs[0] !== noEdge ? outs[0].target : null)
    const noTarget = noEdge?.target ?? (outs.length > 1 ? outs.find((e) => e.target !== yesTarget)?.target ?? null : null)

    logicNodes[n.id] = {
      id: n.id,
      kind,
      label: n.data.label || n.id,
      prompt: n.data.prompt,
      advice: n.data.advice,
      adviceParams: n.data.adviceParams,
      condition: n.data.condition,
      yesTarget: kind === 'result' ? null : yesTarget,
      noTarget: kind === 'result' ? null : noTarget,
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
