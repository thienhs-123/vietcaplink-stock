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
  const { filterMaAndBase, filterLowestPeTop10, baseDurationTiers, baseDurationTier } = StockApp.buyCriteria;
  if (filterMaAndBase) {
    const passesMA = (st.aboveMA10_50 === true) || (st.diffMA10 > 0 && st.diffMA50 > 0);
    const durOk = (st.baseSessions >= 60) || ((st.baseMonths || 0) >= 3.0);
    const tightOk = (st.baseTightness !== undefined ? st.baseTightness : 15.0) <= 20.0;
    const upperOk = st.baseUpperHalf !== false;
    const passesBase = (st.baseValid === true) || (durOk && tightOk && upperOk);
    if (!passesMA || !passesBase) return false;

    // Multi-choice base duration sub-criteria
    const selectedTiers = Array.isArray(baseDurationTiers) && baseDurationTiers.length > 0
      ? baseDurationTiers
      : (baseDurationTier ? [baseDurationTier] : ['3_6m']);

    const bMonths = st.baseMonths || 0;
    const bSessions = st.baseSessions || Math.round(bMonths * 21);
    const is3_6 = (bMonths >= 3.0 && bMonths < 6.0) || (bSessions >= 60 && bSessions <= 125);
    const is6_12 = (bMonths >= 6.0 && bMonths <= 12.0) || (bSessions > 125 && bSessions <= 250);
    const is12plus = (bMonths > 12.0) || (bSessions > 250);

    let match = false;
    if (selectedTiers.includes('3_6m') && is3_6) match = true;
    if (selectedTiers.includes('6_12m') && is6_12) match = true;
    if (selectedTiers.includes('12m_plus') && is12plus) match = true;

    if (!match) return false;
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

// Mode: MA & Base only - Test 3 duration tiers individually
mockDom.setBuyPresetMode('ma_base');

// Tier 1: 3 - 6 tháng (Default)
mockDom.setBaseDurationTier(['3_6m']);
const passedMaBase3_6m = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' [3 - 6 Tháng] returns ${passedMaBase3_6m.length} stocks: ${passedMaBase3_6m.map(s => `${s.symbol} (${s.baseMonths}T)`).join(', ')}`);
if (passedMaBase3_6m.length !== 8) {
  console.error(`[FAIL] Expected 8 stocks in ma_base (3-6M), got ${passedMaBase3_6m.length}`);
  process.exit(1);
}

// Tier 2: 6 - 12 tháng
mockDom.setBaseDurationTier(['6_12m']);
const passedMaBase6_12m = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' [6 - 12 Tháng] returns ${passedMaBase6_12m.length} stocks: ${passedMaBase6_12m.map(s => `${s.symbol} (${s.baseMonths}T)`).join(', ')}`);
if (passedMaBase6_12m.length !== 1 || passedMaBase6_12m[0].symbol !== 'DPR') {
  console.error('[FAIL] Expected DPR in ma_base (6-12M)');
  process.exit(1);
}

// Tier 3: Trên 12 tháng
mockDom.setBaseDurationTier(['12m_plus']);
const passedMaBase12m_plus = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Mode 'ma_base' [Trên 12 Tháng] returns ${passedMaBase12m_plus.length} stocks: ${passedMaBase12m_plus.map(s => `${s.symbol} (${s.baseMonths}T)`).join(', ')}`);
if (passedMaBase12m_plus.length !== 1 || passedMaBase12m_plus[0].symbol !== 'FCN') {
  console.error('[FAIL] Expected FCN in ma_base (>12M)');
  process.exit(1);
}

// --- MULTI-CHOICE TESTS ---
console.log('\n--- TESTING MULTI-CHOICE COMBINATIONS ---');

// Multi-choice 1: 3-6 tháng VÀ 6-12 tháng (Từ 3 - 12 tháng)
mockDom.setBaseDurationTier(['3_6m', '6_12m']);
const passedMulti_3_12 = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Multi-choice [3 - 6M + 6 - 12M] returns ${passedMulti_3_12.length} stocks: ${passedMulti_3_12.map(s => s.symbol).join(', ')}`);
if (passedMulti_3_12.length !== 9 || !passedMulti_3_12.some(s => s.symbol === 'DPR') || !passedMulti_3_12.some(s => s.symbol === 'CTG')) {
  console.error('[FAIL] Multi-choice [3-6M + 6-12M] failed!');
  process.exit(1);
}

