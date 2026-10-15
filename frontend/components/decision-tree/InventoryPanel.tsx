'use client'

/**
 * 決策樹庫存欄：持股／觀察／候選與全域手動參數。
 */

import { useState } from 'react'
import type { DecisionInventory, HoldingItem } from '@/lib/tools/decision-tree/types'
import {
  addHolding,
  addListItem,
  removeHolding,
  removeListItem,
  updateGlobals,
  updateHolding,
} from '@/lib/tools/decision-tree/inventoryStore'

interface Props {
  inventory: DecisionInventory
  onChange: (inv: DecisionInventory) => void
}

/**
 * @param inventory - 目前庫存
 * @param onChange - 變更回呼
 * @returns 庫存管理 UI
 */
export function InventoryPanel({ inventory, onChange }: Props) {
  const [tab, setTab] = useState<'holdings' | 'watchlist' | 'candidates' | 'globals'>('holdings')

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(
          [
            ['holdings', '持股'],
            ['watchlist', '觀察清單'],
            ['candidates', '候選池'],
            ['globals', '全域參數'],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              tab === k ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'globals' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white rounded-xl border p-4">
          {(
            [
              ['totalCapital', '總資金'],
              ['cashRemaining', '剩餘現金'],
              ['maxHoldings', '持股檔數上限'],
              ['maxWatchlist', '觀察清單上限'],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="text-sm text-gray-700">
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

      {(tab === 'watchlist' || tab === 'candidates') && (
        <SimpleList
          title={tab === 'watchlist' ? '觀察清單' : '候選池'}
          items={inventory[tab]}
          limit={tab === 'watchlist' ? inventory.maxWatchlist : undefined}
          onAdd={(symbol, name) => onChange(addListItem(inventory, tab, { symbol, name }))}
          onRemove={(id) => onChange(removeListItem(inventory, tab, id))}
        />
      )}
    </div>
  )
}

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
      <div className="bg-white rounded-xl border p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
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
          <label key={key} className="text-xs text-gray-600">
            {label}
            <input
              className="mt-1 w-full border rounded-lg px-2 py-1.5 text-sm"
              type={key === 'entryPrice' || key === 'shares' || key === 'swingHigh' ? 'number' : key === 'entryDate' ? 'date' : 'text'}
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
            className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm"
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

      <div className="overflow-x-auto bg-white rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-600">
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
                <td colSpan={6} className="p-4 text-gray-400 text-center">
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
                  <button type="button" className="text-red-600 text-xs" onClick={() => onRemove(h.id)}>
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

function SimpleList({
  title,
  items,
  limit,
  onAdd,
  onRemove,
}: {
  title: string
  items: { id: string; symbol: string; name: string }[]
  limit?: number
  onAdd: (symbol: string, name: string) => void
  onRemove: (id: string) => void
}) {
  const [symbol, setSymbol] = useState('')
  const [name, setName] = useState('')
  const full = limit !== undefined && items.length >= limit

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-800">{title}</h3>
        {limit !== undefined && (
          <span className="text-xs text-gray-500">
            {items.length} / {limit}
          </span>
        )}
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
          className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm disabled:opacity-40"
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
        {items.map((i) => (
          <li key={i.id} className="py-2 flex justify-between text-sm">
            <span>
              <span className="font-mono text-primary-700">{i.symbol}</span> {i.name}
            </span>
            <button type="button" className="text-red-600 text-xs" onClick={() => onRemove(i.id)}>
              刪除
            </button>
          </li>
        ))}
        {items.length === 0 && <li className="text-gray-400 text-sm py-2">尚無項目</li>}
      </ul>
    </div>
  )
}
