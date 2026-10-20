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
  useReactFlow,
  ReactFlowProvider,
  Handle,
  Position,
  type Connection,
  type Edge,
  type NodeProps,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { getAllIndicators } from '@/lib/tools/decision-tree/catalog'
import {
  COMPARE_OP_LABELS,
  COMPARE_OP_ORDER,
  getSourceLabel,
} from '@/lib/tools/decision-tree/labels'
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
} from '@/lib/tools/decision-tree/types'
import {
  defaultCondition,
  flowToTree,
  newNodeId,
  treeToFlow,
  type DtFlowNode,
} from '@/lib/tools/decision-tree/flowSync'

/**
 * 自訂節點外觀（通過＝左下、未通過＝右下）。
 * @param props - React Flow 節點 props
 * @returns 節點 UI
 */
function DtNodeView({ data, selected }: NodeProps<DtFlowNode>) {
  const human = data.humanConfirm === true || data.kind === 'manual'
  const kindColor =
    data.kind === 'result' ? 'border-success' : human ? 'border-amber-500' : 'border-primary'
  const kindBg =
    data.kind === 'result' ? 'bg-success-soft' : human ? 'bg-amber-50' : 'bg-primary-soft'
  const kindLabel =
    data.kind === 'result' ? '結果' : human ? '主觀確認' : '決策'

  return (
    <div
      className={`relative min-w-[168px] max-w-[220px] rounded-xl border-2 ${kindBg} px-3 py-2 shadow-sm mb-3 ${kindColor} ${
        selected ? 'ring-2 ring-primary-400' : ''
      }`}
    >
      {data.kind !== 'result' && (
        <>
          <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5" />
          <Handle
            type="source"
            id="yes"
            position={Position.Bottom}
            style={{ left: '28%' }}
            className="!bg-success-soft0 !w-2.5 !h-2.5"
          />
          <Handle
            type="source"
            id="no"
            position={Position.Bottom}
            style={{ left: '72%' }}
            className="!bg-danger-soft0 !w-2.5 !h-2.5"
          />
          <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-3 pointer-events-none">
            <span className="text-[9px] text-green-700 font-medium">
              {human ? '是' : '通過'}
            </span>
            <span className="text-[9px] text-danger font-medium">
              {human ? '否' : '未通過'}
            </span>
          </div>
        </>
      )}
      {data.kind === 'result' && (
        <Handle type="target" position={Position.Top} className="!bg-gray-400 !w-2.5 !h-2.5" />
      )}
      <div className="text-[10px] tracking-wide text-muted-fg mb-0.5">{kindLabel}</div>
      <div className="text-sm font-medium text-fg leading-snug">{data.label}</div>
    </div>
  )
}

const nodeTypes = { dtNode: DtNodeView }

/**
 * 外層包 ReactFlowProvider，供自動排版後 fitView。
 * @returns 編輯器 UI
 */
export function TreeEditorPanel() {
  return (
    <ReactFlowProvider>
      <TreeEditorInner />
    </ReactFlowProvider>
  )
}

/**
 * 編輯器本體（需在 Provider 內）。
 * @returns UI
 */
