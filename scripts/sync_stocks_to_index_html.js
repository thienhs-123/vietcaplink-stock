const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const snapPath = path.join(__dirname, '..', 'vnstock_snapshot.json');

const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
const content = fs.readFileSync(indexPath, 'utf8');

const regex = /stocks:\s*\r?\n(\[[\s\S]*?\r?\n\])\r?\n\s*\};/;
const match = content.match(regex);
if (!match) {
  console.error('Cannot find stocks array in index.html');
  process.exit(1);
}

const stocksList = JSON.parse(match[1]);
console.log(`Loaded ${stocksList.length} stocks from index.html`);

// Merge updated properties from snapshot
stocksList.forEach(st => {
  const incoming = snap.stocks[st.symbol];
  if (incoming) {
    st.price = incoming.price || st.price;
    st.change = incoming.change !== undefined ? incoming.change : st.change;
    st.volume = incoming.volume || st.volume;
    if (incoming.pe) st.pe = incoming.pe;
    if (incoming.pb) st.pb = incoming.pb;
    if (incoming.roe) st.roe = incoming.roe;
    if (incoming.eps) st.eps = incoming.eps;
    if (incoming.profitGrowth !== undefined) st.profitGrowth = incoming.profitGrowth;
    if (incoming.revGrowth !== undefined) st.revGrowth = incoming.revGrowth;
    if (incoming.marketCapTỷ) st.marketCapTỷ = incoming.marketCapTỷ;

    st.ma10 = incoming.ma10;
    st.ma50 = incoming.ma50;
    st.diffMA10 = incoming.diffMA10;
    st.diffMA50 = incoming.diffMA50;
    st.aboveMA10_50 = incoming.aboveMA10_50;

    st.baseSessions = incoming.baseSessions;
    st.baseMonths = incoming.baseMonths;
    st.baseTightness = incoming.baseTightness;
    st.baseMin = incoming.baseMin;
    st.baseMax = incoming.baseMax;
    st.baseMinDate = incoming.baseMinDate;
    st.baseMaxDate = incoming.baseMaxDate;
    st.baseMethod = incoming.baseMethod;
    st.baseMethodName = incoming.baseMethodName;
    st.baseMethodDesc = incoming.baseMethodDesc;
    st.baseHasSpring = incoming.baseHasSpring;
    st.baseMid = incoming.baseMid;
    st.baseUpperHalf = incoming.baseUpperHalf;
    st.baseValid = incoming.baseValid;
  }
});

const newJsonStr = JSON.stringify(stocksList, null, 2);
const newContent = content.slice(0, match.index) + `stocks: \n${newJsonStr}\n    };` + content.slice(match.index + match[0].length);

fs.writeFileSync(indexPath, newContent, 'utf8');
console.log('Successfully synchronized StockApp.stocks into index.html');
