const fs = require('fs');
const https = require('https');
const path = require('path');

const snapshotPath = path.join(__dirname, '..', 'vnstock_snapshot.json');
const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
const symbols = Object.keys(snapshot.stocks);

console.log(`Starting Technical & Base computation for ${symbols.length} stocks (Comprehensive Long-term & Non-mechanical)...`);

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

// Dynamic Tightness Threshold based on accumulation time
function getMaxTightnessAllowed(sessions) {
  const months = sessions / 21;
  if (months >= 8.0) return 25.0; // >= 8 tháng: cho phép đến 25% (nền lớn Wyckoff)
  if (months >= 6.0) return 23.5; // 6 - 8 tháng: cho phép đến 23.5%
  if (months >= 3.0) return 22.0; // 3 - 6 tháng: cho phép đến 22% (phù hợp thị trường VN)
  return 20.0;                    // dưới 3 tháng: cho phép đến 20%
}

function classifyBaseType(base, price, high52w, low52w, diffMA50) {
  const diffToHigh52w = ((high52w - price) / high52w) * 100;
  const diffToLow52w = ((price - low52w) / low52w) * 100;

  // 1. NỀN TÁI TÍCH LŨY LỚN (Major Re-accumulation Base: >= 6 tháng và đã hồi phục đáng kể từ đáy 52T)
  if (base.baseMonths >= 6.0 && diffToLow52w >= 15.0 && diffMA50 >= -4.0) {
    let springDesc = '';
    if (base.hasSpring) {
      springDesc = `, có nhịp rũ bỏ quét râu (Spring) ngày ${base.springDate} về ${formatPriceK(base.springPrice)} với lực cầu hấp thụ mạnh`;
    }
    return {
      method: 'reaccumulation',
      methodName: 'Nền Tái Tích Lũy',
      methodDesc: `Cổ phiếu đã bứt phá thoát đáy thành công (+${diffToLow52w.toFixed(1)}% từ đáy 52T) và đang hình thành một cấu trúc tái tích lũy lớn kênh trên ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng (${base.baseSessions} phiên) từ ngày ${base.baseStartDate}${springDesc}, hiện đang siết chặt ở nửa trên chiếc hộp quanh MA50 để chuẩn bị cho chu kỳ bứt phá mới.`
    };
  }

  // 2. NỀN PHẲNG TIẾP DIỄN (Continuation Flat Base)
  // Phải ở kênh trên (cách đỉnh 52 tuần <= 15%) VÀ giữ được MA50 (diffMA50 >= -3.0%)
  if (diffToHigh52w <= 15.0 && diffMA50 >= -3.0) {
    return {
      method: 'continuation',
      methodName: 'Nền Phẳng Tiếp Diễn',
      methodDesc: `Cổ phiếu đang vận động tích lũy ở kênh trên sát vùng đỉnh 52 tuần (${formatPriceK(high52w)}, cách đỉnh ${diffToHigh52w.toFixed(1)}%) và giữ vững trên MA50 (+${diffMA50}%), hình thành chiếc hộp tiếp diễn ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng từ ngày ${base.baseStartDate} để hấp thụ lượng cung chốt lời tiếp tục xu hướng tăng.`
    };
  }

  // 3. NỀN TÁI TÍCH LŨY KÊNH GIỮA (Mid-channel Re-accumulation Base)
  // Đã bứt phá thoát đáy (> 20% từ đáy 52 tuần) nhưng chưa tới đỉnh (> 15% từ đỉnh), đi ngang kênh giữa
  if (diffToLow52w >= 20.0 && diffToHigh52w > 15.0 && diffMA50 >= -4.5) {
    let patternNote = '';
    if (base.isDoubleBottom) {
      patternNote = ` với mô hình Hai Đáy kiểm định vững chắc`;
    } else if (base.isAscendingBase) {
      patternNote = ` với cấu trúc Nâng Đáy vững chắc (Higher Lows)`;
    }
    let springDesc = '';
    if (base.hasSpring) {
      springDesc = `, xuất hiện nhịp rũ bỏ quét đáy (Spring) ngày ${base.springDate} về ${formatPriceK(base.springPrice)} với lực cầu hấp thụ mạnh`;
    }
    return {
      method: 'reaccumulation',
      methodName: 'Nền Tái Tích Lũy',
      methodDesc: `Cổ phiếu đã bứt phá thoát đáy thành công (+${diffToLow52w.toFixed(1)}% từ đáy 52T) và đang hình thành chiếc hộp tái tích lũy kênh giữa${patternNote} ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng (${base.baseSessions} phiên) từ ngày ${base.baseStartDate}${springDesc} để hấp thụ lượng cung lơ lửng trước khi tiến về đỉnh cũ.`
    };
  }

  // 4. NỀN TẠO ĐÁY (Bottom Reversal / Accumulation Base)
  // Nhận diện đặc thù theo mẫu hình hành động giá (Price Action Pattern)
  if (base.isDoubleBottom) {
    return {
      method: 'bottom',
      methodName: 'Nền Tạo Đáy',
      methodDesc: `Cổ phiếu hình thành mô hình Hai Đáy (Double Bottom) vững chắc với Đáy 1 ngày ${base.baseStartDate} và Đáy 2 ngày ${base.baseMinDate}, vận động siết chặt trong chiếc hộp ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng (${base.baseSessions} phiên), kiểm định đáy thành công và giữ vững cấu trúc tích lũy.`
    };
  }

  if (base.isAscendingBase) {
    return {
      method: 'bottom',
      methodName: 'Nền Tạo Đáy',
      methodDesc: `Cổ phiếu hình thành cấu trúc Nâng Đáy tích cực (Higher Lows) từ Đáy 1 ngày ${base.baseStartDate} đến Đáy 2 ngày ${base.baseMinDate}, vận động siết chặt trong biên độ ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng (${base.baseSessions} phiên), dòng tiền thông minh chủ động nâng dần giá gom hàng.`
    };
  }

  let springDesc = '';
  if (base.hasSpring) {
    springDesc = base.springDate === base.baseStartDate
      ? `, có cú rũ bỏ Spring quét râu về ${formatPriceK(base.springPrice)} (ngày ${base.springDate}) kèm volume hấp thụ đột biến rồi rút chân đóng cửa tại ${formatPriceK(base.baseMin)}`
      : `, có nhịp rũ bỏ quét đáy (Spring) ngày ${base.springDate} về ${formatPriceK(base.springPrice)} rồi bật tăng mạnh trở lại kênh trên`;
  }
  return {
    method: 'bottom',
    methodName: 'Nền Tạo Đáy',
    methodDesc: `Cổ phiếu tích lũy gom hàng đảo chiều sau nhịp giảm sâu từ vùng đáy ngày ${base.baseStartDate || base.baseMinDate}${springDesc}, vận động siết chặt trong chiếc hộp ${formatPriceK(base.baseMin)} - ${formatPriceK(base.baseMax)} (${base.baseTightness}%) kéo dài ${base.baseMonths} tháng (${base.baseSessions} phiên), giữ vững cấu trúc tích lũy chuẩn bị bứt phá.`
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

  // METHOD 1: Trough-anchored Base (Starting at reversal trough T0, Spring / Double Bottom / Higher Lows)
  for (let t0 = Math.max(0, len - 240); t0 <= len - 18; t0++) {
    const t0Close = closesVND[t0];
    const t0Low = lowsVND[t0];

    // Local trough check: t0 is lowest in [t0-2, t0+2] either by close or by intraday low
    let isTroughClose = true, isTroughLow = true;
    for (let r = Math.max(0, t0 - 2); r <= Math.min(len - 1, t0 + 2); r++) {
      if (closesVND[r] < t0Close) isTroughClose = false;
      if (lowsVND[r] < t0Low) isTroughLow = false;
    }
    if (!isTroughClose && !isTroughLow) continue;

    const baseSlice = closesVND.slice(t0);
    const lowSlice = lowsVND.slice(t0);
    const timeSlice = timestamps.slice(t0);
    const sessions = baseSlice.length;
    const months = parseFloat((sessions / 21).toFixed(1));

    let minClose = Infinity, minIdx = -1;
    let maxClose = -Infinity, maxIdx = -1;
    let minLow = Infinity, minLowIdx = -1;

    for (let i = 0; i < baseSlice.length; i++) {
      if (baseSlice[i] < minClose) {
        minClose = baseSlice[i];
        minIdx = i;
      }
      if (baseSlice[i] > maxClose) {
        maxClose = baseSlice[i];
        maxIdx = i;
      }
      if (lowSlice[i] < minLow) {
        minLow = lowSlice[i];
        minLowIdx = i;
      }
    }

    // Identify Price Action Pattern:
    // 1. Double Bottom: Subsequent retest low (minLowIdx >= 12) holds t0Low within 2.5%
    const isDoubleBottom = (minLowIdx >= 12 && minLow >= t0Low * 0.975);

    // 2. Ascending Base (Higher Lows): Subsequent retest low is higher than t0Low
    const isAscendingBase = (minLowIdx >= 12 && minLow >= t0Low * 1.01);

    // Breakdown Check (Non-mechanical):
    // True breakdown only if price collapses severely below t0Low without recovery
    let isBreakdown = false;
    const dipLimit = months >= 8.0 ? 8.0 : (months >= 6.0 ? 7.0 : (months >= 3.0 ? 6.0 : 4.5));
    const dipPct = ((t0Low - minLow) / t0Low) * 100;

    if (!isDoubleBottom && !isAscendingBase) {
      if (dipPct > dipLimit) isBreakdown = true;

      // Count consecutive bars closing meaningfully below t0Close (> 2% below t0Close)
      let consecutiveBelow = 0, maxConsecutiveBelow = 0;
      for (let k = 0; k < baseSlice.length; k++) {
        if (baseSlice[k] < t0Close * 0.98) {
          consecutiveBelow++;
          if (consecutiveBelow > maxConsecutiveBelow) maxConsecutiveBelow = consecutiveBelow;
        } else {
          consecutiveBelow = 0;
        }
      }
      const allowedConsecutive = months >= 8.0 ? 12 : (months >= 6.0 ? 9 : (months >= 3.0 ? 7 : 5));
      if (maxConsecutiveBelow > allowedConsecutive) isBreakdown = true;

      // Spring validation: If minClose < t0Close, price must have formed a reaction rally before dipping
      if (minIdx > 0 && ((t0Close - minClose) / t0Close) * 100 > 0.05) {
        const maxBeforeMin = Math.max(...baseSlice.slice(0, minIdx));
        if (maxBeforeMin < t0Close * 1.03) {
          isBreakdown = true;
        }
      }
    } else {
      // In Double Bottom or Ascending Base, price respects the support zone
      if (dipPct > 5.0) isBreakdown = true;
    }

    if (isBreakdown) continue;

    // Detect Spring Shakeout
    let hasSpring = false;
    let springPrice = null;
    let springDate = null;
    let isIntradaySpringAtT0 = false;

    if (minIdx > 0 && minClose < t0Close * 0.99) {
      hasSpring = true;
      springPrice = minClose;
      springDate = formatDateVN(timeSlice[minIdx]);
    } else if (lowsVND[t0] < t0Close * 0.95) {
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
    const baseMinDate = formatDateVN(timeSlice[minIdx]);
    const baseMax = maxClose;
    const baseMaxDate = formatDateVN(timeSlice[maxIdx]);
    const baseStartDate = formatDateVN(timestamps[t0]);

    const maxAllowedTightness = getMaxTightnessAllowed(sessions);
    const tightness = parseFloat((((baseMax - baseMin) / baseMin) * 100).toFixed(1));

    if (tightness <= maxAllowedTightness && price >= baseMin * 0.97) {
      // Long-term Vision Scoring:
      // Reward well-established multi-month bases that provide large upside potential
      let longTermBonus = 0;
      if (months >= 8.0) longTermBonus += 80;
      else if (months >= 6.0) longTermBonus += 60;
      else if (months >= 3.0) longTermBonus += 35;

      if (isDoubleBottom) longTermBonus += 40;
      if (isAscendingBase) longTermBonus += 50;

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
        isDoubleBottom,
        isAscendingBase,
        score: sessions * 3.5 + (30 - tightness) * 1.5 + longTermBonus
      });
    }
  }

  // METHOD 2: Continuation Flat Base (High Tight Box starting at peak T0)
  // STRICT RULE: Only applicable if stock is in the upper cycle (diffToHigh52w <= 22.0% AND diffMA50 >= -3.5%)
  if (diffToHigh52w <= 22.0 && diffMA50 >= -3.5) {
    for (let t0 = Math.max(0, len - 240); t0 <= len - 18; t0++) {
      const t0Close = closesVND[t0];
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
        if (baseSlice[i] < minClose) { minClose = baseSlice[i]; minIdx = i; }
        if (baseSlice[i] > maxClose) { maxClose = baseSlice[i]; maxIdx = i; }
      }

      if (maxIdx > Math.round(sessions * 0.25)) continue;

      // Price cannot drop more than allowed from the peak
      const dropFromPeak = ((t0Close - minClose) / t0Close) * 100;
      if (dropFromPeak > (months >= 8.0 ? 22.0 : (months >= 6.0 ? 20.0 : 17.0))) continue;

      const baseMax = maxClose;
      const baseMaxDate = formatDateVN(timeSlice[maxIdx]);
      const baseMin = minClose;
      const baseMinDate = formatDateVN(timeSlice[minIdx]);
      const baseStartDate = formatDateVN(timestamps[t0]);

      const maxAllowedTightness = getMaxTightnessAllowed(sessions);
      const tightness = parseFloat((((baseMax - baseMin) / baseMin) * 100).toFixed(1));

      if (tightness <= maxAllowedTightness && price >= minClose * 0.98) {
        let longTermBonus = months >= 6.0 ? 60 : (months >= 3.0 ? 30 : 0);
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
          isDoubleBottom: false,
          isAscendingBase: false,
          score: sessions * 3.5 + (30 - tightness) * 1.5 + longTermBonus
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
    // No valid base found
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
      methodDesc: `Cổ phiếu đang trong nhịp biến động lớn hoặc tìm đáy mới, chưa hình thành vùng nền tích lũy siết chặt đạt chuẩn (độ biến động ${tightness}% > 20%).`,
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

async function runAll() {
  let successCount = 0;
  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i];
    try {
      const bars = await fetchHistory(symbol);
      if (!bars || !bars.c || bars.c.length === 0) {
        console.warn(`[${i+1}/${symbols.length}] ${symbol}: No bar data`);
        continue;
      }
      const currentPriceVND = snapshot.stocks[symbol]?.price || Math.round(bars.c[bars.c.length - 1] * 1000);
      const res = analyzeStockTechnical(bars, currentPriceVND, symbol);
      if (res) {
        Object.assign(snapshot.stocks[symbol], res);
        successCount++;
      }
      if ((i + 1) % 20 === 0 || i === symbols.length - 1) {
        console.log(`Processed ${i + 1} / ${symbols.length} stocks...`);
      }
    } catch (err) {
      console.error(`Error processing ${symbol}:`, err.message);
    }
  }

  fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2), 'utf8');
  console.log(`Successfully computed and saved ${successCount} / ${symbols.length} stocks!`);
}

runAll();
