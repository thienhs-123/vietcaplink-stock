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

// 5. Test screener modes
mockDom.setBuyPresetMode('both');
console.log(`[PASS] Preset mode 'both' activated. filterMaAndBase=${StockApp.buyCriteria.filterMaAndBase}, filterLowestPeTop10=${StockApp.buyCriteria.filterLowestPeTop10}`);

// Run screener filtering logic
const validPeStocks = [...StockApp.stocks].filter(s => s.pe && s.pe > 0).sort((a, b) => a.pe - b.pe);
const top10PeMap = new Map();
validPeStocks.slice(0, 10).forEach((st, idx) => top10PeMap.set(st.symbol, idx + 1));

const filterFunc = (st) => {
  const { filterMaAndBase, filterLowestPeTop10 } = StockApp.buyCriteria;
  if (filterMaAndBase) {
    const passesMA = (st.aboveMA10_50 === true) || (st.diffMA10 > 0 && st.diffMA50 > 0);
    const durOk = (st.baseSessions >= 60) || ((st.baseMonths || 0) >= 3.0);
    const tightOk = (st.baseTightness !== undefined ? st.baseTightness : 15.0) <= 20.0;
    const upperOk = st.baseUpperHalf !== false;
    const passesBase = (st.baseValid === true) || (durOk && tightOk && upperOk);
    if (!passesMA || !passesBase) return false;
  }
  if (filterLowestPeTop10) {
    if (!top10PeMap.has(st.symbol)) return false;
  }
  return true;
};

// Mode: Both
mockDom.setBuyPresetMode('both');
const passedBoth = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'both' returns ${passedBoth.length} stock(s): ${passedBoth.map(s => s.symbol).join(', ')}`);
if (passedBoth.length === 0 || !passedBoth.some(s => s.symbol === 'HDB')) {
  console.error('[FAIL] HDB should be in passedBoth!');
  process.exit(1);
}

// Mode: MA & Base only
mockDom.setBuyPresetMode('ma_base');
const passedMaBase = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' returns ${passedMaBase.length} stock(s): ${passedMaBase.map(s => s.symbol).join(', ')}`);
if (passedMaBase.length < 5) {
  console.error('[FAIL] Expected at least 5 stocks in ma_base');
  process.exit(1);
}
// Verify each stock in passedMaBase strictly satisfies all conditions
passedMaBase.forEach(st => {
  const passesMA = st.diffMA10 > 0 && st.diffMA50 > 0;
  const passesBase = (st.baseSessions >= 60 || st.baseMonths >= 3.0) && st.baseTightness <= 20.0 && st.baseUpperHalf === true;
  if (!passesMA || !passesBase) {
    console.error(`[FAIL] Stock ${st.symbol} in passedMaBase violates criteria!`);
    process.exit(1);
  }
});
console.log('[PASS] All stocks in passedMaBase strictly satisfy both MA and Base 2-tier criteria!');

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
