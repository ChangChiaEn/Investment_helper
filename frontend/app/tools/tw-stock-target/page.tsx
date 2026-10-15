'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Search, List, Activity, Crosshair } from 'lucide-react';
import { useToolCache } from '@/hooks/useToolCache';
import { WatchlistButton } from '@/components/WatchlistButton';
import type { TrackedStock as Stock, DiscoveredStock, DiscoveryResult, ScanMode, StockQuote } from '@/lib/tools/tw-stock-target/types';
import { loadTrackedStocks } from '@/lib/tools/tw-stock-target/storage';

function cn(...inputs: (string | false | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}

const STORAGE_KEY = 'sagafisc_tw_stock_targets';

function TaiwanStockTargetTool() {
  const { cached, save } = useToolCache<{
    activeTab: 'tracking' | 'discover'; discoveredStocks: DiscoveredStock[];
    scanMode: ScanMode; tradingDates: string[]; hasScanned: boolean;
  }>('tw-stock-target');
  const [activeTab, setActiveTab] = useState<'tracking' | 'discover'>(cached?.activeTab ?? 'tracking');
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const [newSymbol, setNewSymbol] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<Date | null>(null);
  const quoteRequest = useRef<AbortController | null>(null);
  const scanRequest = useRef<AbortController | null>(null);

  const [discoveredStocks, setDiscoveredStocks] = useState<DiscoveredStock[]>(cached?.discoveredStocks ?? []);
  const [isScanning, setIsScanning] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(cached?.scanMode ?? 'strong');
  const [tradingDates, setTradingDates] = useState<string[]>(cached?.tradingDates ?? []);
  const [hasScanned, setHasScanned] = useState(cached?.hasScanned ?? false);

  useEffect(() => {
    try {
      setStocks(loadTrackedStocks(localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('stock-targets')));
    } catch {
      setError('無法讀取本機追蹤資料，請確認瀏覽器允許儲存資料。');
    }
    setReady(true);
    return () => scanRequest.current?.abort();
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks)); }
    catch { setError('追蹤資料無法儲存，請確認瀏覽器儲存空間與權限。'); }
  }, [stocks, ready]);

  useEffect(() => {
    save({ activeTab, discoveredStocks, scanMode, tradingDates, hasScanned });
  }, [activeTab, discoveredStocks, scanMode, tradingDates, hasScanned, save]);

  useEffect(() => {
    const symbol = searchParams.get('symbol')?.trim().toUpperCase();
    if (!ready || !symbol || !/^\d{4,6}[A-Z]?(?:\.TW|\.TWO)?$/.test(symbol)) return;
    setStocks(previous => previous.some(stock => stock.symbol === symbol) || previous.length >= 50
      ? previous : [...previous, { symbol, name: searchParams.get('name') || symbol, targets: [] }]);
  }, [ready, searchParams]);

  const symbols = stocks.map(stock => stock.symbol).join(',');
  const fetchPrices = useCallback(async () => {
    if (!ready || !symbols || quoteRequest.current) return;
    const controller = new AbortController();
    quoteRequest.current = controller;
    setIsFetching(true);
    try {
      const response = await fetch(`/api/tw-stock-target/stocks?symbols=${encodeURIComponent(symbols)}`, { signal: controller.signal });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '無法取得報價');
      }
      const data: StockQuote[] = await response.json();
      setError('');

      setStocks(prevStocks => prevStocks.map(stock => {
        const quote = data.find(q => q.symbol === stock.symbol);
        if (quote) {
          let newTargets = [...stock.targets];
          if (quote.targetPrice) {
            const existingIdx = newTargets.findIndex(t => t.label === '法人目標價');
            if (existingIdx >= 0) {
              // Update existing target price
              newTargets[existingIdx] = {
                ...newTargets[existingIdx],
                price: parseFloat(quote.targetPrice.toFixed(2))
              };
            } else if (newTargets.length === 0) {
              // Auto-add target price if no targets exist (e.g., newly added stock)
              newTargets.push({
                id: crypto.randomUUID(),
                price: parseFloat(quote.targetPrice.toFixed(2)),
                label: '法人目標價'
              });
            }
          }

          return {
            ...stock,
            name: /[\u3400-\u9FFF]/.test(stock.name) ? stock.name : quote.name || stock.name,
            currentPrice: quote.price,
            change: quote.change,
            changePercent: quote.changePercent,
            updatedAt: quote.updatedAt,
            targets: newTargets,
            error: undefined
          };
        }
        return { ...stock, error: '無法取得報價' };
      }));
      setLastFetchTime(new Date());
    } catch (error) {
      if (controller.signal.aborted) return;
      const message = error instanceof Error ? error.message : '無法取得報價，請稍後重試。';
      setError(message);
      setStocks(previous => previous.map(stock => ({ ...stock, error: '報價更新失敗，先前報價可能已過期' })));
    } finally {
      if (quoteRequest.current === controller) {
        quoteRequest.current = null;
        setIsFetching(false);
      }
    }
  }, [symbols, ready]);

  // Initial fetch and polling
  useEffect(() => {
    if (activeTab === 'tracking') {
      fetchPrices();
      const interval = setInterval(fetchPrices, 30000); // Poll every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchPrices, activeTab]);

  useEffect(() => () => {
    quoteRequest.current?.abort();
    quoteRequest.current = null;
  }, [symbols, activeTab]);

  const scanMarket = async () => {
    if (scanRequest.current) return;
    const controller = new AbortController();
    scanRequest.current = controller;
    setIsScanning(true);
    setError('');
    try {
      const response = await fetch(`/api/tw-stock-target/discover?mode=${scanMode}`, { signal: controller.signal });
      if (!response.ok) {
        let errorMsg = '掃描失敗';
        try {
          const errorData = await response.json();
          errorMsg = errorData.error || errorMsg;
        } catch (e) {
          errorMsg = `伺服器錯誤 (${response.status})`;
        }
        throw new Error(errorMsg);
      }
      const data: DiscoveryResult = await response.json();
      setDiscoveredStocks(data.stocks);
      setTradingDates(data.tradingDates);
      setHasScanned(true);
    } catch (error) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '掃描市場時發生錯誤');
    } finally {
      scanRequest.current = null;
      setIsScanning(false);
    }
  };

  const addStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim()) return;

    const symbol = newSymbol.trim().toUpperCase();
    if (!/^\d{4,6}[A-Z]?(?:\.TW|\.TWO)?$/.test(symbol)) {
      setError('請輸入有效台股代號，例如 2330、2330.TW 或 6488.TWO。');
      return;
    }
    if (stocks.length >= 50) { setError('最多可追蹤 50 檔股票。'); return; }
    if (stocks.some(s => s.symbol === symbol)) {
      setError('此股票已在追蹤清單中');
      return;
    }

    setError('');
    setStocks(previous => [...previous, { symbol, name: symbol, targets: [] }]);
    setNewSymbol('');
  };

  const addDiscoveredStock = (discovered: DiscoveredStock) => {
    if (stocks.some(s => s.symbol === discovered.symbol)) {
      setError('此股票已在追蹤清單中');
      return;
    }
    if (stocks.length >= 50) { setError('最多可追蹤 50 檔股票。'); return; }

    const newStock: Stock = {
      symbol: discovered.symbol,
      name: discovered.name,
      currentPrice: discovered.price,
      targets: [
        {
          id: crypto.randomUUID(),
          price: parseFloat(discovered.targetPrice.toFixed(2)),
          label: '法人目標價'
        }
      ]
    };

    setStocks(previous => [...previous, newStock]);
    setError('');
    setActiveTab('tracking');
  };

  const removeStock = (symbol: string) => {
    setStocks(previous => previous.filter(s => s.symbol !== symbol));
  };

  const addTarget = (symbol: string, price: number, label: string) => {
    setStocks(previous => previous.map(s => {
      if (s.symbol === symbol) {
        return {
          ...s,
          targets: [...s.targets, { id: crypto.randomUUID(), price, label }]
        };
      }
      return s;
    }));
  };

  const removeTarget = (symbol: string, targetId: string) => {
    setStocks(previous => previous.map(s => {
      if (s.symbol === symbol) {
        return {
          ...s,
          targets: s.targets.filter(t => t.id !== targetId)
        };
      }
      return s;
    }));
  };

  return (
    <div className="min-h-screen bg-[#050505] text-gray-200 p-4 md:p-8 font-sans selection:bg-indigo-500/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#111] p-6 rounded-2xl border border-[#222] shadow-2xl shadow-black/50">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-indigo-500/10 rounded-lg">
                <Crosshair className="text-indigo-400 w-6 h-6" />
              </div>
              台股目標價追蹤器
            </h1>
            <p className="text-gray-400 text-sm mt-2 flex items-center gap-2">
              每 30 秒更新報價，計算與目標價的距離。
              {activeTab === 'tracking' && lastFetchTime && (
                <span className="text-gray-500 font-mono text-xs px-2 py-0.5 bg-[#1a1a1a] rounded border border-[#333]">
                  UPDATED: {lastFetchTime.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          {activeTab === 'tracking' && (
            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={fetchPrices}
                disabled={isFetching || !ready || stocks.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#252525] text-gray-300 border border-[#333] rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
              >
                <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
                {isFetching ? '同步中...' : '同步報價'}
              </button>

              <form onSubmit={addStock} className="flex gap-2">
                <input
                  type="text"
                  value={newSymbol}
                  onChange={(e) => setNewSymbol(e.target.value)}
                  placeholder="輸入代號 (如 2330)"
                  aria-label="股票代號"
                  disabled={!ready}
                  className="px-4 py-2 bg-[#1a1a1a] border border-[#333] text-white rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-40 font-mono text-sm placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  disabled={!ready}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors flex items-center gap-1 text-sm font-medium shadow-lg shadow-indigo-500/20"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              </form>
            </div>
          )}
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-300 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <p className="text-xs text-gray-500">
          報價與法人目標價來自 Yahoo Finance，可能延遲；法人目標價為分析師預測中位數，部分標的無資料。
          目標價僅供研究參考，不代表保證報酬。追蹤設定保存在此瀏覽器。
        </p>

        {/* Tabs */}
        <div className="flex space-x-2 bg-[#111] p-1.5 rounded-xl border border-[#222] w-fit">
          <button
            onClick={() => setActiveTab('tracking')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'tracking'
                ? "bg-[#222] text-white shadow-sm border border-[#333]"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] border border-transparent"
            )}
          >
            <List className="w-4 h-4" />
            我的追蹤清單
          </button>
          <button
            onClick={() => setActiveTab('discover')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'discover'
                ? "bg-[#222] text-white shadow-sm border border-[#333]"
                : "text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a] border border-transparent"
            )}
          >
            <Search className="w-4 h-4" />
            潛力股掃描
          </button>
        </div>

        {/* Content */}
        {activeTab === 'tracking' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {stocks.map(stock => (
              <StockCard
                key={stock.symbol}
                stock={stock}
                onRemove={() => removeStock(stock.symbol)}
                onAddTarget={(price, label) => addTarget(stock.symbol, price, label)}
                onRemoveTarget={(targetId) => removeTarget(stock.symbol, targetId)}
              />
            ))}

              {stocks.length === 0 && (
              <div className="col-span-full py-20 text-center text-gray-500 bg-[#111] rounded-2xl border border-dashed border-[#333]">
                <div className="flex flex-col items-center gap-3">
                  <List className="w-10 h-10 text-gray-600" />
                  <p>{ready ? '請新增股票以開始追蹤' : '載入追蹤資料中...'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-[#111] rounded-2xl border border-[#222] overflow-hidden shadow-2xl shadow-black/50">
            <div className="p-6 border-b border-[#222] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414]">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="text-emerald-400" />
                  市場潛力股掃描
                </h2>
                <p className="text-gray-400 text-sm mt-1">
                  {scanMode === 'short' && '掃描上市股票，找出「最近交易日外資買超大於 1,000 張」且距離「法人目標價」最遠的股票。'}
                  {scanMode === 'swing' && '掃描台股，找出「近 5 日外資累計買超大於 3,000 張」且距離「法人目標價」最遠的股票。'}
                  {scanMode === 'strong' && '掃描上市股票，找出同時符合近 5 日趨勢與最近交易日買超條件的股票，依潛在漲幅排序。'}
                </p>
                {tradingDates.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    資料期間：{tradingDates[tradingDates.length - 1]}–{tradingDates[0]}（5 個交易日）
                  </p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <select
                  value={scanMode}
                  aria-label="掃描模式"
                  disabled={isScanning}
                  onChange={(e) => {
                    setScanMode(e.target.value as ScanMode);
                    setDiscoveredStocks([]);
                    setTradingDates([]);
                    setHasScanned(false);
                  }}
                  className="bg-[#1a1a1a] border border-[#333] text-gray-300 text-sm rounded-xl focus:ring-emerald-500 focus:border-emerald-500 block p-2.5 outline-none w-full sm:w-auto"
                >
                  <option value="short">短線確認 (最近交易日買超 &gt; 1千張)</option>
                  <option value="swing">波段趨勢 (近5日買超 &gt; 3千張)</option>
                  <option value="strong">最強趨勢 (同時符合上述兩者)</option>
                </select>
                <button
                  onClick={scanMarket}
                  disabled={isScanning}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 rounded-xl transition-all disabled:opacity-50 font-medium text-sm shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                >
                  <Search className={cn("w-4 h-4", isScanning && "animate-pulse")} />
                  {isScanning ? '掃描中...' : '開始掃描'}
                </button>
              </div>
            </div>

            <div className="p-0">
              {discoveredStocks.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#0a0a0a] border-b border-[#222] text-gray-400 text-xs uppercase tracking-wider font-mono">
                        <th className="p-4 font-medium">排名 / 標的</th>
                        <th className="p-4 font-medium text-right">目前股價</th>
                        <th className="p-4 font-medium text-right group/th relative cursor-help">
                          法人目標價
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/th:block w-48 p-2 bg-gray-800 text-gray-200 text-xs rounded shadow-xl border border-gray-700 z-10 normal-case tracking-normal">
                            資料來源為 Yahoo Finance 彙整之各大外資券商與研究機構預測的「目標價中位數」。
                          </div>
                        </th>
                        <th className="p-4 font-medium text-right">外資買超(最近交易日)</th>
                        <th className="p-4 font-medium text-right">外資買超(5日)</th>
                        <th className="p-4 font-medium text-right">潛在漲幅</th>
                        <th className="p-4 font-medium text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#222]">
                      {discoveredStocks.map((stock, idx) => (
                        <tr key={stock.symbol} className="hover:bg-[#1a1a1a] transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center justify-center w-7 h-7 rounded bg-[#222] text-xs font-mono text-gray-400 group-hover:text-white group-hover:bg-[#333] transition-colors">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-bold text-gray-200">{stock.name}</div>
                                <div className="text-xs font-mono text-gray-500">{stock.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-gray-300">
                            {stock.price.toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-indigo-400">
                            {stock.targetPrice.toFixed(2)}
                          </td>
                          <td className={`p-4 text-right font-mono ${!stock.foreignNetBuy1Day ? 'text-gray-500' : stock.foreignNetBuy1Day > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                            {stock.foreignNetBuy1Day ? (stock.foreignNetBuy1Day / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' 張' : '-'}
                          </td>
                          <td className={`p-4 text-right font-mono font-bold ${!stock.foreignNetBuy5Day ? 'text-gray-500' : stock.foreignNetBuy5Day > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                            {stock.foreignNetBuy5Day ? (stock.foreignNetBuy5Day / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' 張' : '-'}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-mono font-medium border ${stock.upside > 0 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                              {stock.upside > 0 ? <TrendingUp className="w-3 h-3 mr-1.5" /> : <TrendingDown className="w-3 h-3 mr-1.5" />}
                              {stock.upside > 0 ? '+' : ''}{stock.upside.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => addDiscoveredStock(stock)}
                              disabled={stocks.some(item => item.symbol === stock.symbol)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#222] border border-[#333] hover:border-indigo-500/50 hover:bg-indigo-500/10 text-gray-300 hover:text-indigo-300 text-xs font-medium rounded transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                              {stocks.some(item => item.symbol === stock.symbol) ? '已追蹤' : '追蹤'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-32 text-center text-gray-500 flex flex-col items-center bg-[#0a0a0a]">
                  <div className="p-4 bg-[#111] rounded-full border border-[#222] mb-4">
                    <Activity className="w-8 h-8 text-gray-600" />
                  </div>
                  <p className="font-medium">{isScanning ? '正在讀取交易資料與目標價...' : hasScanned ? '目前沒有符合條件且具法人目標價的股票' : '點擊「開始掃描」尋找潛力股'}</p>
                  <p className="text-sm mt-1 text-gray-600">掃描範圍為證交所上市股票，首次掃描可能需要數分鐘</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaiwanStockTargetPage() {
  return (
    <Suspense fallback={<div className="p-8 text-surface-400">載入台股目標價追蹤器...</div>}>
      <TaiwanStockTargetTool />
    </Suspense>
  );
}

interface StockCardProps {
  key?: React.Key;
  stock: Stock;
  onRemove: () => void;
  onAddTarget: (price: number, label: string) => void;
  onRemoveTarget: (id: string) => void;
}

function StockCard({
  stock,
  onRemove,
  onAddTarget,
  onRemoveTarget
}: StockCardProps) {
  const [newTargetPrice, setNewTargetPrice] = useState('');
  const [newTargetLabel, setNewTargetLabel] = useState('');
  const [isAddingTarget, setIsAddingTarget] = useState(false);

  const handleAddTarget = (e: React.FormEvent) => {
    e.preventDefault();
    const price = parseFloat(newTargetPrice);
    if (!Number.isFinite(price) || price <= 0) return;

    onAddTarget(price, newTargetLabel || '目標價');
    setNewTargetPrice('');
    setNewTargetLabel('');
    setIsAddingTarget(false);
  };

  // Taiwan stock market convention: Red is UP, Green is DOWN
  const isUp = stock.change && stock.change > 0;
  const isDown = stock.change && stock.change < 0;
  const priceColor = isUp ? 'text-rose-500' : isDown ? 'text-emerald-400' : 'text-gray-300';
  const bgColor = isUp ? 'bg-rose-500/10 border-rose-500/20' : isDown ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-[#222] border-[#333]';

  // Sort targets by distance (furthest first)
  const sortedTargets = [...stock.targets].sort((a, b) => {
    if (!stock.currentPrice) return 0;
    const distA = Math.abs((a.price - stock.currentPrice) / stock.currentPrice);
    const distB = Math.abs((b.price - stock.currentPrice) / stock.currentPrice);
    return distB - distA; // Descending
  });

  return (
    <div className="bg-[#111] rounded-2xl border border-[#222] overflow-hidden flex flex-col shadow-xl shadow-black/40 group hover:border-[#333] transition-colors">
      {/* Card Header */}
      <div className="p-5 border-b border-[#222] flex flex-col gap-3 bg-[#141414]">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words text-lg font-bold text-gray-100">{stock.name}</h2>
            <span className="shrink-0 text-xs font-mono text-gray-400 bg-[#222] border border-[#333] px-2 py-0.5 rounded">{stock.symbol}</span>
          </div>

          {stock.error ? (
            <div className="flex items-center gap-1.5 text-amber-500 text-sm mt-3 font-medium">
              <AlertCircle className="w-4 h-4" />
              {stock.error}
            </div>
          ) : (
            <div className="mt-3 flex items-baseline gap-3">
              <span className={cn("text-3xl font-mono font-bold tracking-tight", priceColor)}>
                {stock.currentPrice ? stock.currentPrice.toFixed(2) : '--'}
              </span>
              {stock.changePercent !== undefined && (
                <span className={cn("text-xs font-mono font-medium flex items-center px-2 py-0.5 rounded border", priceColor, bgColor)}>
                  {isUp ? <TrendingUp className="w-3 h-3 mr-1" /> : isDown ? <TrendingDown className="w-3 h-3 mr-1" /> : null}
                  {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-1">
          <WatchlistButton symbol={stock.symbol} name={stock.name} type="stock" source="tw-stock-target" />
          <button
            onClick={onRemove}
            className="text-gray-600 hover:text-rose-500 transition-colors p-1.5 rounded hover:bg-rose-500/10"
            title="移除股票"
            aria-label={`移除 ${stock.symbol}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Targets List */}
      <div className="p-5 flex-1 bg-[#0a0a0a]">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-mono font-semibold text-gray-500 uppercase tracking-wider">目標價設定</h3>
          {!isAddingTarget && (
            <button
              onClick={() => setIsAddingTarget(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 transition-colors"
            >
              <Plus className="w-3 h-3" /> 新增
            </button>
          )}
        </div>

        {isAddingTarget && (
          <form onSubmit={handleAddTarget} className="mb-4 flex flex-col gap-3 bg-[#141414] p-4 rounded-xl border border-[#333]">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase mb-1 block">目標價</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-label="目標價"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  placeholder="例如: 1200"
                  className="w-full px-3 py-2 text-sm bg-[#0a0a0a] border border-[#333] text-white rounded focus:outline-none focus:border-indigo-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 uppercase mb-1 block">標籤 (選填)</label>
                <input
                  type="text"
                  aria-label="目標價標籤"
                  value={newTargetLabel}
                  onChange={(e) => setNewTargetLabel(e.target.value)}
                  placeholder="例如: 一年目標"
                  className="w-full px-3 py-2 text-sm bg-[#0a0a0a] border border-[#333] text-white rounded focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded hover:bg-indigo-500 transition-colors">
                儲存
              </button>
              <button type="button" onClick={() => setIsAddingTarget(false)} className="flex-1 py-2 bg-[#222] text-gray-300 text-xs font-bold rounded hover:bg-[#333] border border-[#333] transition-colors">
                取消
              </button>
            </div>
          </form>
        )}

        {sortedTargets.length > 0 ? (
          <div className="space-y-2.5">
            {sortedTargets.map(target => {
              const distance = stock.currentPrice
                ? ((target.price - stock.currentPrice) / stock.currentPrice) * 100
                : 0;

              const isFar = Math.abs(distance) > 10;
              const isAbove = distance > 0; // Target is higher than current price

              return (
                <div
                  key={target.id}
                  className={cn(
                    "flex items-center justify-between p-3.5 rounded-xl border transition-all",
                    isFar
                      ? (isAbove ? "bg-rose-500/5 border-rose-500/20" : "bg-emerald-500/5 border-emerald-500/20")
                      : "bg-[#141414] border-[#222]"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-gray-200 text-lg">{target.price}</span>
                      <span className="text-xs font-medium text-gray-500">{target.label}</span>
                    </div>
                    {stock.currentPrice && (
                      <div className={cn(
                        "text-xs mt-1.5 font-mono font-medium flex items-center gap-2",
                        isFar ? (isAbove ? "text-rose-400" : "text-emerald-400") : "text-gray-400"
                      )}>
                        距離: {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                        {isFar && <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest border",
                          isAbove ? "bg-rose-500/10 border-rose-500/20" : "bg-emerald-500/10 border-emerald-500/20"
                        )}>較遠</span>}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveTarget(target.id)}
                    aria-label={`移除目標價 ${target.price}`}
                    className="text-gray-600 hover:text-rose-500 p-2 rounded hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-gray-600 font-mono border border-dashed border-[#333] rounded-xl">
            尚未設定目標價
          </div>
        )}
      </div>
    </div>
  );
}
