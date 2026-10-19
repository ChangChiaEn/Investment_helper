/**
 * 共用市場資料層匯出（proxy／client／registry）。
 */

export type { MarketSource } from './proxyAllowlist'
export {
  MARKET_PROXY_TIMEOUT_MS,
  MARKET_SOURCE_CONFIG,
  buildUpstreamUrl,
  validateMarketProxyRequest,
} from './proxyAllowlist'
export type { MarketProxyErrorBody, MarketProxySuccessBody } from './proxyHandler'
export { handleMarketProxy } from './proxyHandler'
export type { MarketApiEndpoint } from './apiRegistry'
export {
  DECISION_TREE_API_ENDPOINTS,
  MODULE_DECISION_TREE,
  MODULE_SHARED_MARKET,
  MarketApiRegistry,
  marketApiRegistry,
  requireEndpoint,
} from './apiRegistry'
export type { MarketProxyRequest } from './marketClient'
export { fetchViaMarketProxy, testMarketProxyConnection } from './marketClient'
