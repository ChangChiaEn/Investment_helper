'use client'

/**
 * 共用庫存欄：持股／使用者自訂分類／全域手動參數（可供決策樹等工具引用）。
 * 持股與各分類可互相移動，並保留進場價／股數／波段高等回測欄位。
 */

import { useEffect, useState } from 'react'
import type { CustomList, DecisionInventory, HoldingItem, ListItem } from '@/lib/inventory'
import {
  addCustomList,
  addHolding,
  addListItem,
  calcCashRemaining,
  calcInvestedCapital,
  moveHoldingToList,
  moveListItemToHoldings,
  moveListItemToList,
  removeCustomList,
  removeHolding,
  removeListItem,
  renameCustomList,
  updateGlobals,
  updateHolding,
  updateListItem,
} from '@/lib/inventory'

interface Props {
  inventory: DecisionInventory
  onChange: (inv: DecisionInventory) => void
}

type TabKey = 'holdings' | 'globals' | string

/**
 * @param inventory - 目前庫存
 * @param onChange - 變更回呼
 * @returns 庫存管理 UI
 */
export function InventoryPanel({ inventory, onChange }: Props) {
  const [tab, setTab] = useState<TabKey>('holdings')
  const [newListName, setNewListName] = useState('')

  const activeList: CustomList | undefined = inventory.lists.find((l) => l.id === tab)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <button
          type="button"
          onClick={() => setTab('holdings')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            tab === 'holdings' ? 'bg-primary text-primary-fg' : 'bg-muted text-card-fg hover:bg-muted'
          }`}
        >
          持股
        </button>
        {inventory.lists.map((list) => (
          <button
            key={list.id}
            type="button"
            onClick={() => setTab(list.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === list.id ? 'bg-primary text-primary-fg' : 'bg-muted text-card-fg hover:bg-muted'
            }`}
          >
            {list.name}
            <span className="ml-1 text-xs opacity-70">({list.items.length})</span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTab('globals')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
            tab === 'globals' ? 'bg-primary text-primary-fg' : 'bg-muted text-card-fg hover:bg-muted'
          }`}
        >
          全域參數
        </button>
      </div>

      {/* 新增分類 */}
      <div className="flex flex-wrap gap-2 items-end bg-slate-50 border border-slate-100 rounded-xl p-3">
        <label className="text-xs text-muted-fg">
          新增分類（如觀察、候選、半導體）
          <input
            className="mt-1 block border rounded-lg px-3 py-2 text-sm min-w-[160px]"
            placeholder="分類名稱"
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (!newListName.trim()) return
                const next = addCustomList(inventory, newListName)
                onChange(next)
                const created = next.lists.find((l) => l.name === newListName.trim())
                if (created) setTab(created.id)
                setNewListName('')
              }
            }}
          />
        </label>
        <button
          type="button"
          className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-sm"
          onClick={() => {
            if (!newListName.trim()) return
            const next = addCustomList(inventory, newListName)
            onChange(next)
            const created = next.lists.find((l) => l.name === newListName.trim())
            if (created) setTab(created.id)
            setNewListName('')
          }}
        >
          新增分類
        </button>
        <p className="text-xs text-muted-fg w-full sm:w-auto sm:ml-2">
          分類僅用來分組標的，不預設「觀察／候選」；可自行建立。
        </p>
      </div>

      {tab === 'globals' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-card rounded-xl border p-4">
          <label className="text-sm text-card-fg">
            總資金
            <input
              type="number"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={inventory.totalCapital}
              onChange={(e) =>
                onChange(updateGlobals(inventory, { totalCapital: Number(e.target.value) }))
              }
            />
          </label>
          {/* 剩餘現金由持股總投入自動推算，僅供檢視 */}
          <label className="text-sm text-card-fg">
            剩餘現金
            <input
              type="number"
              readOnly
              className="mt-1 w-full border rounded-lg px-3 py-2 bg-muted text-muted-fg"
              value={calcCashRemaining(inventory)}
              title="總資金 − Σ(進場價 × 股數)"
            />
            <span className="mt-1 block text-xs text-muted-fg">
              自動計算：總資金 − 持股總投入
            </span>
          </label>
          <label className="text-sm text-card-fg">
            持股檔數上限
            <input
              type="number"
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={inventory.maxHoldings}
              onChange={(e) =>
                onChange(updateGlobals(inventory, { maxHoldings: Number(e.target.value) }))
              }
            />
          </label>
        </div>
      )}

      {tab === 'holdings' && (
        <HoldingsTable
          items={inventory.holdings}
          lists={inventory.lists}
          investedCapital={calcInvestedCapital(inventory)}
          onAdd={(item) => onChange(addHolding(inventory, item))}
          onUpdate={(id, patch) => onChange(updateHolding(inventory, id, patch))}
          onRemove={(id) => onChange(removeHolding(inventory, id))}
          onMoveToList={(holdingId, listId) =>
            onChange(moveHoldingToList(inventory, holdingId, listId))
          }
        />
      )}

      {activeList && (
        <SimpleList
          list={activeList}
          otherLists={inventory.lists.filter((l) => l.id !== activeList.id)}
          onRename={(name) => onChange(renameCustomList(inventory, activeList.id, name))}
          onDeleteList={() => {
            onChange(removeCustomList(inventory, activeList.id))
            setTab('holdings')
          }}
          onAdd={(item) => onChange(addListItem(inventory, activeList.id, item))}
          onUpdate={(id, patch) =>
            onChange(updateListItem(inventory, activeList.id, id, patch))
          }
          onRemove={(id) => onChange(removeListItem(inventory, activeList.id, id))}
          onMoveToHoldings={(itemId) =>
            onChange(moveListItemToHoldings(inventory, activeList.id, itemId))
          }
          onMoveToList={(itemId, toListId) =>
            onChange(moveListItemToList(inventory, activeList.id, itemId, toListId))
          }
        />
      )}
    </div>
  )
}

/**
 * 移動目標下拉：空白表示不動作；選後立即移動並重設。
 */
function MoveSelect({
  label,
  options,
  onPick,
}: {
  label: string
  options: { value: string; label: string }[]
  onPick: (value: string) => void
}) {
  return (
    <select
      aria-label={label}
      className="text-xs border rounded px-1.5 py-1 bg-bg text-fg max-w-[9rem]"
      defaultValue=""
      onChange={(e) => {
        const v = e.target.value
        if (!v) return
        onPick(v)
        e.target.value = ''
      }}
    >
      <option value="" disabled>
        {label}
      </option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

/**
 * 持股表格與新增表單；可移至任一自訂分類並保留進場欄位。
 */
function HoldingsTable({
  items,
  lists,
  investedCapital,
  onAdd,
  onUpdate,
  onRemove,
  onMoveToList,
}: {
  items: HoldingItem[]
  lists: CustomList[]
  /** 目前總投入：Σ(進場價 × 股數) */
  investedCapital: number
  onAdd: (item: Omit<HoldingItem, 'id'>) => void
  onUpdate: (id: string, patch: Partial<Omit<HoldingItem, 'id'>>) => void
  onRemove: (id: string) => void
  onMoveToList: (holdingId: string, listId: string) => void
}) {
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    entryPrice: 0,
    shares: 0,
    entryDate: new Date().toISOString().slice(0, 10),
    swingHigh: 0,
    note: '',
  })

  const listOptions = lists.map((l) => ({ value: l.id, label: l.name }))

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-xl px-4 py-3 flex flex-wrap gap-4 items-baseline text-sm">
        <span className="font-medium text-card-fg">目前總投入資金</span>
        <span className="font-mono text-lg text-fg tabular-nums">
          {investedCapital.toLocaleString('zh-TW')}
        </span>
        <span className="text-xs text-muted-fg">Σ(進場價 × 股數)</span>
      </div>
      <div className="bg-card rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            ['symbol', '代號'],
            ['name', '名稱'],
            ['entryPrice', '進場價'],
            ['shares', '股數'],
            ['entryDate', '進場日'],
            ['swingHigh', '波段最高價'],
            ['note', '備註'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-xs text-muted-fg">
            {label}
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
              type={
                key === 'entryPrice' || key === 'shares' || key === 'swingHigh'
                  ? 'number'
                  : key === 'entryDate'
                    ? 'date'
                    : 'text'
              }
              value={form[key] as string | number}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]:
                    key === 'entryPrice' || key === 'shares' || key === 'swingHigh'
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          </label>
        ))}
        <div className="flex items-end">
          <button
            type="button"
            className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-sm"
            onClick={() => {
              if (!form.symbol.trim()) return
              onAdd({ ...form, symbol: form.symbol.trim(), name: form.name.trim() || form.symbol })
              setForm({ ...form, symbol: '', name: '', note: '' })
            }}
          >
            新增持股
          </button>
        </div>
      </div>

      <div className="overflow-x-auto bg-card rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted text-left text-muted-fg">
            <tr>
              <th className="p-3">代號</th>
              <th className="p-3">名稱</th>
              <th className="p-3">進場價</th>
              <th className="p-3">股數</th>
              <th className="p-3">波段高</th>
              <th className="p-3">移動／刪除</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-muted-fg text-center">
                  尚無持股，請手動新增
                </td>
              </tr>
            )}
            {items.map((h) => (
              <tr key={h.id} className="border-t">
                <td className="p-3 font-mono">{h.symbol}</td>
                <td className="p-3">{h.name}</td>
                <td className="p-3">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={h.entryPrice}
                    onChange={(e) => onUpdate(h.id, { entryPrice: Number(e.target.value) })}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={h.shares}
                    onChange={(e) => onUpdate(h.id, { shares: Number(e.target.value) })}
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={h.swingHigh}
                    onChange={(e) => onUpdate(h.id, { swingHigh: Number(e.target.value) })}
                  />
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {listOptions.length > 0 && (
                      <MoveSelect
                        label="移至…"
                        options={listOptions}
                        onPick={(listId) => onMoveToList(h.id, listId)}
                      />
                    )}
                    <button type="button" className="text-danger text-xs" onClick={() => onRemove(h.id)}>
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/**
 * 自訂分類（關注等）：排版與持股表相同（新增表單＋欄位表格）。
 */
function SimpleList({
  list,
  otherLists,
  onRename,
  onDeleteList,
  onAdd,
  onUpdate,
  onRemove,
  onMoveToHoldings,
  onMoveToList,
}: {
  list: CustomList
  otherLists: CustomList[]
  onRename: (name: string) => void
  onDeleteList: () => void
  onAdd: (item: Omit<ListItem, 'id' | 'addedAt'>) => void
  onUpdate: (id: string, patch: Partial<Omit<ListItem, 'id' | 'addedAt'>>) => void
  onRemove: (id: string) => void
  onMoveToHoldings: (itemId: string) => void
  onMoveToList: (itemId: string, toListId: string) => void
}) {
  // 與持股新增表單同一組欄位，便於統一排版與回測資料
  const [form, setForm] = useState({
    symbol: '',
    name: '',
    entryPrice: 0,
    shares: 0,
    entryDate: new Date().toISOString().slice(0, 10),
    swingHigh: 0,
    note: '',
  })
  const [editingName, setEditingName] = useState(list.name)
  const full = list.maxItems !== undefined && list.items.length >= list.maxItems

  // 切換分類或外部重新命名時同步輸入框
  useEffect(() => {
    setEditingName(list.name)
  }, [list.id, list.name])

  const moveOptions = [
    { value: '__holdings__', label: '持股' },
    ...otherLists.map((l) => ({ value: l.id, label: l.name })),
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <input
            className="border rounded-lg px-2 py-1 text-sm font-medium"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onBlur={() => {
              if (editingName.trim() && editingName.trim() !== list.name) {
                onRename(editingName)
              } else {
                setEditingName(list.name)
              }
            }}
          />
          {list.maxItems !== undefined && (
            <span className="text-xs text-muted-fg">
              {list.items.length} / {list.maxItems}
            </span>
          )}
        </div>
        <button
          type="button"
          className="text-xs text-danger hover:underline"
          onClick={() => {
            if (confirm(`確定刪除分類「${list.name}」？`)) onDeleteList()
          }}
        >
          刪除分類
        </button>
      </div>

      {/* 與持股相同的新增欄位網格 */}
      <div className="bg-card rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
        {(
          [
            ['symbol', '代號'],
            ['name', '名稱'],
            ['entryPrice', '進場價'],
            ['shares', '股數'],
            ['entryDate', '進場日'],
            ['swingHigh', '波段最高價'],
            ['note', '備註'],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="text-xs text-muted-fg">
            {label}
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
              type={
                key === 'entryPrice' || key === 'shares' || key === 'swingHigh'
                  ? 'number'
                  : key === 'entryDate'
                    ? 'date'
                    : 'text'
              }
              value={form[key] as string | number}
              onChange={(e) =>
                setForm({
                  ...form,
                  [key]:
                    key === 'entryPrice' || key === 'shares' || key === 'swingHigh'
                      ? Number(e.target.value)
                      : e.target.value,
                })
              }
            />
          </label>
        ))}
        <div className="flex items-end">
          <button
            type="button"
            disabled={full || !form.symbol.trim()}
            className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-sm disabled:opacity-40"
            onClick={() => {
              if (!form.symbol.trim()) return
              onAdd({
                symbol: form.symbol.trim(),
                name: form.name.trim() || form.symbol.trim(),
                entryPrice: form.entryPrice,
                shares: form.shares,
                entryDate: form.entryDate,
                swingHigh: form.swingHigh,
                note: form.note || undefined,
              })
              setForm({ ...form, symbol: '', name: '', note: '' })
            }}
          >
            新增
          </button>
        </div>
      </div>

      {/* 與持股相同的資料表格 */}
      <div className="overflow-x-auto bg-card rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-muted text-left text-muted-fg">
            <tr>
              <th className="p-3">代號</th>
              <th className="p-3">名稱</th>
              <th className="p-3">進場價</th>
              <th className="p-3">股數</th>
              <th className="p-3">波段高</th>
              <th className="p-3">移動／刪除</th>
            </tr>
          </thead>
          <tbody>
            {list.items.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-muted-fg text-center">
                  尚無項目，請手動新增
                </td>
              </tr>
            )}
            {list.items.map((i) => (
              <tr key={i.id} className="border-t">
                <td className="p-3 font-mono">{i.symbol}</td>
                <td className="p-3">{i.name}</td>
                <td className="p-3">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={i.entryPrice ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      onUpdate(i.id, {
                        entryPrice: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={i.shares ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      onUpdate(i.id, {
                        shares: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <input
                    type="number"
                    className="w-24 border rounded px-2 py-1"
                    value={i.swingHigh ?? ''}
                    placeholder="—"
                    onChange={(e) =>
                      onUpdate(i.id, {
                        swingHigh: e.target.value === '' ? undefined : Number(e.target.value),
                      })
                    }
                  />
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <MoveSelect
                      label="移至…"
                      options={moveOptions}
                      onPick={(value) => {
                        if (value === '__holdings__') onMoveToHoldings(i.id)
                        else onMoveToList(i.id, value)
                      }}
                    />
                    <button
                      type="button"
                      className="text-danger text-xs"
                      onClick={() => onRemove(i.id)}
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
