
import { GICS_Sector, SectorDetail, CapexData } from './types';

const generateCapex = (startValue: number, trend: 'up' | 'down' | 'volatile'): CapexData[] => {
  const data: CapexData[] = [];
  let currentVal = startValue;
  let currentInt = 5 + Math.random() * 10;

  for (let i = 0; i < 10; i++) {
    const year = 2017 + i;
    const change = trend === 'up' ? Math.random() * 15 : trend === 'down' ? -Math.random() * 10 : (Math.random() - 0.5) * 20;
    currentVal += change;
    currentInt += (Math.random() - 0.5) * 2;

    // Logic: Revenue growth usually follows Capex with a lag or matches trend
    const revGrowth = trend === 'up' ? 10 + Math.random() * 10 : trend === 'down' ? Math.random() * 5 : 5 + (Math.random() - 0.5) * 10;

    data.push({
      year,
      value: Math.max(10, Math.round(currentVal)),
      intensity: Math.max(1, Math.min(35, Number(currentInt.toFixed(2)))),
      valuationZScore: Number(((Math.random() * 4) - 2).toFixed(2)), // Random Z-score between -2 and 2
      revenueGrowth: Number(revGrowth.toFixed(2)),
      sentiment: Math.random() * 2 - 1
    });
  }
  return data;
};

export const SECTOR_DATA: Record<GICS_Sector, SectorDetail> = {
  [GICS_Sector.IT]: {
    id: GICS_Sector.IT,
    description: '軟硬體、半導體與雲端運算。AI 基礎設施與邊緣運算核心。',
    examples: ['台積電', 'NVIDIA', 'Microsoft'],
    historicalCapex: generateCapex(120, 'up'),
    imfOutlook: '數位轉型已進入第二階段，企業對於 AI 獲利能力的檢驗成為 2026 年核心課題。'
  },
  [GICS_Sector.FINANCIALS]: {
    id: GICS_Sector.FINANCIALS,
    description: '銀行、保險與資產管理。數位銀行與區塊鏈支付結構重組。',
    examples: ['JPMorgan', '富邦金', 'Mastercard'],
    historicalCapex: generateCapex(80, 'up'),
    imfOutlook: '數位貨幣應用普及化，金融機構資本支出轉向後端清算系統之安全性與即時化。'
  },
  [GICS_Sector.HEALTHCARE]: {
    id: GICS_Sector.HEALTHCARE,
    description: '生技、醫療器材。高齡化與遠距醫療技術突破。',
    examples: ['Eli Lilly', 'Novo Nordisk', 'Intuitive Surgical'],
    historicalCapex: generateCapex(100, 'up'),
    imfOutlook: '生物科技與 AI 藥物研發融合，帶動研發密集度顯著提升。'
  },
  [GICS_Sector.CONSUMER_DISCRETIONARY]: {
    id: GICS_Sector.CONSUMER_DISCRETIONARY,
    description: '汽車、電商、奢侈品。受自動駕駛與個性化零售驅動。',
    examples: ['Tesla', 'Amazon', 'LVMH'],
    historicalCapex: generateCapex(90, 'volatile'),
    imfOutlook: '電動車市場進入紅海競爭，領先企業正轉向機器人與能源管理佈局。'
  },
  [GICS_Sector.CONSUMER_STAPLES]: {
    id: GICS_Sector.CONSUMER_STAPLES,
    description: '食品、飲料。綠色供應鏈與低碳包裝轉型。',
    examples: ['Coca-Cola', 'P&G', 'Walmart'],
    historicalCapex: generateCapex(60, 'volatile'),
    imfOutlook: '全球氣候協議對包裝產業施壓，推動企業投入永續供應鏈資本支出。'
  },
  [GICS_Sector.ENERGY]: {
    id: GICS_Sector.ENERGY,
    description: '石油、天然氣與氫能。傳統化石燃料與乾淨能源的混合時期。',
    examples: ['ExxonMobil', 'NextEra Energy', 'Air Liquide'],
    historicalCapex: generateCapex(130, 'volatile'),
    imfOutlook: '氫能基建與碳捕捉技術進入示範規模，能源轉型資本進入密集投放期。'
  },
  [GICS_Sector.UTILITIES]: {
    id: GICS_Sector.UTILITIES,
    description: '電力、電網。智慧電網與分散式能源管理系統。',
    examples: ['National Grid', 'Iberdrola', '台電(模擬)'],
    historicalCapex: generateCapex(110, 'up'),
    imfOutlook: '各國政府對電網現代化的投資承諾將持續支撐未來十年的基礎建設增長。'
  },
  [GICS_Sector.MATERIALS]: {
    id: GICS_Sector.MATERIALS,
    description: '礦業、材料。電池原材料與低碳建築材料。',
    examples: ['Rio Tinto', 'BHP', 'Albemarle'],
    historicalCapex: generateCapex(100, 'volatile'),
    imfOutlook: '關鍵礦產供應鏈安全性成為國家戰略，引發礦業開採技術的數位化投資。'
  },
  [GICS_Sector.INDUSTRIALS]: {
    id: GICS_Sector.INDUSTRIALS,
    description: '自動化、航太。智慧工廠與勞動力補充技術。',
    examples: ['Siemens', 'ABB', 'Schneider Electric'],
    historicalCapex: generateCapex(95, 'up'),
    imfOutlook: '工業 5.0 強調人機協作，企業正加速部署具備感知能力的自動化產線。'
  },
  [GICS_Sector.REAL_ESTATE]: {
    id: GICS_Sector.REAL_ESTATE,
    description: '資料中心、倉儲、冷鏈。數位經濟的實體支撐。',
    examples: ['Equinix', 'Prologis', 'Digital Realty'],
    historicalCapex: generateCapex(140, 'down'),
    imfOutlook: '資料中心需求依然強勁，但由於能效限制，資本支出正面臨技術瓶頸。'
  },
  [GICS_Sector.COMMUNICATION]: {
    id: GICS_Sector.COMMUNICATION,
    description: '衛星通訊、內容生成。6G 研發與沉浸式媒體。',
    examples: ['Alphabet', 'Disney', 'Starlink(模擬)'],
    historicalCapex: generateCapex(85, 'volatile'),
    imfOutlook: '低軌衛星覆蓋率提升帶動新型通訊服務，內容產製正經歷全面的 AI 重構。'
  }
};
