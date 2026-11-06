const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
const snapPath = path.join(__dirname, '..', 'vnstock_snapshot.json');

const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
const content = fs.readFileSync(indexPath, 'utf8');

const startTag = 'stocks: \n[';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) {
  console.error('Cannot find startTag');
  process.exit(1);
}

const endTag = '\n]\n    };';
const endIdx = content.indexOf(endTag, startIdx);
if (endIdx === -1) {
  console.error('Cannot find endTag');
  process.exit(1);
}

const originalJsonStr = content.slice(startIdx + 'stocks: \n'.length, endIdx + 2);
const stocksList = JSON.parse(originalJsonStr);
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
    st.baseMid = incoming.baseMid;
    st.baseUpperHalf = incoming.baseUpperHalf;
    st.baseValid = incoming.baseValid;
  }
});

const newJsonStr = JSON.stringify(stocksList, null, 2);
const newContent = content.slice(0, startIdx + 'stocks: \n'.length) + newJsonStr + content.slice(endIdx + 2);

fs.writeFileSync(indexPath, newContent, 'utf8');
console.log('Successfully synchronized StockApp.stocks into index.html');
