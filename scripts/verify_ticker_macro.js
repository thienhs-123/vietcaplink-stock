const fs = require('fs');
const vm = require('vm');

console.log('--- TEST SUITE: TICKER CONTROLLER & MACRO SYNCHRONIZATION ---');

const html = fs.readFileSync('C:/Users/ADMIN/.gemini/antigravity/scratch/stock-ai-dashboard/index.html', 'utf-8');

const scriptRegex = /<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/gi;
let match;
let mainScriptCode = '';

while ((match = scriptRegex.exec(html)) !== null) {
  const content = match[1];
  if (content.includes('StockApp')) {
    mainScriptCode = content;
  }
}

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
  ApexCharts: class { render() {} updateSeries() {} updateOptions() {} },
  console: console,
  setTimeout: () => 1,
  clearTimeout: () => {},
  setInterval: () => 1,
  clearInterval: () => {}
};
mockDom.window.window = mockDom.window;
mockDom.window.document = mockDom.document;

try {
  vm.createContext(mockDom);
  vm.runInContext(mainScriptCode, mockDom);
  console.log('[PASS] Main script parsed & executed cleanly in VM sandbox.');
} catch (err) {
  console.error('[FAIL] Script execution error:', err);
  process.exit(1);
}

const TickerController = mockDom.window.TickerController;
if (!TickerController) {
  console.error('[FAIL] TickerController is undefined on window');
  process.exit(1);
}

// 1. Kiểm tra Module 0 (Chứng khoán thế giới)
const m0 = TickerController.modules[0];
console.log(`[PASS] Module 0: "${m0.name}" has ${m0.items.length} items`);
if (m0.items.length !== 7) {
  console.error('[FAIL] Module 0 should have 7 items');
  process.exit(1);
}
console.log('  Items:');
m0.items.forEach(it => console.log(`    - ${it.label}: ${it.val} (${it.change})`));

// 2. Kiểm tra Module 2 (Tỷ giá và hàng hóa)
const m2 = TickerController.modules[2];
console.log(`[PASS] Module 2: "${m2.name}" has ${m2.items.length} items`);
if (m2.items.length !== 9) {
  console.error('[FAIL] Module 2 should have 9 items');
  process.exit(1);
}
console.log('  Items:');
m2.items.forEach(it => console.log(`    - ${it.label}: ${it.val} (${it.change})`));

// 3. Kiểm tra applyRealMacroData
const testMacro = {
  world_indices: [
    { label: "DOW JONES (MỸ)", val: "51,500.00", change: "-3.20%", isUp: false },
    { label: "S&P 500 (MỸ)", val: "7,400.00", change: "-3.50%", isUp: false }
  ],
  commodities: [
    { label: "VÀNG THẾ GIỚI", val: "$4,150.0", change: "+1.80%", isUp: true },
    { label: "DẦU BRENT", val: "$98.50", change: "+0.20%", isUp: true }
  ],
  usdVnd: 25790,
  goldWorld: 4150.0,
  oilBrent: 98.50
};

mockDom.window.StockRealtimeService.applyRealMacroData(testMacro);
if (mockDom.window.StockApp.macro.usdVnd === 25790 &&
    mockDom.window.StockApp.macro.goldWorld === 4150.0 &&
    mockDom.window.TickerController.modules[0].items[0].val === "51,500.00" &&
    mockDom.window.TickerController.modules[2].items[0].val === "$4,150.0") {
  console.log('[PASS] applyRealMacroData correctly updated StockApp.macro and TickerController modules!');
} else {
  console.error('[FAIL] applyRealMacroData did not update properly');
  process.exit(1);
}

console.log('=== ALL TICKER & MACRO TESTS PASSED! ===');
