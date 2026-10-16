'use client'

/**
 * 決策樹庫存欄：持股／使用者自訂分類／全域手動參數。
 */

import { useEffect, useState } from 'react'
import type { CustomList, DecisionInventory, HoldingItem } from '@/lib/tools/decision-tree/types'
import {
  addCustomList,
  addHolding,
  addListItem,
  removeCustomList,
  removeHolding,
  removeListItem,
  renameCustomList,
  updateGlobals,
  updateHolding,
} from '@/lib/tools/decision-tree/inventoryStore'

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
          {(
            [
              ['totalCapital', '總資金'],
              ['cashRemaining', '剩餘現金'],
              ['maxHoldings', '持股檔數上限'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm text-card-fg">
              {label}
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2"
                value={inventory[key]}
                onChange={(e) => onChange(updateGlobals(inventory, { [key]: Number(e.target.value) }))}
              />
            </label>
          ))}
        </div>
      )}

      {tab === 'holdings' && (
        <HoldingsTable
          items={inventory.holdings}
          onAdd={(item) => onChange(addHolding(inventory, item))}
          onUpdate={(id, patch) => onChange(updateHolding(inventory, id, patch))}
          onRemove={(id) => onChange(removeHolding(inventory, id))}
        />
      )}

      {activeList && (
        <SimpleList
          list={activeList}
          onRename={(name) => onChange(renameCustomList(inventory, activeList.id, name))}
          onDeleteList={() => {
            onChange(removeCustomList(inventory, activeList.id))
            setTab('holdings')
          }}
          onAdd={(symbol, name) => onChange(addListItem(inventory, activeList.id, { symbol, name }))}
          onRemove={(id) => onChange(removeListItem(inventory, activeList.id, id))}
        />
      )}
    </div>
  )
}

/**
 * 持股表格與新增表單。
 */
function HoldingsTable({
  items,
  onAdd,
  onUpdate,
  onRemove,
}: {
  items: HoldingItem[]
  onAdd: (item: Omit<HoldingItem, 'id'>) => void
  onUpdate: (id: string, patch: Partial<Omit<HoldingItem, 'id'>>) => void
  onRemove: (id: string) => void
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

  return (
    <div className="space-y-4">
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
              <th className="p-3"></th>
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
                  <button type="button" className="text-danger text-xs" onClick={() => onRemove(h.id)}>
                    刪除
                  </button>
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
 * 單一自訂分類的標的清單。
 */
function SimpleList({
  list,
  onRename,
  onDeleteList,
  onAdd,
  onRemove,
}: {
  list: CustomList
  onRename: (name: string) => void
  onDeleteList: () => void
  onAdd: (symbol: string, name: string) => void
  onRemove: (id: string) => void
}) {
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const [editingName, setEditingName] = useState(list.name)
  const full = list.maxItems !== undefined && list.items.length >= list.maxItems

  // 切換分類或外部重新命名時同步輸入框
  useEffect(() => {
    setEditingName(list.name)
  }, [list.id, list.name])

  return (
    <div className="bg-card rounded-xl border p-4 space-y-3">
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
      <div className="flex flex-wrap gap-2">
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="代號"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="名稱"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          type="button"
          disabled={full || !symbol.trim()}
          className="px-4 py-2 bg-primary text-primary-fg rounded-lg text-sm disabled:opacity-40"
          onClick={() => {
            onAdd(symbol.trim(), name.trim() || symbol.trim())
            setSymbol('')
            setName('')
          }}
        >
          新增
        </button>
      </div>
      <ul className="divide-y">
        {list.items.map((i) => (
          <li key={i.id} className="py-2 flex justify-between text-sm">
            <span>
              <span className="font-mono text-primary">{i.symbol}</span> {i.name}
            </span>
            <button type="button" className="text-danger text-xs" onClick={() => onRemove(i.id)}>
              刪除
            </button>
          </li>
        ))}
        {list.items.length === 0 && <li className="text-muted-fg text-sm py-2">尚無項目</li>}
      </ul>
    </div>
  )
}
