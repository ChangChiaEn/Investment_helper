/**
 * 上班摸魚／偽裝模式：變體（Chat／Claude／Gemini 靈感）、中性文案、詞彙表與熱鍵。
 * 與主題色票分離；開啟時會切到對應偽裝主題色。
 */

import type { ThemeId } from '@/config/themes'

/** 偽裝變體；off 表示關閉 */
export type DisguiseVariant = 'off' | 'chat' | 'claude' | 'gemini'

/** localStorage：偽裝變體（相容舊值 '1'／'true' → chat） */
export const DISGUISE_STORAGE_KEY = 'app_disguise'

/** 上次使用的非 off 變體（緊急熱鍵還原用） */
export const DISGUISE_LAST_VARIANT_KEY = 'app_disguise_last'

/** 開啟偽裝前記住的主題，關閉時還原 */
export const DISGUISE_PREV_THEME_KEY = 'app_theme_before_disguise'

/** 緊急熱鍵說明（設定頁顯示） */
export const DISGUISE_HOTKEY_HINT = 'Ctrl + Shift + H'

/**
 * 單一偽裝變體的顯示與主題對應（靈感配色，非官方品牌複製）。
 */
export interface DisguiseVariantDef {
  id: Exclude<DisguiseVariant, 'off'>
  /** 設定頁顯示名稱 */
  name: string
  /** 簡短說明 */
  description: string
  /** 側欄品牌字 */
  brand: string
  /** document.title */
  documentTitle: string
  /** 搭配的 ThemeId */
  themeId: ThemeId
  /** 寫入 html[data-disguise] */
  dataValue: string
}

/** 三套可選偽裝 */
export const DISGUISE_VARIANTS: Record<
  Exclude<DisguiseVariant, 'off'>,
  DisguiseVariantDef
> = {
  chat: {
    id: 'chat',
    name: 'Chat 風',
    description: '深灰側欄＋綠強調，像通用對話助手',
    brand: 'Chat',
    documentTitle: 'Chat',
    themeId: 'chat',
    dataValue: 'chat',
  },
  claude: {
    id: 'claude',
    name: 'Claude 風',
    description: '暖米色畫布＋焦糖強調，像文件助理',
    brand: 'Assistant',
    documentTitle: 'Assistant',
    themeId: 'claude',
    dataValue: 'claude',
  },
  gemini: {
    id: 'gemini',
    name: 'Gemini 風',
    description: '淺底＋藍強調，像多模態工作室',
    brand: 'Studio',
    documentTitle: 'Studio',
    themeId: 'gemini',
    dataValue: 'gemini',
  },
}

/** 設定頁依序渲染 */
export const DISGUISE_VARIANT_LIST: DisguiseVariantDef[] = [
  DISGUISE_VARIANTS.chat,
  DISGUISE_VARIANTS.claude,
  DISGUISE_VARIANTS.gemini,
]

/** 預設開啟時使用的變體 */
export const DEFAULT_DISGUISE_VARIANT: Exclude<DisguiseVariant, 'off'> = 'chat'

/** @deprecated 請改用變體 themeId；保留給舊引用 */
export const DISGUISE_DATA_VALUE = 'chat'

/** @deprecated 請改用 getDisguiseBrand */
export const DISGUISE_BRAND = DISGUISE_VARIANTS.chat.brand

/** @deprecated 請改用 getDisguiseDocumentTitle */
export const DISGUISE_DOCUMENT_TITLE = DISGUISE_VARIANTS.chat.documentTitle

/** 導覽區塊標籤（真實 → 偽裝） */
export const DISGUISE_NAV_LABELS = {
  home: '新對話',
  mainSection: '對話',
  advancedSection: '專案',
  watchlist: '釘選',
  settings: '設定',
  stockType: '專案',
  fundType: '文件',
  analyze: '開啟',
  remove: '移除',
} as const

/**
 * 各工具在偽裝模式下的顯示名稱與描述。
 */
export const DISGUISE_TOOL_LABELS: Record<
  string,
  { name: string; description: string }
> = {
  'trend-dashboard': {
    name: '產業報告草稿',
    description: '整理產業與市場重點',
  },
  'ai-stock-analyst': {
    name: '案例研究助手',
    description: '產出研究摘要與建議',
  },
  'gemini-stock-prophet': {
    name: '趨勢摘要',
    description: '長文重點與走向整理',
  },
  'tw-stock-target': {
    name: '專案里程碑表',
    description: '追蹤里程碑與進度差距',
  },
  'fund-assistant': {
    name: '預算規劃助手',
    description: '進出節點與配置建議',
  },
  'fund-risk-analysis': {
    name: '合規風險檢查',
    description: '風險與新聞面向檢視',
  },
  'asset-analysis': {
    name: '資源配置檢視',
    description: '年度資源分布健診',
  },
  'decision-tree': {
    name: '流程決策 SOP',
    description: '自訂指標與決策流程圖',
  },
  alphastrategist: {
    name: '綜合助理',
    description: '跨主題問答與整理',
  },
  'fund-insight': {
    name: '文獻整理',
    description: '重疊項目與重點摘錄',
  },
}

/**
 * 內文詞彙替換表（長詞在前，避免短詞先替換破壞長詞）。
 * 僅影響 UI 顯示字串，不改 API／storage key。
 */
