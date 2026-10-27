/**
 * 決策樹「自動化」動作目錄：執行時寫回庫存等副作用，非條件指標。
 * 於編輯樹以「+ 自動化」節點加入（單進單出），不出現在條件指標選單。
 */

/** 自動化動作定義 */
export interface ActionDef {
  id: string
  name: string
  description: string
}

/** 內建自動化動作 */
export const ACTION_CATALOG: ActionDef[] = [
  {
    id: 'auto_update_swing_high',
    name: '更新波段高點',
    description:
      '比對官方收盤價與庫存持股波段最高價；若現價更高則寫回。不參與通過／未通過判斷，執行後往下一節點。',
  },
]

/**
 * 依 id 查自動化動作。
 * @param id - 動作 id
 * @returns 定義或 undefined
 */
export function getActionDef(id: string): ActionDef | undefined {
  return ACTION_CATALOG.find((a) => a.id === id)
}

/**
 * 動作顯示名稱（找不到則回傳 id）。
 * @param id - 動作 id
 * @returns 中文名稱
 */
export function getActionLabel(id: string): string {
  return getActionDef(id)?.name || id
}