function TreeEditorInner() {
  const { fitView } = useReactFlow()
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
    // 載入後對齊視窗
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }))
  }, [active?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback((doc: DecisionTreeDoc) => {
    setList(upsertTree(doc))
  }, [])

  const saveFromFlow = useCallback(() => {
    if (!active) return
    const doc = flowToTree(active, nodes, edges)
    persist(doc)
  }, [active, nodes, edges, persist])

  /**
   * 依根節點與分支重新階層排版（通過左、未通過右）。
   */
  const autoLayout = useCallback(() => {
    if (!active) return
    const doc = flowToTree(active, nodes, edges)
    const { nodes: n, edges: e } = treeToFlow(doc)
    setNodes(n)
    setEdges(e)
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }))
  }, [active, nodes, edges, setNodes, setEdges, fitView])

  const onConnect = useCallback(
    (connection: Connection) => {
      const edge: Edge = {
        ...connection,
        id: `${connection.source}-${connection.sourceHandle}-${connection.target}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        label: connection.sourceHandle === 'no' ? '未通過' : '通過',
        style: { stroke: connection.sourceHandle === 'no' ? '#dc2626' : '#16a34a' },
        interactionWidth: 24,
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges]
  )

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const selectedNode = nodes.find((n) => n.id === selectedId)

  /**
   * 取消目前選取的連線。
   */
  const removeSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return
    setEdges((eds) => eds.filter((e) => e.id !== selectedEdgeId))
    setSelectedEdgeId(null)
  }, [selectedEdgeId, setEdges])

  const updateSelectedData = (patch: Partial<FlowNodeData>) => {
    if (!selectedId) return
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedId ? { ...n, data: { ...n.data, ...patch } } : n))
    )
  }

  /**
   * 新增決策或結果節點（不再提供獨立「人工」按鈕）。
   * @param kind - decision | result
   */
  const addNode = (kind: 'decision' | 'result') => {
    const id = newNodeId(kind)
    const data: FlowNodeData = {
      kind,
      label: kind === 'decision' ? '新決策' : '建議結果',
      condition: kind === 'decision' ? defaultCondition() : undefined,
      humanConfirm: false,
      advice: kind === 'result' ? '建議內容' : undefined,
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
          className="px-3 py-2 text-sm bg-primary text-primary-fg rounded-lg"
          onClick={() => setList(addBlankTree())}
        >
          新建空白樹
        </button>
        <button
          type="button"
          className="px-3 py-2 text-sm bg-muted rounded-lg"
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
              className="px-3 py-2 text-sm text-danger border border-red-200 rounded-lg"
              onClick={() => {
                if (confirm('確定刪除此決策樹？')) setList(deleteTree(active.id))
              }}
            >
              刪除
            </button>
            <button
              type="button"
              className="px-3 py-2 text-sm bg-success text-primary-fg rounded-lg"
              onClick={saveFromFlow}
            >
              儲存畫布
            </button>
          </>
        )}
      </div>

      {!active ? (
        <p className="text-sm text-muted-fg">請新建或選擇一棵決策樹。</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
          <div className="h-[560px] bg-card border rounded-xl overflow-hidden relative">
            <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1 max-w-[90%]">
              <button
                type="button"
                className="text-xs bg-card border rounded px-2 py-1 shadow"
                onClick={() => addNode('decision')}
              >
                + 決策
              </button>
              <button
                type="button"
                className="text-xs bg-card border rounded px-2 py-1 shadow"
                onClick={() => addNode('result')}
              >
                + 結果
              </button>
              <button
                type="button"
                className="text-xs bg-primary-soft border border-primary/40 text-primary rounded px-2 py-1 shadow"
                onClick={autoLayout}
              >
                自動排版
              </button>
            </div>
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              elementsSelectable
              edgesFocusable
              deleteKeyCode={['Backspace', 'Delete']}
              onSelectionChange={({ nodes: sel, edges: selEdges }) => {
                setSelectedId(sel[0]?.id ?? null)
                setSelectedEdgeId(selEdges[0]?.id ?? null)
              }}
              fitView
            >
              <Background gap={16} />
              <Controls />
              <MiniMap pannable zoomable />
            </ReactFlow>
          </div>

          <aside className="bg-card border rounded-xl p-4 space-y-3 overflow-y-auto max-h-[560px]">
            <h3 className="font-semibold text-card-fg">屬性</h3>
            {selectedEdgeId && !selectedNode && (
              <div className="space-y-2 text-sm">
                <p className="text-card-fg">已選取一條連線</p>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-sm text-red-700 border border-red-200 rounded-lg hover:bg-danger-soft"
                  onClick={removeSelectedEdge}
                >
                  取消連結
                </button>
                <p className="text-xs text-muted-fg">也可按鍵盤 Delete／Backspace 刪除連線。</p>
              </div>
            )}
            {!selectedNode && !selectedEdgeId && (
              <p className="text-sm text-muted-fg">點選節點編輯，或點選連線後可取消連結。</p>
            )}
            {selectedNode && (
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
            <p className="text-xs text-muted-fg">
              綠＝通過／是（左），紅＝未通過／否（右）。點連線 →「取消連結」或按 Delete。連線後可「自動排版」。
            </p>
          </aside>
        </div>
      )}
    </div>
  )
}

/**
 * 右側節點屬性表單（類型由建立方式決定，不可下拉改類型）。
 */
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
  const human = data.humanConfirm === true || data.kind === 'manual'
  const kindLabel =
    data.kind === 'result' ? '結果' : human ? '決策（主觀確認）' : '決策'

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
      <p className="text-xs text-muted-fg">
        類型：<span className="text-card-fg font-medium">{kindLabel}</span>
        （由「+ 決策／+ 結果」決定，不可改類型）
      </p>

      {data.kind === 'decision' && (
        <label className="flex items-start gap-2 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={human}
            onChange={(e) => {
              const on = e.target.checked
              if (on) {
                onChange({
                  humanConfirm: true,
                  prompt: data.prompt || '請確認是否繼續？',
                  condition: undefined,
                })
              } else {
                onChange({
                  humanConfirm: false,
                  prompt: undefined,
                  condition: data.condition || defaultCondition(),
                })
              }
            }}
          />
          <span>
            <span className="font-medium text-card-fg">需主觀確認（執行時暫停）</span>
            <span className="block text-muted-fg mt-0.5">
              勾選後改為人工作答是／否；不擋「自填」庫存指標，僅此節點會暫停。
            </span>
          </span>
        </label>
      )}

      {data.kind === 'decision' && human && (
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
        <label className="block">
          建議文案
          <textarea
            className="mt-1 w-full border rounded-lg px-2 py-1.5"
            rows={3}
            value={data.advice || ''}
            onChange={(e) => onChange({ advice: e.target.value })}
          />
        </label>
      )}

      {data.kind === 'decision' && !human && (
        <ConditionEditor
          value={data.condition || defaultCondition()}
          onChange={(condition) => onChange({ condition })}
        />
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          className="px-3 py-1.5 bg-primary text-primary-fg rounded-lg text-xs"
          onClick={onSetRoot}
        >
          設為根節點並儲存
        </button>
        <button
          type="button"
          className="px-3 py-1.5 text-danger border border-red-200 rounded-lg text-xs"
          onClick={onDelete}
        >
          刪除節點
        </button>
      </div>
    </div>
  )
}

/**
 * 決策條件編輯：指標可搜尋、運算子中文。
 */
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
        <div key={idx} className="relative bg-muted rounded-lg p-2 space-y-1.5">
          <IndicatorPicker
            value={c.indicatorId}
            onChange={(indicatorId) => updateCond(idx, { indicatorId })}
          />
          {/* 運算子與數值改直向排列，避免側欄寬度不足溢位 */}
          <select
            className="w-full border rounded px-2 py-1 text-xs"
            value={c.op}
            onChange={(e) => updateCond(idx, { op: e.target.value as CompareOp })}
          >
            {COMPARE_OP_ORDER.map((op) => (
              <option key={op} value={op}>
                {COMPARE_OP_LABELS[op]}
              </option>
            ))}
          </select>
          {c.op !== 'truthy' && (
            <div className="flex gap-1 min-w-0">
              <input
                type="number"
                className="min-w-0 flex-1 border rounded px-2 py-1 text-xs"
                value={Number(c.value ?? 0)}
                onChange={(e) => updateCond(idx, { value: Number(e.target.value) })}
                placeholder={c.op === 'between' ? '下限' : '比較值'}
              />
              {c.op === 'between' && (
                <input
                  type="number"
                  className="min-w-0 w-[45%] shrink border rounded px-2 py-1 text-xs"
                  value={c.valueTo ?? 0}
                  onChange={(e) => updateCond(idx, { valueTo: Number(e.target.value) })}
                  placeholder="上限"
                />
              )}
            </div>
          )}
          <button
            type="button"
            className="text-[10px] text-danger"
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

/**
 * 可搜尋的指標選擇器（來源以中文顯示）。
 * @param value - 目前指標 id
 * @param onChange - 變更回呼
 * @returns UI
 */
function IndicatorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  // 每次開啟／渲染時合併本機公式
  const catalog = useMemo(() => getAllIndicators(), [open])

  const selected = catalog.find((i) => i.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((ind) => {
      const src = getSourceLabel(ind.source)
      return (
        ind.name.toLowerCase().includes(q) ||
        ind.id.toLowerCase().includes(q) ||
        ind.description.toLowerCase().includes(q) ||
        src.includes(query.trim()) ||
        ind.source.toLowerCase().includes(q)
      )
    })
  }, [query, catalog])

  return (
    <div className="relative w-full">
      <button
        type="button"
        className="w-full border rounded px-2 py-1.5 text-xs text-left bg-card hover:bg-muted"
        onClick={() => setOpen((o) => !o)}
      >
        {selected ? (
          <span>
            <span className="text-primary">[{getSourceLabel(selected.source)}]</span>{' '}
            {selected.name}
          </span>
        ) : (
          <span className="text-muted-fg">選擇指標</span>
        )}
      </button>
      {open && (
        /* 寬度對齊條件卡片（父層 relative）；高度獨立 max-h，不撐高卡片 */
        <div className="absolute z-30 left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg">
          <input
            autoFocus
            className="w-full border-b px-2 py-1.5 text-xs outline-none"
            placeholder="搜尋指標名稱、代號、來源…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <ul className="max-h-40 overflow-y-auto">
            {filtered.length === 0 && (
              <li className="px-2 py-2 text-xs text-muted-fg">無符合項目</li>
            )}
            {filtered.map((ind) => (
              <li key={ind.id}>
                <button
                  type="button"
                  className={`w-full text-left px-2 py-1.5 text-xs hover:bg-primary-soft ${
                    ind.id === value ? 'bg-primary-soft font-medium' : ''
                  }`}
                  onClick={() => {
                    onChange(ind.id)
                    setOpen(false)
                    setQuery('')
                  }}
                >
                  <span className="text-primary">[{getSourceLabel(ind.source)}]</span> {ind.name}
                  <span className="block text-[10px] text-muted-fg font-mono">{ind.id}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
