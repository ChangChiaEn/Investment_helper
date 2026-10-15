'use client'

/**
 * 決策樹視覺編輯器：React Flow + 右側屬性面板 + 多樹列表。
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useEdgesState,
  useNodesState,
  Handle,
  Position,
  type Connection,
  type Edge,
  type NodeProps,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { INDICATOR_CATALOG } from '@/lib/tools/decision-tree/catalog'
import {
  addBlankTree,
  addSampleTree,
  deleteTree,
  loadTrees,
  renameTree,
  setActiveTreeId,
  upsertTree,
  type TreeListState,
} from '@/lib/tools/decision-tree/treeStore'
import type {
  CompareOp,
  ConditionMode,
  DecisionTreeDoc,
  FlowNodeData,
  MetricCondition,
  NodeKind,
} from '@/lib/tools/decision-tree/types'
import {
  defaultCondition,
  flowToTree,
  newNodeId,
  treeToFlow,
  type DtFlowNode,
} from '@/lib/tools/decision-tree/flowSync'

/**
 * 自訂節點外觀。
 * @param props - React Flow 節點 props
 * @returns 節點 UI
 */
function DtNodeView({ data, selected }: NodeProps<DtFlowNode>) {
  const kindColor =
    data.kind === 'decision' ? 'border-sky-500' : data.kind === 'manual' ? 'border-amber-500' : 'border-emerald-500'
  return (
    <div
      className={`min-w-[160px] rounded-xl border-2 bg-white px-3 py-2 shadow-sm ${kindColor} ${
        selected ? 'ring-2 ring-primary-400' : ''
      }`}
    >
      {data.kind !== 'result' && (
        <>
          <Handle type="target" position={Position.Top} className="!bg-gray-400" />
          <Handle type="source" id="yes" position={Position.Bottom} style={{ left: '30%' }} className="!bg-green-500" />
          <Handle type="source" id="no" position={Position.Bottom} style={{ left: '70%' }} className="!bg-red-500" />
        </>
      )}
      {data.kind === 'result' && <Handle type="target" position={Position.Top} className="!bg-gray-400" />}
      <div className="text-[10px] uppercase tracking-wide text-gray-400 mb-0.5">
        {data.kind === 'decision' ? '決策' : data.kind === 'manual' ? '人工' : '結果'}
      </div>
      <div className="text-sm font-medium text-gray-900">{data.label}</div>
    </div>
  )
}

const nodeTypes = { dtNode: DtNodeView }

/**
 * @returns 編輯器 UI
 */
