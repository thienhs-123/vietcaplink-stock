const fs = require('fs');
const path = require('path');
const vm = require('vm');

console.log('--- TEST SUITE: VIETCAPLINK BUY SCREENER & BASE ENGINE ---');

// 1. Check index.html existence and load
const htmlPath = path.join(__dirname, '..', 'index.html');
const htmlContent = fs.readFileSync(htmlPath, 'utf8');

// Extract scripts to check for syntax errors
const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let scriptIndex = 0;
let mainScriptCode = '';

while ((match = scriptRegex.exec(htmlContent)) !== null) {
  scriptIndex++;
  const scriptContent = match[1];
  if (scriptContent.includes('StockApp')) {
    mainScriptCode = scriptContent;
  }
}

console.log(`[PASS] Found ${scriptIndex} script blocks in index.html.`);

// 2. Mock browser environment to test the application logic
const mockElement = {
  innerText: '',
  innerHTML: '',
  className: '',
  classList: { add: () => {}, remove: () => {} },
  value: '',
  style: {},
  children: [],
  offsetWidth: 100,
  offsetHeight: 50,
  focus: () => {},
  addEventListener: () => {},
  removeEventListener: () => {}
};

const mockDom = {
  document: {
    documentElement: { classList: { contains: () => true } },
    getElementById: () => mockElement,
    querySelectorAll: () => [],
    querySelector: () => mockElement,
    body: { style: {} },
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  window: {
    location: { origin: 'http://localhost:8088', protocol: 'http:' },
    addEventListener: () => {},
    localStorage: { getItem: () => null, setItem: () => {} }
  },
  localStorage: { getItem: () => null, setItem: () => {} },
  lucide: { createIcons: () => {} },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: () => 1,
  clearInterval: () => {},
  Math: Math,
  Number: Number,
  parseFloat: parseFloat,
  parseInt: parseInt,
  isNaN: isNaN,
  Array: Array,
  Object: Object,
  Map: Map,
  Set: Set,
  String: String
};
mockDom.window.document = mockDom.document;

// Execute main script in VM sandbox
try {
  vm.createContext(mockDom);
  vm.runInContext(mainScriptCode, mockDom);
  console.log('[PASS] Script executed in VM sandbox with ZERO syntax errors.');
} catch (e) {
  console.error('[FAIL] Script execution error:', e);
  process.exit(1);
}

const StockApp = mockDom.StockApp;
if (!StockApp || !Array.isArray(StockApp.stocks)) {
  console.error('[FAIL] StockApp.stocks not found or invalid');
  process.exit(1);
}

console.log(`[PASS] StockApp.stocks initialized with ${StockApp.stocks.length} stocks.`);

// 3. Test integrity of stock data
let validPriceCount = 0;
let hasErrorPrice = 0;
StockApp.stocks.forEach(st => {
  if (st.price === "Lỗi" || typeof st.price !== 'number' || isNaN(st.price) || st.price <= 0) {
    hasErrorPrice++;
  } else {
    validPriceCount++;
  }
});
console.log(`[PASS] Valid prices: ${validPriceCount} / ${StockApp.stocks.length}. Error prices: ${hasErrorPrice}.`);
if (hasErrorPrice > 0) {
  console.error('[FAIL] Found stock with error price!');
  process.exit(1);
}

// 4. Test ACB metrics specifically
const acb = StockApp.stocks.find(s => s.symbol === 'ACB');
if (!acb) {
  console.error('[FAIL] ACB not found');
  process.exit(1);
}
console.log(`[INFO] ACB status: Price=${acb.price}, MA10=${acb.ma10} (${acb.diffMA10}%), MA50=${acb.ma50} (${acb.diffMA50}%), Base=${acb.baseMonths}T (${acb.baseSessions}p), Tightness=${acb.baseTightness}%, UpperHalf=${acb.baseUpperHalf}, baseValid=${acb.baseValid}`);

if (acb.baseValid !== false || acb.aboveMA10_50 !== false) {
  console.error('[FAIL] ACB should NOT be valid under strict criteria!');
  process.exit(1);
}
console.log('[PASS] ACB correctly fails strict criteria as expected.');

// 5. Test initial default state (neither criterion active by default)
console.log(`[INFO] Initial buyCriteria: filterMaAndBase=${StockApp.buyCriteria.filterMaAndBase}, filterLowestPeTop10=${StockApp.buyCriteria.filterLowestPeTop10}, mode=${StockApp.buyCriteria.mode}, baseDurationTier=${StockApp.buyCriteria.baseDurationTier}`);

if (StockApp.buyCriteria.filterMaAndBase !== false || StockApp.buyCriteria.filterLowestPeTop10 !== false) {
  console.error('[FAIL] Default buyCriteria should NOT have any criteria selected by default!');
  process.exit(1);
}
console.log('[PASS] Default buyCriteria correctly initialized with NO criteria selected.');

// Run screener filtering logic
const validPeStocks = [...StockApp.stocks].filter(s => s.pe && s.pe > 0).sort((a, b) => a.pe - b.pe);
const top10PeMap = new Map();
validPeStocks.slice(0, 10).forEach((st, idx) => top10PeMap.set(st.symbol, idx + 1));

const filterFunc = (st) => {
  const { filterMaAndBase, filterLowestPeTop10, baseDurationTier } = StockApp.buyCriteria;
  if (filterMaAndBase) {
    const passesMA = (st.aboveMA10_50 === true) || (st.diffMA10 > 0 && st.diffMA50 > 0);
    const durOk = (st.baseSessions >= 60) || ((st.baseMonths || 0) >= 3.0);
    const tightOk = (st.baseTightness !== undefined ? st.baseTightness : 15.0) <= 20.0;
    const upperOk = st.baseUpperHalf !== false;
    const passesBase = (st.baseValid === true) || (durOk && tightOk && upperOk);
    if (!passesMA || !passesBase) return false;

    // Base duration sub-criteria (3 tiers: 3-6m, 6-12m, 12m_plus)
    const tier = baseDurationTier || '3_6m';
    const bMonths = st.baseMonths || 0;
    const bSessions = st.baseSessions || Math.round(bMonths * 21);
    if (tier === '3_6m') {
      const is3_6 = (bMonths >= 3.0 && bMonths < 6.0) || (bSessions >= 60 && bSessions <= 125);
      if (!is3_6) return false;
    } else if (tier === '6_12m') {
      const is6_12 = (bMonths >= 6.0 && bMonths <= 12.0) || (bSessions > 125 && bSessions <= 250);
      if (!is6_12) return false;
    } else if (tier === '12m_plus') {
      const is12plus = (bMonths > 12.0) || (bSessions > 250);
      if (!is12plus) return false;
    }
  }
  if (filterLowestPeTop10) {
    if (!top10PeMap.has(st.symbol)) return false;
  }
  return true;
};

// Initial state test (mode 'all' -> 100 stocks)
const initialStocks = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Initial state returns all ${initialStocks.length} stocks.`);
if (initialStocks.length !== 100) {
  console.error('[FAIL] Expected 100 stocks in initial state');
  process.exit(1);
}

// Mode: MA & Base only - Test 3 duration tiers
mockDom.setBuyPresetMode('ma_base');

// Tier 1: 3 - 6 tháng (Default)
mockDom.setBaseDurationTier('3_6m');
const passedMaBase3_6m = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' [3 - 6 Tháng] returns ${passedMaBase3_6m.length} stocks: ${passedMaBase3_6m.map(s => `${s.symbol} (${s.baseMonths}T)`).join(', ')}`);
if (passedMaBase3_6m.length !== 8) {
  console.error(`[FAIL] Expected 8 stocks in ma_base (3-6M), got ${passedMaBase3_6m.length}`);
  process.exit(1);
}
passedMaBase3_6m.forEach(st => {
  if (st.baseMonths < 3.0 || st.baseMonths >= 6.0) {
    console.error(`[FAIL] Stock ${st.symbol} baseMonths=${st.baseMonths} out of 3-6M range!`);
    process.exit(1);
  }
});

