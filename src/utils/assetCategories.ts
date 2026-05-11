export type AssetCategory = "ETF" | "Crypto" | "Stock";

const ETF_TICKERS = new Set([
  "VOO","VTI","SPY","QQQ","IVV","VEA","VWO","BND","AGG","GLD","SLV",
  "ARKK","SCHB","ITOT","SPDW","VXUS","VNQ","XLF","XLK","XLE","XLV",
  "XLU","XLI","XLY","XLP","XLB","XLC","VUG","VTV","QQQM","JEPI",
  "SCHD","SCHA","SCHF","SCHG","SCHV","SCHP","SCHZ","SCHE","SCHI",
  "FXAIX","FZROX","FZILX","FSKAX","FXNAX","FSMAX","FSPSX","FPADX",
  "VFIAX","VTSAX","VTIAX","VBTLX","VBILX","VIGAX","VVIAX","VSIAX",
  "DIA","MDY","IJH","IWM","EFA","EEM","LQD","TLT","TIP","HYG",
  "IEMG","ACWI","MTUM","QUAL","USMV","VLUE","SIZE","SPLG","CSPX",
  "IWDA","VWRA","VWRL","EIMI","CNDX","ISF","VERX","IUSA",
]);

const CRYPTO_TICKERS = new Set([
  "BTC","ETH","SOL","ADA","DOT","AVAX","MATIC","LINK","UNI","DOGE",
  "XRP","LTC","BCH","ATOM","NEAR","FTM","ALGO","XLM","VET","SAND",
  "MANA","AAVE","COMP","MKR","SNX","YFI","CRV","SUSHI","1INCH",
  "FIL","AR","STORJ","GRT","OCEAN","INJ","APT","SUI","ARB","OP",
  "PEPE","SHIB","BONK","WIF","FLOKI","DEGEN",
]);

export function getAssetCategory(ticker: string): AssetCategory {
  const t = ticker.toUpperCase().trim();
  if (CRYPTO_TICKERS.has(t)) return "Crypto";
  if (ETF_TICKERS.has(t)) return "ETF";
  return "Stock";
}

export const CATEGORY_COLORS: Record<AssetCategory, string> = {
  ETF: "#4B8EFF",
  Crypto: "#C084FC",
  Stock: "#F0A500",
};
