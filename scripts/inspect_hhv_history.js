const https = require('https');

const to = Math.floor(Date.now() / 1000);
const from = to - (365 * 86400);
const url = `https://iboard-api.ssi.com.vn/statistics/charts/history?symbol=HHV&resolution=D&from=${from}&to=${to}`;

https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    const bars = json.data;
    console.log('Total bars for HHV:', bars.c.length);

    // Print all swing points and recent 120 bars
    const len = bars.c.length;
    console.log('Latest date:', new Date(bars.t[len - 1] * 1000).toLocaleDateString('vi-VN'), 'Close:', bars.c[len - 1]);

    // Let's find index of 12/08/2026
    let idx1208 = -1;
    for (let i = 0; i < len; i++) {
      const d = new Date(bars.t[i] * 1000);
      const ds = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      if (ds === '12/08/2026') idx1208 = i;
    }
    console.log('Index of 12/08/2026:', idx1208);
    if (idx1208 !== -1) {
      console.log('12/08/2026 bar:', {
        open: bars.o[idx1208],
        high: bars.h[idx1208],
        low: bars.l[idx1208],
        close: bars.c[idx1208],
        vol: bars.v[idx1208]
      });
    }

    // Print bars from July 2026 to Nov 2026
    console.log('\n--- BARS FROM 01/07/2026 TO END ---');
    for (let i = 0; i < len; i++) {
      const d = new Date(bars.t[i] * 1000);
      const m = d.getMonth() + 1;
      const y = d.getFullYear();
      if (y === 2026 && m >= 7) {
        const ds = `${String(d.getDate()).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
        console.log(`${ds} (idx ${i}): O=${bars.o[i]}, H=${bars.h[i]}, L=${bars.l[i]}, C=${bars.c[i]}, V=${bars.v[i]}`);
      }
    }
  });
});