// Tier 2: 6 - 12 tháng
mockDom.setBaseDurationTier('6_12m');
const passedMaBase6_12m = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' [6 - 12 Tháng] returns ${passedMaBase6_12m.length} stocks: ${passedMaBase6_12m.map(s => `${s.symbol} (${s.baseMonths}T)`).join(', ')}`);
if (passedMaBase6_12m.length !== 1 || passedMaBase6_12m[0].symbol !== 'DPR') {
  console.error('[FAIL] Expected DPR in ma_base (6-12M)');
  process.exit(1);
}

// Tier 3: Trên 12 tháng
mockDom.setBaseDurationTier('12m_plus');
const passedMaBase12m_plus = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' [Trên 12 Tháng] returns ${passedMaBase12m_plus.length} stocks: ${passedMaBase12m_plus.map(s => `${s.symbol} (${s.baseMonths}T)`).join(', ')}`);
if (passedMaBase12m_plus.length !== 1 || passedMaBase12m_plus[0].symbol !== 'FCN') {
  console.error('[FAIL] Expected FCN in ma_base (>12M)');
  process.exit(1);
}

// Mode: Both (Tier: 3-6m)
mockDom.setBuyPresetMode('both');
mockDom.setBaseDurationTier('3_6m');
const passedBoth = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'both' (tier: 3-6m) returns ${passedBoth.length} stock(s): ${passedBoth.map(s => s.symbol).join(', ')}`);
if (passedBoth.length === 0 || !passedBoth.some(s => s.symbol === 'HDB')) {
  console.error('[FAIL] HDB should be in passedBoth!');
  process.exit(1);
}

// Mode: Lowest PE only
mockDom.setBuyPresetMode('lowest_pe');
const passedPe = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'lowest_pe' returns ${passedPe.length} stocks: ${passedPe.map(s => s.symbol).join(', ')}`);
if (passedPe.length !== 10) {
  console.error('[FAIL] Expected exactly 10 stocks in lowest_pe');
  process.exit(1);
}

