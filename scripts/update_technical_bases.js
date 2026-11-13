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

function getMaxTightnessAllowed(sessions) {
  const months = sessions / 21;
  if (months >= 8.0) return 25.0; // >= 8 tháng: cho phép biên độ đến 25% (nền lớn siêu tích cực theo Wyckoff Cause & Effect)
  if (months >= 6.0) return 23.0; // 6 - 8 tháng: cho phép đến 23%
  return 20.0;                    // dưới 6 tháng: tối đa 20%
}

function classifyBaseType(base, price, high52w, low52w, diffMA50) {
  const diffToHigh52w = ((high52w - price) / high52w) * 100;
  const diffToLow52w = ((price - low52w) / low52w) * 100;

  // 1. NỀN TÁI TÍCH LŨY LỚN (Major Re-accumulation Base: >= 6 tháng và đã hồi phục đáng kể từ đáy)
  if (base.baseMonths >= 6.0 && diffToLow52w >= 15.0 && diffMA50 >= -3.0) {
    return {
      method: 'reaccumulation',
      methodName: 'Nền Tái Tích Lũy',
      methodDesc: `Cổ phiếu đã bứt phá thoát đáy thành công (+${diffToLow52w.toFixed(1)}% từ đáy 52T) và đang hình thành một chiếc hộp tái tích lũy lớn kênh trên ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng từ ngày ${base.baseStartDate}, hiện đang siết chặt ở nửa trên chiếc hộp quanh MA50 để chuẩn bị vượt đỉnh 52 tuần.`
    };
  }

  // 2. NỀN PHẲNG TIẾP DIỄN (Continuation Flat Base)
  // Phải ở kênh trên (cách đỉnh 52 tuần <= 15%) VÀ giữ được MA50 (diffMA50 >= -2.5%)
  if (diffToHigh52w <= 15.0 && diffMA50 >= -2.5) {
    return {
      method: 'continuation',
      methodName: 'Nền Phẳng Tiếp Diễn',
      methodDesc: `Cổ phiếu đang vận động tích lũy ở kênh trên sát vùng đỉnh 52 tuần (${formatPriceK(high52w)}, cách đỉnh ${diffToHigh52w.toFixed(1)}%) và giữ vững trên MA50 (+${diffMA50}%), hình thành chiếc hộp tiếp diễn ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) từ ngày ${base.baseStartDate} để hấp thụ lượng cung chốt lời tiếp tục xu hướng tăng.`
    };
  }

  // 3. NỀN TÁI TÍCH LŨY KÊNH GIỮA (Re-accumulation Base)
  // Đã bứt phá thoát đáy (> 20% từ đáy 52 tuần) nhưng chưa tới đỉnh (> 15% từ đỉnh), đi ngang kênh giữa
  if (diffToLow52w >= 20.0 && diffToHigh52w > 15.0 && diffMA50 >= -4.0) {
    let springDesc = '';
    if (base.hasSpring) {
      springDesc = `, xuất hiện nhịp rũ bỏ quét đáy (Spring) ngày ${base.springDate} về ${formatPriceK(base.springPrice)} với lực cầu hấp thụ mạnh`;
    }
    return {
      method: 'reaccumulation',
      methodName: 'Nền Tái Tích Lũy',
      methodDesc: `Cổ phiếu đã bứt phá thoát đáy thành công (+${diffToLow52w.toFixed(1)}% từ đáy 52T) và đang hình thành một chiếc hộp tái tích lũy kênh giữa ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) từ ngày ${base.baseStartDate}${springDesc} để hấp thụ lượng cung lơ lửng trước khi tiến về đỉnh cũ.`
    };
  }

  // 4. NỀN TẠO ĐÁY (Bottom Reversal Base)
  // Nằm ở vùng giá thấp hoặc điểm bắt đầu nền nằm sát đáy 52 tuần
  let springDesc = '';
  if (base.hasSpring) {
    springDesc = base.springDate === base.baseStartDate
      ? `, có cú rũ bỏ Spring quét râu về ${formatPriceK(base.springPrice)} (ngày ${base.springDate}) kèm volume hấp thụ đột biến rồi rút chân đóng cửa tại ${formatPriceK(base.baseMin)}`
      : `, có nhịp rũ bỏ quét đáy (Spring) ngày ${base.springDate} về ${formatPriceK(base.springPrice)} rồi bật tăng mạnh trở lại kênh trên`;
  }
  return {
    method: 'bottom',
    methodName: 'Nền Tạo Đáy',
    methodDesc: `Cổ phiếu tích lũy gom hàng đảo chiều sau nhịp giảm sâu từ vùng đáy ngày ${base.baseMinDate}${springDesc}, vận động siết chặt trong chiếc hộp ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%), chưa breakout chuyển pha sang xu hướng mới.`
  };
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
  const high52w = Math.max(...highsVND);
  const low52w = Math.min(...lowsVND);
  const diffToHigh52w = ((high52w - price) / high52w) * 100;
  const diffToLow52w = ((price - low52w) / low52w) * 100;

  // 2. Base Consolidation Detection
  const candidates = [];

  // Method 1: Trough-anchored Base (Starting at reversal trough T0, Spring <= 5-7.5%)
  for (let t0 = Math.max(0, len - 240); t0 <= len - 18; t0++) {
    const t0Close = closesVND[t0];
    // t0 must be the lowest close in a cluster around t0 (t0-2 to t0+2)
    let isTrough = true;
    for (let r = Math.max(0, t0 - 2); r <= Math.min(len - 1, t0 + 2); r++) {
      if (closesVND[r] < t0Close) { isTrough = false; break; }
    }

    if (!isTrough) continue;

    const baseSlice = closesVND.slice(t0);
    const lowSlice = lowsVND.slice(t0);
    const timeSlice = timestamps.slice(t0);
    const sessions = baseSlice.length;
    const months = parseFloat((sessions / 21).toFixed(1));

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

    // Breakdown check:
    const dipLimit = months >= 8.0 ? 7.5 : (months >= 6.0 ? 6.5 : 5.0);
    let invalidBreakdown = false;
    const dipPct = ((t0Close - minClose) / t0Close) * 100;
    if (minIdx > 0 && dipPct > dipLimit) invalidBreakdown = true;

    // Check if any subsequent intraday low dropped significantly below t0Close
    for (let j = 1; j < lowSlice.length; j++) {
      if (((t0Close - lowSlice[j]) / t0Close) * 100 > (dipLimit + 1.0)) {
        invalidBreakdown = true;
        break;
      }
    }

    // Check count of consecutive bars closing below t0Close
    let consecutiveBelow = 0, maxConsecutiveBelow = 0;
    for (let k = 0; k < baseSlice.length; k++) {
      if (baseSlice[k] < t0Close) {
        consecutiveBelow++;
        if (consecutiveBelow > maxConsecutiveBelow) maxConsecutiveBelow = consecutiveBelow;
      } else {
        consecutiveBelow = 0;
      }
    }
    const allowedConsecutiveBelow = months >= 8.0 ? 8 : 5;
    if (maxConsecutiveBelow > allowedConsecutiveBelow) invalidBreakdown = true;

    // Spring Validation: If minClose < t0Close, price must have formed a reaction rally
    // (maxBeforeMin >= t0Close * 1.03) before dipping; otherwise it was just a falling leg
    if (minIdx > 0 && dipPct > 0.05) {
      const maxBeforeMin = Math.max(...baseSlice.slice(0, minIdx));
      if (maxBeforeMin < t0Close * 1.03) {
        invalidBreakdown = true;
      }
    }

    if (invalidBreakdown) continue;

    let hasSpring = false;
    let springPrice = null;
    let springDate = null;
    let isIntradaySpringAtT0 = false;

    if (minIdx > 0 && dipPct > 0.05) {
      hasSpring = true;
      springPrice = minClose;
      springDate = formatDateVN(timeSlice[minIdx]);
    } else if (lowsVND[t0] < t0Close * 0.95) {
      // Intraday dip > 5% below close but closed high (Dragonfly Doji / Pinbar)
      const ma20Vol = getMA20Vol(t0);
      const volRatio = ma20Vol > 0 ? (volumes[t0] / ma20Vol) : 1;
      if (volRatio >= 1.3) {
        hasSpring = true;
        springPrice = lowsVND[t0];
        springDate = formatDateVN(timestamps[t0]);
        isIntradaySpringAtT0 = true;
      }
    }

    const baseMin = (hasSpring && springPrice && !isIntradaySpringAtT0) ? t0Close : minClose;
    const baseMinDate = formatDateVN(timestamps[t0]);
    const baseMax = maxClose;
    const baseMaxDate = formatDateVN(timeSlice[maxIdx]);
    const baseStartDate = formatDateVN(timestamps[t0]);

    const maxAllowedTightness = getMaxTightnessAllowed(sessions);
    const tightness = parseFloat((((baseMax - baseMin) / baseMin) * 100).toFixed(1));

    if (tightness <= maxAllowedTightness && price >= baseMin * 0.98) {
      candidates.push({
        method: 'bottom',
        methodName: 'Nền Tạo Đáy',
        baseMin: baseMin,
        baseMax: baseMax,
        baseMinDate: baseMinDate,
        baseMaxDate: baseMaxDate,
        baseStartDate: baseStartDate,
        baseSessions: sessions,
        baseMonths: months,
        baseTightness: tightness,
        hasSpring,
        springPrice,
        springDate,
        isIntradaySpringAtT0,
        score: sessions * 3.0 + (30 - tightness) * 1.5
      });
    }
  }

  // Method 2: Continuation Flat Base (High Tight Box starting at peak T0)
  // STRICT RULE: Only applicable if stock is in the upper cycle (diffToHigh52w <= 20.0% AND diffMA50 >= -3.0%)
  if (diffToHigh52w <= 20.0 && diffMA50 >= -3.0) {
    for (let t0 = Math.max(0, len - 240); t0 <= len - 18; t0++) {
      const t0Close = closesVND[t0];
      // t0 must be the highest close in a cluster around t0 (t0-2 to t0+2)
      let isPeak = true;
      for (let r = Math.max(0, t0 - 2); r <= Math.min(len - 1, t0 + 2); r++) {
        if (closesVND[r] > t0Close) { isPeak = false; break; }
      }

      if (!isPeak) continue;

      const baseSlice = closesVND.slice(t0);
      const timeSlice = timestamps.slice(t0);
      const sessions = baseSlice.length;
      const months = parseFloat((sessions / 21).toFixed(1));

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

      if (maxIdx > Math.round(sessions * 0.20)) continue;

      // Price cannot drop more than 16-20% from the peak in a tight continuation base
      const dropFromPeak = ((t0Close - minClose) / t0Close) * 100;
      if (dropFromPeak > (months >= 8.0 ? 20.0 : 16.0)) continue;

      const baseMax = maxClose;
      const baseMaxDate = formatDateVN(timeSlice[maxIdx]);
      const baseMin = minClose;
      const baseMinDate = formatDateVN(timeSlice[minIdx]);
      const baseStartDate = formatDateVN(timestamps[t0]);

      const maxAllowedTightness = getMaxTightnessAllowed(sessions);
      const tightness = parseFloat((((baseMax - baseMin) / baseMin) * 100).toFixed(1));

      if (tightness <= maxAllowedTightness && price >= minClose) {
        candidates.push({
          method: 'continuation',
          methodName: 'Nền Phẳng Tiếp Diễn',
          baseMin: baseMin,
          baseMax: baseMax,
          baseMinDate: baseMinDate,
          baseMaxDate: baseMaxDate,
          baseStartDate: baseStartDate,
          baseSessions: sessions,
          baseMonths: months,
          baseTightness: tightness,
          hasSpring: false,
          springPrice: null,
          springDate: null,
          score: sessions * 3.0 + (30 - tightness) * 1.5
        });
      }
    }
  }

  let baseResult = null;
  if (candidates.length > 0) {
    candidates.sort((a, b) => b.score - a.score);
    baseResult = candidates[0];
    const classification = classifyBaseType(baseResult, price, high52w, low52w, diffMA50);
    baseResult.method = classification.method;
    baseResult.methodName = classification.methodName;
    baseResult.methodDesc = classification.methodDesc;
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
      baseStartDate: null,
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
    baseStartDate: baseResult.baseStartDate,
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
      s.baseStartDate = tech.baseStartDate;
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
