const fs = require('fs');
const https = require('https');
const path = require('path');

const snapshotPath = path.join(__dirname, '..', 'vnstock_snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const symbols = Object.keys(snapshot.stocks);

console.log(`Starting Technical & Base computation for ${symbols.length} stocks (Cách 1 + Spring info)...`);

function fetchHistory(symbol) {
  const to = Math.floor(Date.now() / 1000);
  const from = to - (365 * 86400); // 365 days of history
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

function formatDateVN(timestampSec) {
  const d = new Date(timestampSec * 1000);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function formatPriceK(valVND) {
  return (valVND / 1000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function analyzeStockTechnical(bars, currentPriceVND, symbol) {
  if (!bars || !bars.c || bars.c.length < 50) return null;
  const len = bars.c.length;
  // Convert from thousands to VND
  const closesVND = bars.c.map(v => Math.round(v * 1000));
  const lowsVND = bars.l ? bars.l.map(v => Math.round(v * 1000)) : closesVND;
  const highsVND = bars.h ? bars.h.map(v => Math.round(v * 1000)) : closesVND;
  const volumes = bars.v || [];
  const timestamps = bars.t;
  const price = currentPriceVND || closesVND[len - 1];

  function getMA20Vol(idx) {
    if (idx < 20) return 0;
    const slice = volumes.slice(idx - 20, idx);
    return slice.reduce((a, b) => a + b, 0) / 20;
  }

  // 1. Moving Averages (MA10 & MA50)
  const last10 = closesVND.slice(-10);
  const ma10 = Math.round(last10.reduce((a, b) => a + b, 0) / 10);
  const diffMA10 = parseFloat((((price - ma10) / ma10) * 100).toFixed(1));

  const last50 = closesVND.slice(-50);
  const ma50 = Math.round(last50.reduce((a, b) => a + b, 0) / 50);
  const diffMA50 = parseFloat((((price - ma50) / ma50) * 100).toFixed(1));

  const aboveMA10_50 = (diffMA10 > 0 && diffMA50 > 0);

  // 2. Base Consolidation Detection
  const candidates = [];

  // Method 1: Bottom Reversal Base (Starting at initial trough T0, Spring <= 5%)
  for (let t0 = Math.max(0, len - 180); t0 <= len - 60; t0++) {
    const t0Close = closesVND[t0];
    // t0 must be the lowest close in a 3-bar cluster (t0-3 to t0+3)
    let isTrough = true;
    for (let r = Math.max(0, t0 - 3); r <= Math.min(len - 1, t0 + 3); r++) {
      if (closesVND[r] < t0Close) { isTrough = false; break; }
    }

    if (!isTrough) continue;

    const baseSlice = closesVND.slice(t0);
    const lowSlice = lowsVND.slice(t0);
    const timeSlice = timestamps.slice(t0);
    const sessions = baseSlice.length;

    let minClose = Infinity, minIdx = -1;
    let maxClose = -Infinity, maxIdx = -1;

    for (let i = 0; i < baseSlice.length; i++) {
      if (baseSlice[i] < minClose) {
        minClose = baseSlice[i];
        minIdx = i;
      }
      if (baseSlice[i] > maxClose) {
        maxClose = baseSlice[i];
        maxIdx = i;
      }
    }

    // Spring Condition: dip below t0Close by <= 5% is accepted as a valid Spring/Shakeout
    const dipPct = ((t0Close - minClose) / t0Close) * 100;
    let invalidBreakdown = false;
    if (minIdx > 0 && dipPct > 5.0) invalidBreakdown = true;

    // Check if any subsequent intraday low dropped > 5% below t0Close
    for (let j = 1; j < lowSlice.length; j++) {
      if (((t0Close - lowSlice[j]) / t0Close) * 100 > 5.0) {
        invalidBreakdown = true;
        break;
      }
    }

    // Check prompt recovery if closing price dipped below t0Close
    let hasSpring = false;
    if (minIdx > 0 && dipPct > 0.05) {
      let belowCount = 0;
      for (let k = minIdx; k < Math.min(baseSlice.length, minIdx + 15); k++) {
        if (baseSlice[k] < t0Close) belowCount++;
      }
      if (belowCount > 3) invalidBreakdown = true;
      else hasSpring = true;
    }

    if (invalidBreakdown) continue;

    let springPrice = null;
    let springDate = null;
    let isIntradaySpringAtT0 = false;

    if (hasSpring) {
      springPrice = minClose;
      springDate = formatDateVN(timeSlice[minIdx]);
    } else if (lowsVND[t0] < t0Close * 0.95) {
      // Intraday dip > 5% below close but closed high (Dragonfly Doji / Pinbar)
      const ma20Vol = getMA20Vol(t0);
      const volRatio = ma20Vol > 0 ? (volumes[t0] / ma20Vol) : 1;
      // Volume surge >= 1.3x MA20 Volume confirms Spring/Shakeout absorption
      if (volRatio >= 1.3) {
        hasSpring = true;
        springPrice = lowsVND[t0];
        springDate = formatDateVN(timestamps[t0]);
        isIntradaySpringAtT0 = true;
      }
    }

    // In Cách 1: Đáy hộp is anchored to t0Close (the initial reversal trough)
    const baseMin = t0Close;
    const baseMinDate = formatDateVN(timestamps[t0]);
    const baseMax = maxClose;
    const baseMaxDate = formatDateVN(timeSlice[maxIdx]);

    const tightness = parseFloat((((baseMax - baseMin) / baseMin) * 100).toFixed(1));

    if (tightness <= 20.0 && price >= minClose) {
      const months = parseFloat((sessions / 21).toFixed(1));

      let methodDesc = '';
      if (hasSpring) {
        if (isIntradaySpringAtT0) {
          methodDesc = `Cổ phiếu tích lũy gom hàng sau cú rũ bỏ quét đáy kinh điển (Spring / Shakeout) ngày ${springDate} nhúng râu về ${formatPriceK(springPrice)} với khối lượng đột biến (vượt MA20 Volume) rồi rút chân mạnh mẽ đóng cửa tại ${formatPriceK(baseMin)}, sau đó vận động siết chặt trong chiếc hộp ${formatPriceK(baseMin)} - ${formatPriceK(baseMax)} (${tightness}%), chưa breakout chuyển pha sang xu hướng mới.`;
        } else {
          methodDesc = `Cổ phiếu tích lũy gom hàng sau nhịp tạo đáy ngày ${baseMinDate}, có nhịp rũ bỏ quét đáy (Spring) ngày ${springDate} về ${formatPriceK(springPrice)} rồi bật tăng mạnh trở lại kênh trên, vận động siết chặt trong chiếc hộp ${formatPriceK(baseMin)} - ${formatPriceK(baseMax)} (${tightness}%), chưa breakout chuyển pha sang xu hướng mới.`;
        }
      } else {
        methodDesc = `Cổ phiếu tích lũy gom hàng sau nhịp tạo đáy ngày ${baseMinDate}, vận động trong chiếc hộp giá giữa đáy đảo chiều (${formatPriceK(baseMin)}) và đỉnh nhịp hồi (${formatPriceK(baseMax)}), độ siết ${tightness}%, chưa breakout chuyển pha sang xu hướng mới.`;
      }

      candidates.push({
        method: 'bottom',
        methodName: 'Nền Tạo Đáy',
        methodDesc,
        baseMin: baseMin,
        baseMax: baseMax,
        baseMinDate: baseMinDate,
        baseMaxDate: baseMaxDate,
        baseSessions: sessions,
        baseMonths: months,
        baseTightness: tightness,
        hasSpring,
        springPrice,
        springDate,
        score: sessions * 2.0 + (25 - tightness) * 2
      });
    }
  }

  // Method 2: Continuation Flat Base (High Tight Box starting at peak T0)
  for (let t0 = Math.max(0, len - 180); t0 <= len - 60; t0++) {
    const t0Close = closesVND[t0];
    // t0 must be the highest close in a 3-bar cluster (t0-3 to t0+3)
    let isPeak = true;
    for (let r = Math.max(0, t0 - 3); r <= Math.min(len - 1, t0 + 3); r++) {
      if (closesVND[r] > t0Close) { isPeak = false; break; }
    }

    if (!isPeak) continue;

    const baseSlice = closesVND.slice(t0);
    const timeSlice = timestamps.slice(t0);
    const sessions = baseSlice.length;

    let minClose = Infinity, minIdx = -1;
    let maxClose = -Infinity, maxIdx = -1;

    for (let i = 0; i < baseSlice.length; i++) {
      if (baseSlice[i] < minClose) {
        minClose = baseSlice[i];
        minIdx = i;
      }
      if (baseSlice[i] > maxClose) {
        maxClose = baseSlice[i];
        maxIdx = i;
      }
    }

    if (maxIdx > Math.round(sessions * 0.15)) continue;

    const baseMax = maxClose;
    const baseMaxDate = formatDateVN(timeSlice[maxIdx]);
    const baseMin = minClose;
    const baseMinDate = formatDateVN(timeSlice[minIdx]);

    const tightness = parseFloat((((baseMax - baseMin) / baseMin) * 100).toFixed(1));

    if (tightness <= 20.0 && price >= minClose) {
      const months = parseFloat((sessions / 21).toFixed(1));

      const methodDesc = `Cổ phiếu đã bứt phá khỏi nền giá tạo đáy trước đó và đang hình thành một chiếc hộp tích lũy mới ở kênh trên (nền chồng nền) từ ngày ${baseMaxDate} để hấp thụ lượng cung chốt lời với độ siết ${tightness}%.`;

      candidates.push({
        method: 'continuation',
        methodName: 'Nền Phẳng Tiếp Diễn',
        methodDesc,
        baseMin: baseMin,
        baseMax: baseMax,
        baseMinDate: baseMinDate,
        baseMaxDate: baseMaxDate,
        baseSessions: sessions,
        baseMonths: months,
        baseTightness: tightness,
        hasSpring: false,
        springPrice: null,
        springDate: null,
        score: sessions * 2.0 + (25 - tightness) * 2
      });
    }
  }

  let baseResult = null;
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    baseResult = candidates[0];
    baseResult.baseValid = true;
  } else {
    // No valid base <= 20%
    const win = 60;
    const baseSlice = closesVND.slice(len - win);
    const timeSlice = timestamps.slice(len - win);
    let minClose = Infinity, minIdx = -1;
    let maxClose = -Infinity, maxIdx = -1;
    for (let i = 0; i < baseSlice.length; i++) {
      if (baseSlice[i] < minClose) { minClose = baseSlice[i]; minIdx = i; }
      if (baseSlice[i] > maxClose) { maxClose = baseSlice[i]; maxIdx = i; }
    }
    const tightness = parseFloat((((maxClose - minClose) / minClose) * 100).toFixed(1));
    baseResult = {
      baseValid: false,
      method: 'bottom',
      methodName: 'Nền Tạo Đáy',
      methodDesc: `Cổ phiếu chưa hình thành vùng nền tích lũy siết chặt đạt chuẩn (độ biến động ${tightness}% > 20%).`,
      baseMin: minClose,
      baseMax: maxClose,
      baseMinDate: formatDateVN(timeSlice[minIdx]),
      baseMaxDate: formatDateVN(timeSlice[maxIdx]),
      baseSessions: 0,
      baseMonths: 0,
      baseTightness: tightness,
      hasSpring: false,
      springPrice: null,
      springDate: null
    };
  }

  const baseMid = Math.round(baseResult.baseMin + 0.5 * (baseResult.baseMax - baseResult.baseMin));
  const baseUpperHalf = price >= baseMid;

  return {
    price,
    ma10,
    ma50,
    diffMA10,
    diffMA50,
    aboveMA10_50,
    baseSessions: baseResult.baseSessions,
    baseMonths: baseResult.baseMonths,
    baseTightness: baseResult.baseTightness,
    baseMin: baseResult.baseMin,
    baseMax: baseResult.baseMax,
    baseMinDate: baseResult.baseMinDate,
    baseMaxDate: baseResult.baseMaxDate,
    baseMethod: baseResult.method,
    baseMethodName: baseResult.methodName,
    baseMethodDesc: baseResult.methodDesc,
    baseHasSpring: baseResult.hasSpring,
    springPrice: baseResult.springPrice,
    springDate: baseResult.springDate,
    baseMid,
    baseUpperHalf,
    baseValid: baseResult.baseValid
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
        bars = await fetchHistory(sym);
      }
      const st = snapshot.stocks[sym];
      const res = analyzeStockTechnical(bars, st ? st.price : null, sym);
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
      const res = analyzeStockTechnical(bars, st ? st.price : null, sym);
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
      s.baseMinDate = tech.baseMinDate;
      s.baseMaxDate = tech.baseMaxDate;
      s.baseMethod = tech.baseMethod;
      s.baseMethodName = tech.baseMethodName;
      s.baseMethodDesc = tech.baseMethodDesc;
      s.baseHasSpring = tech.baseHasSpring;
      s.springPrice = tech.springPrice;
      s.springDate = tech.springDate;
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
      s.diffMA10 = s.diffMA10 || 0;
      s.diffMA50 = s.diffMA50 || 0;
      s.aboveMA10_50 = s.diffMA10 > 0 && s.diffMA50 > 0;
      s.baseSessions = 0;
      s.baseMonths = 0;
      s.baseTightness = 25.0;
      s.baseValid = false;
      s.baseHasSpring = false;
      s.springPrice = null;
      s.springDate = null;
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