// Multi-choice 2: 6-12 tháng VÀ trên 12 tháng (Từ 6 tháng trở lên)
mockDom.setBaseDurationTier(['6_12m', '12m_plus']);
const passedMulti_6_plus = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Multi-choice [6 - 12M + >12M] returns ${passedMulti_6_plus.length} stocks: ${passedMulti_6_plus.map(s => s.symbol).join(', ')}`);
if (passedMulti_6_plus.length !== 2 || !passedMulti_6_plus.some(s => s.symbol === 'DPR') || !passedMulti_6_plus.some(s => s.symbol === 'FCN')) {
  console.error('[FAIL] Multi-choice [6-12M + >12M] failed!');
  process.exit(1);
}

// Multi-choice 3: Cả 3 khoảng thời gian
mockDom.setBaseDurationTier(['3_6m', '6_12m', '12m_plus']);
const passedMulti_All3 = StockApp.stocks.filter(filterFunc);
console.log(`[PASS] Multi-choice [Cả 3 khoảng] returns ${passedMulti_All3.length} stocks: ${passedMulti_All3.map(s => s.symbol).join(', ')}`);
if (passedMulti_All3.length !== 10) {
  console.error(`[FAIL] Expected exactly 10 stocks in ma_base (All 3), got ${passedMulti_All3.length}`);
  process.exit(1);
}

// --- FORBIDDEN PAIR TOGGLE CONSTRAINT TESTS ---
console.log('\n--- TESTING FORBIDDEN PAIR CONSTRAINT ---');
// Start with only ['3_6m']
mockDom.setBaseDurationTier(['3_6m']);
console.log(`[INFO] Current tiers: [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);

