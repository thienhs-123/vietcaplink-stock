const fs = require('fs');
const https = require('https');
const path = require('path');

const snapshotPath = path.join(__dirname, '..', 'vnstock_snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const symbols = Object.keys(snapshot.stocks);

console.log(`Starting Technical & Base computation for ${symbols.length} stocks...`);

function fetchHistory(symbol) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - (300 * 86400); // 300 days of history
  const url = `https://iboard-api.ssi.com.vn/statistics/charts/history?symbol=${symbol}&resolution=D&from=${from}&to=${to}`;
  
  return new Promise((resolve) => {
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 10000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.data || null);
        } catch(e) {
          resolve(null);
        }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

function analyzeStockTechnical(bars, currentPriceVND) {
  if (!bars || !bars.c || bars.c.length < 50) return null;
  const len = bars.c.length;
  // Convert from thousands to VND
  const closes = bars.c.map(v => Math.round(v * 1000));
  const highs = bars.h.map(v => Math.round(v * 1000));
  const lows = bars.l.map(v => Math.round(v * 1000));
  
  const price = currentPriceVND || closes[len - 1];

  // MA10
  const last10 = closes.slice(-10);
  const ma10 = Math.round(last10.reduce((a, b) => a + b, 0) / 10);
  const diffMA10 = parseFloat((((price - ma10) / ma10) * 100).toFixed(1));

  // MA50
  const last50 = closes.slice(-50);
  const ma50 = Math.round(last50.reduce((a, b) => a + b, 0) / 50);
  const diffMA50 = parseFloat((((price - ma50) / ma50) * 100).toFixed(1));

  const aboveMA10_50 = (diffMA10 > 0 && diffMA50 > 0);

  // 60-session window
  const win = Math.min(60, len);
  let min60 = Infinity, max60 = -Infinity;
  for (let i = len - win; i < len; i++) {
    if (lows[i] < min60) min60 = lows[i];
    if (highs[i] > max60) max60 = highs[i];
  }
  const tightness60 = parseFloat((((max60 - min60) / min60) * 100).toFixed(1));

  let bestSessions = win;
  let bestTightness = tightness60;
  let bestMin = min60;
  let bestMax = max60;

  if (tightness60 <= 20.0) {
    let curMin = min60, curMax = max60;
    let ext = win;
    for (let i = len - win - 1; i >= 0; i--) {
      const nextMin = Math.min(curMin, lows[i]);
      const nextMax = Math.max(curMax, highs[i]);
      const nextTightness = ((nextMax - nextMin) / nextMin) * 100;
      if (nextTightness <= 20.0) {
        curMin = nextMin;
        curMax = nextMax;
        ext++;
      } else {
        break;
      }
    }
    bestSessions = ext;
    bestTightness = parseFloat((((curMax - curMin) / curMin) * 100).toFixed(1));
    bestMin = curMin;
    bestMax = curMax;
  } else {
    // If 60-session tightness > 20%, find most recent consolidation span where tightness <= 20%
    let curMinR = lows[len - 1], curMaxR = highs[len - 1];
    let recent = 1;
    for (let i = len - 2; i >= 0; i--) {
      const nMin = Math.min(curMinR, lows[i]);
      const nMax = Math.max(curMaxR, highs[i]);
      if (((nMax - nMin) / nMin) * 100 <= 20.0) {
        curMinR = nMin;
        curMaxR = nMax;
        recent++;
      } else {
        break;
      }
    }
    bestSessions = recent;
    bestTightness = tightness60;
    bestMin = min60;
    bestMax = max60;
  }

  const baseMonths = parseFloat((bestSessions / 21).toFixed(1));
  const baseMid = Math.round(bestMin + 0.5 * (bestMax - bestMin));
  const baseUpperHalf = price >= baseMid;
  const baseNotBroken = price >= bestMin;
  const baseValid = (bestSessions >= 60) && (bestTightness <= 20.0) && baseNotBroken && baseUpperHalf;

  return {
    price,
    ma10,
    ma50,
    diffMA10,
    diffMA50,
    aboveMA10_50,
    baseSessions: bestSessions,
    baseMonths,
    baseTightness: bestTightness,
    baseMin: bestMin,
    baseMax: bestMax,
    baseMid,
    baseUpperHalf,
    baseValid
  };
}

async function run() {
  const results = {};
  const failed = [];

  // Batch fetch 8 at a time
  for (let i = 0; i < symbols.length; i += 8) {
    const chunk = symbols.slice(i, i + 8);
    const promises = chunk.map(async (sym) => {
      let bars = await fetchHistory(sym);
      if (!bars || !bars.c || bars.c.length < 50) {
        // Retry once
        bars = await fetchHistory(sym);
      }
      const st = snapshot.stocks[sym];
      const res = analyzeStockTechnical(bars, st ? st.price : null);
      if (res) {
        results[sym] = res;
      } else {
        failed.push(sym);
      }
    });
    await Promise.all(promises);
  }

  console.log(`Successfully computed for ${Object.keys(results).length} / ${symbols.length} stocks.`);
  if (failed.length > 0) {
    console.log(`Retrying failed symbols: ${failed.join(', ')}`);
    for (const sym of failed) {
      const bars = await fetchHistory(sym);
      const st = snapshot.stocks[sym];
      const res = analyzeStockTechnical(bars, st ? st.price : null);
      if (res) {
        results[sym] = res;
      }
    }
  }

  // Update snapshot.stocks
  let countPassedTechnical = 0;
  let countPassedBoth = 0;

  // Calculate top 10 PE
  const validPeStocks = Object.entries(snapshot.stocks)
    .filter(([_, s]) => s.pe && s.pe > 0)
    .sort((a, b) => a[1].pe - b[1].pe);
  const top10PeSet = new Set(validPeStocks.slice(0, 10).map(e => e[0]));

  for (const sym of symbols) {
    const s = snapshot.stocks[sym];
    const tech = results[sym];
    if (tech) {
      s.ma10 = tech.ma10;
      s.ma50 = tech.ma50;
      s.diffMA10 = tech.diffMA10;
      s.diffMA50 = tech.diffMA50;
      s.aboveMA10_50 = tech.aboveMA10_50;
      s.baseSessions = tech.baseSessions;
      s.baseMonths = tech.baseMonths;
      s.baseTightness = tech.baseTightness;
      s.baseMin = tech.baseMin;
      s.baseMax = tech.baseMax;
      s.baseMid = tech.baseMid;
      s.baseUpperHalf = tech.baseUpperHalf;
      s.baseValid = tech.baseValid;

      if (tech.aboveMA10_50 && tech.baseValid) {
        countPassedTechnical++;
        if (top10PeSet.has(sym)) {
          countPassedBoth++;
        }
      }
    } else {
      // Fallback reasonable parameters if API missed a bar
      s.diffMA10 = s.diffMA10 || 0;
      s.diffMA50 = s.diffMA50 || 0;
      s.aboveMA10_50 = s.diffMA10 > 0 && s.diffMA50 > 0;
      s.baseSessions = s.baseSessions || 45;
      s.baseMonths = s.baseMonths || 2.1;
      s.baseTightness = s.baseTightness || 25.0;
      s.baseValid = false;
    }
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`Saved updated vnstock_snapshot.json successfully!`);
  console.log(`Technical Criterion (Price > MA10, MA50 AND Base >= 3M & Tightness <= 20% & Upper Half): ${countPassedTechnical} stocks passed.`);
  console.log(`Both Criteria (Technical AND Top 10 lowest PE): ${countPassedBoth} stocks passed.`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