export function TreeEditorPanel() {
  const [list, setList] = useState<TreeListState>({ trees: [], activeId: null })
  const active = useMemo(
    () => list.trees.find((t) => t.id === list.activeId) || null,
    [list]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState<DtFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    setList(loadTrees())
  }, [])

  useEffect(() => {
    if (!active) {
      setNodes([])
      setEdges([])
      return
    }
    const { nodes: n, edges: e } = treeToFlow(active)
    setNodes(n)
    setEdges(e)
    setSelectedId(null)
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    (doc: DecisionTreeDoc) => {
      setList(upsertTree(doc))
    },
    []
  )

  const saveFromFlow = useCallback(() => {
    if (!active) return
    const doc = flowToTree(active, nodes, edges)
    persist(doc)
  }, [active, nodes, edges, persist])

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle}-${connection.target}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: connection.sourceHandle === 'no' ? '未通過' : '通過',
        style: { stroke: connection.sourceHandle === 'no' ? '#dc2626' : '#16a34a' },
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges]
  )

  const selectedNode = nodes.find((n) => n.id === selectedId)

  const updateSelectedData = (patch: Partial<FlowNodeData>) => {
    if (!selectedId) return
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n))
    )
  }

  const addNode = (kind: NodeKind) => {
    const id = newNodeId(kind)
    const data: FlowNodeData = {
      kind,
      label: kind === 'decision' ? '新決策' : kind === 'manual' ? '人工確認' : '建議結果',
      condition: kind === 'decision' ? defaultCondition() : undefined,
      prompt: kind === 'manual' ? '請確認是否繼續？' : undefined,
      advice: kind === 'result' ? '建議內容' : undefined,
      adviceParams: kind === 'result' ? { 建議賣出比例: 0.33 } : undefined,
    }
    setNodes((nds) => [
      ...nds,
      {
        id,
        type: 'dtNode',
        position: { x: 120 + nds.length * 40, y: 80 + nds.length * 30 },
        data,
      },
    ])
    setSelectedId(id)
  }

  return (
    <div className="space-y-3">
      {/* 樹列表 */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="border rounded-lg px-3 py-2 text-sm"
          value={list.activeId || ''}
          onChange={(e) => {
            setActiveTreeId(e.target.value || null)
            setList(loadTrees())
          }}
        >
          <option value="">選擇決策樹</option>
          {list.trees.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="px-3 py-2 text-sm bg-primary-600 text-white rounded-lg"
          onClick={() => setList(addBlankTree())}
        >
          新建空白樹
        </button>
        <button
          type="button"
          className="px-3 py-2 text-sm bg-gray-100 rounded-lg"
          onClick={() => setList(addSampleTree())}
        >
          載入範例樹
        </button>
        {active && (
          <>
            <input
              className="border rounded-lg px-3 py-2 text-sm"
              value={active.name}
              onChange={(e) => setList(renameTree(active.id, e.target.value))}
            />
            <button
              type="button"
              className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg"
              onClick={() => {
                if (confirm('確定刪除此決策樹？')) setList(deleteTree(active.id))
              }}
            >
              刪除
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg"
              onClick={saveFromFlow}
            >
              儲存畫布
            </button>
          </>
        )}
      </div>

      {!active ? (
        <p className="text-sm text-gray-500">請新建或選擇一棵決策樹。</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          <div className="h-[520px] bg-white border rounded-xl overflow-hidden relative">
            <div className="absolute top-2 left-2 z-10 flex gap-1">
              <button type="button" className="text-xs bg-white border rounded px-2 py-1 shadow" onClick={() => addNode('decision')}>
                + 決策
              </button>
              <button type="button" className="text-xs bg-white border rounded px-2 py-1 shadow" onClick={() => addNode('manual')}>
                + 人工
              </button>
              <button type="button" className="text-xs bg-white border rounded px-2 py-1 shadow" onClick={() => addNode('result')}>
                + 結果
              </button>
            </div>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onSelectionChange={({ nodes: sel }) => setSelectedId(sel[0]?.id ?? null)}
              fitView
            >
              <Background />
              <Controls />
              <MiniMap />
            </ReactFlow>
          </div>

          <aside className="bg-white border rounded-xl p-4 space-y-3 overflow-y-auto max-h-[520px]">
            <h3 className="font-semibold text-gray-800">屬性</h3>
            {!selectedNode ? (
              <p className="text-sm text-gray-500">點選畫布上的節點以編輯。</p>
            ) : (
              <NodePropsForm
                data={selectedNode.data}
                onChange={updateSelectedData}
                onDelete={() => {
                  setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id))
                  setEdges((eds) =>
                    eds.filter((e) => e.source !== selectedNode.id && e.target !== selectedNode.id)
                  )
                  setSelectedId(null)
                }}
                onSetRoot={() => {
                  if (!active) return
                  persist({ ...flowToTree(active, nodes, edges), rootId: selectedNode.id })
                }}
              />
            )}
            <p className="text-xs text-gray-400">
              綠點＝通過／是，紅點＝未通過／否。儲存後「執行」分頁會使用本機樹。
              目前根節點：{active.rootId}
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

function NodePropsForm({
  data,
  onChange,
  onDelete,
  onSetRoot,
}: {
  data: FlowNodeData
  onChange: (patch: Partial<FlowNodeData>) => void
  onDelete: () => void
  onSetRoot: () => void
}) {
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        標題
        <input
          className="mt-1 w-full border rounded-lg px-2 py-1.5"
          value={data.label}
          onChange={(e) => onChange({ label: e.target.value })}
        />
      </label>
      <label className="block">
        類型
        <select
          className="mt-1 w-full border rounded-lg px-2 py-1.5"
          value={data.kind}
          onChange={(e) => onChange({ kind: e.target.value as NodeKind })}
        >
          <option value="decision">決策</option>
          <option value="manual">人工</option>
          <option value="result">結果</option>
        </select>
      </label>

      {data.kind === 'manual' && (
        <label className="block">
          問題
          <textarea
            className="mt-1 w-full border rounded-lg px-2 py-1.5"
            rows={3}
            value={data.prompt || ''}
            onChange={(e) => onChange({ prompt: e.target.value })}
          />
        </label>
      )}

      {data.kind === 'result' && (
        <>
          <label className="block">
            建議文案
            <textarea
              className="mt-1 w-full border rounded-lg px-2 py-1.5"
              rows={3}
              value={data.advice || ''}
              onChange={(e) => onChange({ advice: e.target.value })}
            />
          </label>
          <label className="block">
            建議參數（JSON）
            <textarea
              className="mt-1 w-full border rounded-lg px-2 py-1.5 font-mono text-xs"
              rows={3}
              value={JSON.stringify(data.adviceParams || {}, null, 2)}
              onChange={(e) => {
                try {
                  onChange({ adviceParams: JSON.parse(e.target.value) })
                } catch {
                  /* 輸入中略過 */
                }
              }}
            />
          </label>
        </>
      )}

      {data.kind === 'decision' && (
        <ConditionEditor
          value={data.condition || defaultCondition()}
          onChange={(condition) => onChange({ condition })}
        />
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button type="button" className="px-3 py-1.5 bg-sky-600 text-white rounded-lg text-xs" onClick={onSetRoot}>
          設為根節點並儲存
        </button>
        <button type="button" className="px-3 py-1.5 text-red-600 border border-red-200 rounded-lg text-xs" onClick={onDelete}>
          刪除節點
        </button>
      </div>
    </div>
  )
}

function ConditionEditor({
  value,
  onChange,
}: {
  value: NonNullable<FlowNodeData['condition']>
  onChange: (v: NonNullable<FlowNodeData['condition']>) => void
}) {
  const updateCond = (idx: number, patch: Partial<MetricCondition>) => {
    const conditions = value.conditions.map((c, i) => (i === idx ? { ...c, ...patch } : c))
    onChange({ ...value, conditions })
  }

  return (
    <div className="space-y-2 border-t pt-2">
      <div className="flex gap-2">
        <select
          className="border rounded px-2 py-1 text-xs"
          value={value.mode}
          onChange={(e) => onChange({ ...value, mode: e.target.value as ConditionMode })}
        >
          <option value="all">全部符合 (AND)</option>
          <option value="any">任一符合 (OR)</option>
          <option value="atLeast">至少 N 項</option>
        </select>
        {value.mode === 'atLeast' && (
          <input
            type="number"
            className="w-16 border rounded px-2 py-1 text-xs"
            value={value.atLeast ?? 2}
            min={1}
            onChange={(e) => onChange({ ...value, atLeast: Number(e.target.value) })}
          />
        )}
      </div>
      {value.conditions.map((c, idx) => (
        <div key={idx} className="bg-gray-50 rounded-lg p-2 space-y-1">
          <select
            className="w-full border rounded px-2 py-1 text-xs"
            value={c.indicatorId}
            onChange={(e) => updateCond(idx, { indicatorId: e.target.value })}
          >
            {INDICATOR_CATALOG.map((ind) => (
              <option key={ind.id} value={ind.id}>
                [{ind.source}] {ind.name}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <select
              className="border rounded px-2 py-1 text-xs"
              value={c.op}
              onChange={(e) => updateCond(idx, { op: e.target.value as CompareOp })}
            >
              {(['truthy', 'gte', 'gt', 'lte', 'lt', 'eq', 'neq', 'between'] as CompareOp[]).map((op) => (
                <option key={op} value={op}>
                  {op}
                </option>
              ))}
            </select>
            {c.op !== 'truthy' && (
              <input
                type="number"
                className="flex-1 border rounded px-2 py-1 text-xs"
                value={Number(c.value ?? 0)}
                onChange={(e) => updateCond(idx, { value: Number(e.target.value) })}
              />
            )}
            {c.op === 'between' && (
              <input
                type="number"
                className="w-20 border rounded px-2 py-1 text-xs"
                value={c.valueTo ?? 0}
                onChange={(e) => updateCond(idx, { valueTo: Number(e.target.value) })}
              />
            )}
          </div>
          <button
            type="button"
            className="text-[10px] text-red-600"
            onClick={() =>
              onChange({ ...value, conditions: value.conditions.filter((_, i) => i !== idx) })
            }
          >
            移除此條件
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-xs text-primary-700"
        onClick={() =>
          onChange({
            ...value,
            conditions: [
              ...value.conditions,
              { indicatorId: 'trust_buy_streak', op: 'gte', value: 3, params: { days: 10 } },
            ],
          })
        }
      >
        + 新增條件
      </button>
    </div>
  )
}