// Try to toggle '12m_plus' directly without '6_12m': must be blocked!
mockDom.toggleBaseDurationTier('12m_plus');
if (StockApp.buyCriteria.baseDurationTiers.includes('12m_plus') && !StockApp.buyCriteria.baseDurationTiers.includes('6_12m')) {
  console.error('[FAIL] System allowed forbidden non-adjacent pair [3_6m, 12m_plus]!');
  process.exit(1);
}
console.log(`[PASS] Blocked non-adjacent selection: current tiers remain [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);

// --- SINGLE-TIER DIRECT SELECTION TESTS (Fixing user bug: "chọn 1 ô thì sẽ là một ô") ---
console.log('\n--- TESTING SINGLE-TIER DIRECT SELECTION ("nếu chọn 1 ô thì sẽ là một ô") ---');

// Test 1: Reset to unselected/all mode, then click '6_12m' directly
mockDom.setBuyPresetMode('all');
console.log(`[INFO] Card 1 reset: filterMaAndBase=${StockApp.buyCriteria.filterMaAndBase}`);
mockDom.selectSingleBaseDurationTier('6_12m');

if (!StockApp.buyCriteria.filterMaAndBase) {
  console.error('[FAIL] Selecting 6_12m should activate Card 1!');
  process.exit(1);
}
if (StockApp.buyCriteria.baseDurationTiers.length !== 1 || StockApp.buyCriteria.baseDurationTiers[0] !== '6_12m') {
  console.error(`[FAIL] Selecting 6_12m must select ONLY ['6_12m']! Got: [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
  process.exit(1);
}
if (StockApp.buyCriteria.baseDurationTiers.includes('3_6m')) {
  console.error('[FAIL] Selecting 6_12m MUST NOT auto-select 3_6m!');
  process.exit(1);
}
console.log('[PASS] Selecting 6_12m from inactive state yields strictly 1 box: [6_12m] (no 3_6m auto-check).');

// Test 2: Click '12m_plus' directly
mockDom.selectSingleBaseDurationTier('12m_plus');
if (StockApp.buyCriteria.baseDurationTiers.length !== 1 || StockApp.buyCriteria.baseDurationTiers[0] !== '12m_plus') {
  console.error(`[FAIL] Selecting 12m_plus must select ONLY ['12m_plus']! Got: [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
  process.exit(1);
}
console.log('[PASS] Selecting 12m_plus yields strictly 1 box: [12m_plus].');

// Test 3: Click '3_6m' directly
mockDom.selectSingleBaseDurationTier('3_6m');
if (StockApp.buyCriteria.baseDurationTiers.length !== 1 || StockApp.buyCriteria.baseDurationTiers[0] !== '3_6m') {
  console.error(`[FAIL] Selecting 3_6m must select ONLY ['3_6m']! Got: [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
  process.exit(1);
}
console.log('[PASS] Selecting 3_6m yields strictly 1 box: [3_6m].');

// Test 4: Forbidden pair via setBaseDurationTier(['3_6m', '12m_plus']) must be blocked!
mockDom.setBaseDurationTier(['3_6m', '12m_plus']);
if (StockApp.buyCriteria.baseDurationTiers.includes('3_6m') && StockApp.buyCriteria.baseDurationTiers.includes('12m_plus') && !StockApp.buyCriteria.baseDurationTiers.includes('6_12m')) {
  console.error('[FAIL] System allowed setBaseDurationTier to set forbidden pair [3_6m, 12m_plus]!');
  process.exit(1);
}
console.log('[PASS] setBaseDurationTier strictly blocks forbidden pair [3_6m, 12m_plus].');

// Valid sequence: toggle '6_12m' first -> ['3_6m', '6_12m']
mockDom.toggleBaseDurationTier('6_12m');
console.log(`[PASS] Successfully toggled 6_12m: tiers are [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
if (StockApp.buyCriteria.baseDurationTiers.length !== 2) {
  console.error('[FAIL] Expected 2 tiers after toggling 6_12m');
  process.exit(1);
}

// Now toggle '12m_plus' -> becomes all 3
mockDom.toggleBaseDurationTier('12m_plus');
console.log(`[PASS] Successfully added 12m_plus: tiers are [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
if (StockApp.buyCriteria.baseDurationTiers.length !== 3) {
  console.error('[FAIL] Expected 3 tiers');
  process.exit(1);
}

// Try to uncheck '6_12m' from all 3: must be blocked because it would leave [3_6m, 12m_plus]!
mockDom.toggleBaseDurationTier('6_12m');
if (!StockApp.buyCriteria.baseDurationTiers.includes('6_12m')) {
  console.error('[FAIL] System allowed unchecking 6_12m which creates forbidden pair!');
  process.exit(1);
}
console.log(`[PASS] Blocked unchecking 6_12m from all 3: tiers remain [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);

// --- TESTING PURE TOGGLE CYCLE (LUÂN CHUYỂN CHỌN/BỎ CHỌN & AUTO-DEACTIVATE KHI BỎ CHỌN Ô CUỐI) ---
console.log('\n--- TESTING PURE TOGGLE CYCLE ---');
// Step 1: Remove '12m_plus' -> leaves ['3_6m', '6_12m']
mockDom.toggleBaseDurationTier('12m_plus');
if (StockApp.buyCriteria.baseDurationTiers.includes('12m_plus') || StockApp.buyCriteria.baseDurationTiers.length !== 2) {
  console.error('[FAIL] Failed to untick 12m_plus!');
  process.exit(1);
}
console.log(`[PASS] Unticked 12m_plus successfully: tiers remain [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);

// Step 2: Remove '3_6m' -> leaves strictly ['6_12m']
mockDom.toggleBaseDurationTier('3_6m');
if (StockApp.buyCriteria.baseDurationTiers.length !== 1 || StockApp.buyCriteria.baseDurationTiers[0] !== '6_12m') {
  console.error(`[FAIL] Expected strictly ['6_12m'] after removing 3_6m, got: [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
  process.exit(1);
}
console.log(`[PASS] Unticked 3_6m successfully: strictly 1 tier [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);

// Step 3: Untick the ONLY remaining box ('6_12m') -> Must turn OFF Card 1 completely
mockDom.toggleBaseDurationTier('6_12m');
if (StockApp.buyCriteria.filterMaAndBase !== false || StockApp.buyCriteria.baseDurationTiers.length !== 0) {
  console.error(`[FAIL] Unticking the last tier must deactivate Card 1! filterMaAndBase=${StockApp.buyCriteria.filterMaAndBase}, tiers=[${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
  process.exit(1);
}
console.log('[PASS] Unticking the last remaining tier successfully turns OFF Card 1 (filterMaAndBase=false, tiers=[]).');

// Step 4: From inactive state, tick '12m_plus' -> Activates Card 1 with strictly ['12m_plus']
mockDom.toggleBaseDurationTier('12m_plus');
if (!StockApp.buyCriteria.filterMaAndBase || StockApp.buyCriteria.baseDurationTiers.length !== 1 || StockApp.buyCriteria.baseDurationTiers[0] !== '12m_plus') {
  console.error(`[FAIL] Ticking tier from inactive state must activate Card 1 with strictly that tier! Got: [${StockApp.buyCriteria.baseDurationTiers.join(', ')}]`);
  process.exit(1);
}
console.log('[PASS] Ticking from inactive state turns ON Card 1 with strictly 1 tier: [12m_plus].');

// Step 5: Untick '12m_plus' immediately -> Turns Card 1 OFF again
mockDom.toggleBaseDurationTier('12m_plus');
if (StockApp.buyCriteria.filterMaAndBase !== false || StockApp.buyCriteria.baseDurationTiers.length !== 0) {
  console.error('[FAIL] Ticking the same box second time did not toggle it OFF!');
  process.exit(1);
}
console.log('[PASS] Ticking the same box again toggles it OFF and deactivates Card 1 cleanly.');

// Mode: Both (Tier: 3-6m)
mockDom.setBuyPresetMode('both');
mockDom.setBaseDurationTier(['3_6m']);
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