export const DISGUISE_GLOSSARY: ReadonlyArray<readonly [string, string]> = [
  ['法人目標價', '法人預估里程碑'],
  ['目標價追蹤器', '里程碑追蹤表'],
  ['目標價設定', '里程碑設定'],
  ['目標價標籤', '里程碑標籤'],
  ['目標價', '里程碑'],
  ['潛力股分析師', '案例研究助手'],
  ['潛力股', '潛力案例'],
  ['股票先知', '趨勢摘要'],
  ['股票代號', '項目代號'],
  ['股票或基金', '項目或方案'],
  ['股票名稱', '項目名稱'],
  ['股票', '標的'],
  ['台股市場', '台灣市場'],
  ['美股市場', '美國市場'],
  ['台股', '台灣市場'],
  ['美股', '美國市場'],
  ['外資買超', '外部淨流入'],
  ['外資賣超', '外部淨流出'],
  ['買超', '淨流入'],
  ['賣超', '淨流出'],
  ['外資', '外部資金'],
  ['持股成分', '持有項目成分'],
  ['持股結構', '持有結構'],
  ['持股權重', '持有權重'],
  ['持股重疊', '持有重疊'],
  ['個別持股', '個別持有'],
  ['重疊持股', '重疊持有'],
  ['搜尋持股', '搜尋持有項目'],
  ['持股', '持有項目'],
  ['基金名稱', '方案名稱'],
  ['基金數據', '方案數據'],
  ['基金列表', '方案列表'],
  ['基金分析', '方案分析'],
  ['基金風險', '方案風險'],
  ['支基金', '支方案'],
  ['基金', '方案'],
  ['投資策略師', '配置策略助理'],
  ['投資策略', '配置策略'],
  ['投資適配', '配置適配'],
  ['投資工具', '配置工具'],
  ['投資人', '使用者'],
  ['投資有風險', '決策有風險'],
  ['投資收益', '配置效益'],
  ['投資分析', '配置分析'],
  ['投資趨勢', '配置趨勢'],
  ['智慧投研', '智慧助理'],
  ['投資', '配置'],
  ['進出場', '進出節點'],
  ['下單', '執行操作'],
  ['報價', '最新數值'],
  ['同步報價', '同步資料'],
  ['漲跌幅', '變動幅'],
  ['漲跌', '變動'],
  ['籌碼面', '結構面'],
  ['基本面', '基礎面'],
  ['關注清單', '釘選清單'],
  ['深度分析', '深入檢視'],
  ['決策樹', '流程 SOP'],
]

/**
 * 取得工具在目前模式下的顯示名稱與描述。
 * @param toolId 工具 ID
 * @param realName 真實名稱
 * @param realDescription 真實描述
 * @param disguise 是否開啟偽裝（任一變體）
 */
export function getToolDisplayLabels(
  toolId: string,
  realName: string,
  realDescription: string,
  disguise: boolean,
): { name: string; description: string } {
  if (!disguise) return { name: realName, description: realDescription }
  const fake = DISGUISE_TOOL_LABELS[toolId]
  return fake ?? { name: realName, description: realDescription }
}

/**
 * 依詞彙表替換字串；關閉偽裝時原樣回傳。
 * @param text 原始文案
 * @param disguise 是否開啟偽裝
 */
export function maskText(text: string, disguise: boolean): string {
  if (!disguise || !text) return text
  let out = text
  for (const [from, to] of DISGUISE_GLOSSARY) {
    if (out.includes(from)) {
      out = out.split(from).join(to)
    }
  }
  return out
}

/**
 * 解析 localStorage 為偽裝變體。
 * @param value 原始字串
 */
export function resolveDisguiseVariant(
  value: string | null | undefined,
): DisguiseVariant {
  if (value === '1' || value === 'true') return 'chat'
  if (value === 'chat' || value === 'claude' || value === 'gemini') return value
  return 'off'
}

/**
 * 是否視為開啟偽裝。
 * @param value localStorage 原始值
 */
export function resolveDisguiseEnabled(
  value: string | null | undefined,
): boolean {
  return resolveDisguiseVariant(value) !== 'off'
}

/**
 * 取得變體品牌字；關閉時回傳真實品牌。
 * @param variant 偽裝變體
 */
export function getDisguiseBrand(variant: DisguiseVariant): string {
  if (variant === 'off') return 'Sagafisc'
  return DISGUISE_VARIANTS[variant].brand
}

/**
 * 取得變體分頁標題。
 * @param variant 偽裝變體
 */
export function getDisguiseDocumentTitle(variant: DisguiseVariant): string {
  if (variant === 'off') return 'Sagafisc 智慧投研平台'
  return DISGUISE_VARIANTS[variant].documentTitle
}

/**
 * 取得變體對應 ThemeId；關閉時回傳 null。
 * @param variant 偽裝變體
 */
export function getDisguiseThemeId(variant: DisguiseVariant): ThemeId | null {
  if (variant === 'off') return null
  return DISGUISE_VARIANTS[variant].themeId
}

/**
 * 套用或清除 html[data-disguise]。
 * @param variant 偽裝變體
 * @param el 目標元素
 */
export function applyDisguiseAttribute(
  variant: DisguiseVariant | boolean,
  el: HTMLElement = document.documentElement,
): void {
  // 相容舊呼叫 applyDisguiseAttribute(true/false)
  const resolved: DisguiseVariant =
    typeof variant === 'boolean'
      ? variant
        ? 'chat'
        : 'off'
      : variant

  if (resolved === 'off') {
    el.removeAttribute('data-disguise')
  } else {
    el.setAttribute('data-disguise', DISGUISE_VARIANTS[resolved].dataValue)
  }
}