// Mode: All
mockDom.setBuyPresetMode('all');
const passedAll = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'all' returns ${passedAll.length} stocks.`);
if (passedAll.length !== 100) {
  console.error('[FAIL] Expected 100 stocks in all');
  process.exit(1);
}

// 6. Test Realtime Live Tick Recalculation
console.log('\n--- TESTING REALTIME LIVE TICK RECALCULATION ---');
// Simulate live price jump for ACB: price increases above MA10 (20820) and MA50 (21309) to 23500
mockDom.StockRealtimeService.applyRealStockData({
  "ACB": {
    price: 23500,
    change: 3.5,
    volume: 8000000
  }
});

const updatedAcb = StockApp.stocks.find(s => s.symbol === 'ACB');
console.log(`[INFO] Simulated ACB at 23500: diffMA10=${updatedAcb.diffMA10}%, diffMA50=${updatedAcb.diffMA50}%, aboveMA10_50=${updatedAcb.aboveMA10_50}, upperHalf=${updatedAcb.baseUpperHalf}, baseValid=${updatedAcb.baseValid}`);

if (updatedAcb.diffMA10 <= 0 || updatedAcb.diffMA50 <= 0 || !updatedAcb.aboveMA10_50 || !updatedAcb.baseUpperHalf || !updatedAcb.baseValid) {
  console.error('[FAIL] Dynamic recalculation failed to reflect price jump!');
  process.exit(1);
}
console.log('[PASS] Dynamic recalculation successfully updated diffMA10, diffMA50, aboveMA10_50, baseUpperHalf, and baseValid on price tick!');

console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===\n');
process.exit(0);
