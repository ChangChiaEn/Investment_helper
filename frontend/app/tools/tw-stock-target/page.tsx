'use client';

import React, { Suspense, useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Trash2, RefreshCw, AlertCircle, TrendingUp, TrendingDown, Search, List, Activity, Crosshair } from 'lucide-react';
import { useToolCache } from '@/hooks/useToolCache';
import { WatchlistButton } from '@/components/WatchlistButton';
import { useTheme } from '@/contexts/ThemeContext';
import { getToolDisplayLabels } from '@/config/disguise';
import type { TrackedStock as Stock, DiscoveredStock, DiscoveryResult, ScanMode, StockQuote } from '@/lib/tools/tw-stock-target/types';
import { loadTrackedStocks } from '@/lib/tools/tw-stock-target/storage';

function cn(...inputs: (string | false | undefined)[]) {
  return inputs.filter(Boolean).join(' ');
}

const STORAGE_KEY = 'sagafisc_tw_stock_targets';

function TaiwanStockTargetTool() {
  const { disguise } = useTheme();
  const pageLabels = getToolDisplayLabels(
    'tw-stock-target',
    '台股目標價追蹤器',
    '每 30 秒更新報價，計算與目標價的距離。',
    disguise,
  );
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
    <div className="min-h-screen p-4 md:p-8 selection:bg-primary/30">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-lg">
          <div>
            <h1 className="text-2xl font-bold text-fg flex items-center gap-3 tracking-tight">
              <div className="p-2 bg-primary-soft rounded-lg">
                <Crosshair className="text-primary w-6 h-6" />
              </div>
              {pageLabels.name}
            </h1>
            <p className="text-muted-fg text-sm mt-2 flex items-center gap-2">
              {disguise
                ? '定期同步資料，計算與里程碑的差距。'
                : pageLabels.description}
              {activeTab === 'tracking' && lastFetchTime && (
                <span className="text-muted-fg font-mono text-xs px-2 py-0.5 bg-muted rounded border border-border">
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
                className="flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted text-card-fg border border-border rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
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
                  className="px-4 py-2 bg-muted border border-border text-fg rounded-lg focus:outline-none focus:border-primary focus:ring-1 focus:ring-ring w-40 font-sans text-sm placeholder:text-muted-fg"
                />
                <button
                  type="submit"
                  disabled={!ready}
                  className="px-4 py-2 bg-primary hover:opacity-90 text-primary-fg rounded-lg transition-colors flex items-center gap-1 text-sm font-medium shadow-md"
                >
                  <Plus className="w-4 h-4" />
                  新增
                </button>
              </form>
            </div>
          )}
        </header>

        {error && (
          <div role="alert" className="flex items-start gap-2 p-4 rounded-xl border border-warning/40 bg-warning-soft text-warning text-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        <p className="text-xs text-muted-fg">
          報價與法人目標價來自 Yahoo Finance，可能延遲；法人目標價為分析師預測中位數，部分標的無資料。
          目標價僅供研究參考，不代表保證報酬。追蹤設定保存在此瀏覽器。
        </p>

        {/* Tabs */}
        <div className="flex space-x-2 bg-card p-1.5 rounded-xl border border-border w-fit">
          <button
            onClick={() => setActiveTab('tracking')}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === 'tracking'
                ? "bg-muted text-fg shadow-sm border border-border"
                : "text-muted-fg hover:text-fg hover:bg-muted border border-transparent"
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
                ? "bg-muted text-fg shadow-sm border border-border"
                : "text-muted-fg hover:text-fg hover:bg-muted border border-transparent"
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
              <div className="col-span-full py-20 text-center text-muted-fg bg-card rounded-2xl border border-dashed border-border">
                <div className="flex flex-col items-center gap-3">
                  <List className="w-10 h-10 text-muted-fg" />
                  <p>{ready ? '請新增股票以開始追蹤' : '載入追蹤資料中...'}</p>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-lg">
            <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-muted">
              <div>
                <h2 className="text-xl font-bold text-fg flex items-center gap-2">
                  <Activity className="text-success" />
                  市場潛力股掃描
                </h2>
                <p className="text-muted-fg text-sm mt-1">
                  {scanMode === 'short' && '掃描上市股票，找出「最近交易日外資買超大於 1,000 張」且距離「法人目標價」最遠的股票。'}
                  {scanMode === 'swing' && '掃描台股，找出「近 5 日外資累計買超大於 3,000 張」且距離「法人目標價」最遠的股票。'}
                  {scanMode === 'strong' && '掃描上市股票，找出同時符合近 5 日趨勢與最近交易日買超條件的股票，依潛在漲幅排序。'}
                </p>
                {tradingDates.length > 0 && (
                  <p className="text-xs text-muted-fg mt-2">
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
                  className="bg-muted border border-border text-card-fg text-sm rounded-xl focus:ring-ring focus:border-success block p-2.5 outline-none w-full sm:w-auto"
                >
                  <option value="short">短線確認 (最近交易日買超 &gt; 1千張)</option>
                  <option value="swing">波段趨勢 (近5日買超 &gt; 3千張)</option>
                  <option value="strong">最強趨勢 (同時符合上述兩者)</option>
                </select>
                <button
                  onClick={scanMarket}
                  disabled={isScanning}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-success-soft hover:bg-success-soft text-success border border-success/40 rounded-xl transition-all disabled:opacity-50 font-medium text-sm "
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
                      <tr className="bg-bg border-b border-border text-muted-fg text-xs uppercase tracking-wider font-mono">
                        <th className="p-4 font-medium">排名 / 標的</th>
                        <th className="p-4 font-medium text-right">目前股價</th>
                        <th className="p-4 font-medium text-right group/th relative cursor-help">
                          法人目標價
                          <div className="absolute bottom-full right-0 mb-2 hidden group-hover/th:block w-48 p-2 bg-card text-fg text-xs rounded shadow-xl border border-border z-10 normal-case tracking-normal">
                            資料來源為 Yahoo Finance 彙整之各大外資券商與研究機構預測的「目標價中位數」。
                          </div>
                        </th>
                        <th className="p-4 font-medium text-right">外資買超(最近交易日)</th>
                        <th className="p-4 font-medium text-right">外資買超(5日)</th>
                        <th className="p-4 font-medium text-right">潛在漲幅</th>
                        <th className="p-4 font-medium text-center">操作</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {discoveredStocks.map((stock, idx) => (
                        <tr key={stock.symbol} className="hover:bg-muted transition-colors group">
                          <td className="p-4">
                            <div className="flex items-center gap-4">
                              <span className="flex items-center justify-center w-7 h-7 rounded bg-muted text-xs font-mono text-muted-fg group-hover:text-fg group-hover:bg-border transition-colors">
                                {idx + 1}
                              </span>
                              <div>
                                <div className="font-bold text-fg">{stock.name}</div>
                                <div className="text-xs font-mono text-muted-fg">{stock.symbol}</div>
                              </div>
                            </div>
                          </td>
                          <td className="p-4 text-right font-mono text-card-fg">
                            {stock.price.toFixed(2)}
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-primary">
                            {stock.targetPrice.toFixed(2)}
                          </td>
                          <td className={`p-4 text-right font-mono ${!stock.foreignNetBuy1Day ? 'text-muted-fg' : stock.foreignNetBuy1Day > 0 ? 'text-danger' : 'text-success'}`}>
                            {stock.foreignNetBuy1Day ? (stock.foreignNetBuy1Day / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' 張' : '-'}
                          </td>
                          <td className={`p-4 text-right font-mono font-bold ${!stock.foreignNetBuy5Day ? 'text-muted-fg' : stock.foreignNetBuy5Day > 0 ? 'text-danger' : 'text-success'}`}>
                            {stock.foreignNetBuy5Day ? (stock.foreignNetBuy5Day / 1000).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' 張' : '-'}
                          </td>
                          <td className="p-4 text-right">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded text-sm font-mono font-medium border ${stock.upside > 0 ? 'bg-danger-soft text-danger border-danger/30' : 'bg-success-soft text-success border-success/30'}`}>
                              {stock.upside > 0 ? <TrendingUp className="w-3 h-3 mr-1.5" /> : <TrendingDown className="w-3 h-3 mr-1.5" />}
                              {stock.upside > 0 ? '+' : ''}{stock.upside.toFixed(2)}%
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            <button
                              onClick={() => addDiscoveredStock(stock)}
                              disabled={stocks.some(item => item.symbol === stock.symbol)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-muted border border-border hover:border-primary/50 hover:bg-primary-soft text-card-fg hover:text-primary text-xs font-medium rounded transition-colors"
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
                <div className="py-32 text-center text-muted-fg flex flex-col items-center bg-bg">
                  <div className="p-4 bg-card rounded-full border border-border mb-4">
                    <Activity className="w-8 h-8 text-muted-fg" />
                  </div>
                  <p className="font-medium">{isScanning ? '正在讀取交易資料與目標價...' : hasScanned ? '目前沒有符合條件且具法人目標價的股票' : '點擊「開始掃描」尋找潛力股'}</p>
                  <p className="text-sm mt-1 text-muted-fg">掃描範圍為證交所上市股票，首次掃描可能需要數分鐘</p>
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
    <Suspense fallback={<div className="p-8 text-muted-fg">載入台股目標價追蹤器...</div>}>
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
  const priceColor = isUp ? 'text-danger' : isDown ? 'text-success' : 'text-card-fg';
  const bgColor = isUp ? 'bg-danger-soft border-danger/30' : isDown ? 'bg-success-soft border-success/30' : 'bg-muted border-border';

  // Sort targets by distance (furthest first)
  const sortedTargets = [...stock.targets].sort((a, b) => {
    if (!stock.currentPrice) return 0;
    const distA = Math.abs((a.price - stock.currentPrice) / stock.currentPrice);
    const distB = Math.abs((b.price - stock.currentPrice) / stock.currentPrice);
    return distB - distA; // Descending
  });

  return (
    <div className="bg-card rounded-2xl border border-border overflow-hidden flex flex-col shadow-md group hover:border-border transition-colors">
      {/* Card Header */}
      <div className="p-5 border-b border-border flex flex-col gap-3 bg-muted">
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 break-words text-lg font-bold text-fg">{stock.name}</h2>
            <span className="shrink-0 text-xs font-mono text-muted-fg bg-muted border border-border px-2 py-0.5 rounded">{stock.symbol}</span>
          </div>

          {stock.error ? (
            <div className="flex items-center gap-1.5 text-warning text-sm mt-3 font-medium">
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
            className="text-muted-fg hover:text-danger transition-colors p-1.5 rounded hover:bg-danger-soft"
            title="移除股票"
            aria-label={`移除 ${stock.symbol}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Targets List */}
      <div className="p-5 flex-1 bg-bg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xs font-mono font-semibold text-muted-fg uppercase tracking-wider">目標價設定</h3>
          {!isAddingTarget && (
            <button
              onClick={() => setIsAddingTarget(true)}
              className="text-xs text-primary hover:text-primary font-medium flex items-center gap-1 bg-primary-soft px-2 py-1 rounded border border-primary/30 transition-colors"
            >
              <Plus className="w-3 h-3" /> 新增
            </button>
          )}
        </div>

        {isAddingTarget && (
          <form onSubmit={handleAddTarget} className="mb-4 flex flex-col gap-3 bg-muted p-4 rounded-xl border border-border">
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-mono text-muted-fg uppercase mb-1 block">目標價</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  aria-label="目標價"
                  value={newTargetPrice}
                  onChange={(e) => setNewTargetPrice(e.target.value)}
                  placeholder="例如: 1200"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border text-fg rounded focus:outline-none focus:border-primary font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-muted-fg uppercase mb-1 block">標籤 (選填)</label>
                <input
                  type="text"
                  aria-label="目標價標籤"
                  value={newTargetLabel}
                  onChange={(e) => setNewTargetLabel(e.target.value)}
                  placeholder="例如: 一年目標"
                  className="w-full px-3 py-2 text-sm bg-bg border border-border text-fg rounded focus:outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-1">
              <button type="submit" className="flex-1 py-2 bg-primary text-primary-fg text-xs font-bold rounded hover:opacity-90 transition-colors">
                儲存
              </button>
              <button type="button" onClick={() => setIsAddingTarget(false)} className="flex-1 py-2 bg-muted text-card-fg text-xs font-bold rounded hover:bg-border border border-border transition-colors">
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
                      ? (isAbove ? "bg-danger-soft border-danger/30" : "bg-success-soft border-success/30")
                      : "bg-muted border-border"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-fg text-lg">{target.price}</span>
                      <span className="text-xs font-medium text-muted-fg">{target.label}</span>
                    </div>
                    {stock.currentPrice && (
                      <div className={cn(
                        "text-xs mt-1.5 font-mono font-medium flex items-center gap-2",
                        isFar ? (isAbove ? "text-danger" : "text-success") : "text-muted-fg"
                      )}>
                        距離: {distance > 0 ? '+' : ''}{distance.toFixed(2)}%
                        {isFar && <span className={cn(
                          "px-1.5 py-0.5 rounded text-[9px] uppercase tracking-widest border",
                          isAbove ? "bg-danger-soft border-danger/30" : "bg-success-soft border-success/30"
                        )}>較遠</span>}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => onRemoveTarget(target.id)}
                    aria-label={`移除目標價 ${target.price}`}
                    className="text-muted-fg hover:text-danger p-2 rounded hover:bg-danger-soft transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 text-sm text-muted-fg font-mono border border-dashed border-border rounded-xl">
            尚未設定目標價
          </div>
        )}
      </div>
    </div>
  );
}
