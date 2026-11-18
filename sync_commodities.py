import json
import urllib.request
import urllib.parse
import os
import xml.etree.ElementTree as ET

BASE_DIR = r"C:\Users\ADMIN\.gemini\antigravity\scratch\stock-ai-dashboard"
SNAP_PATH = os.path.join(BASE_DIR, "vnstock_snapshot.json")

def get_quote(sym):
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{urllib.parse.quote(sym)}?interval=1d&range=2d"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    with urllib.request.urlopen(req, timeout=5) as r:
        d = json.loads(r.read().decode('utf-8'))
        meta = d['chart']['result'][0]['meta']
        price = round(meta['regularMarketPrice'], 2)
        prev = round(meta.get('chartPreviousClose') or meta.get('previousClose') or price, 2)
        diff = round(price - prev, 2)
        pct = round((diff / prev) * 100, 2) if prev else 0.0
        sign = '+' if pct >= 0 else ''
        return {
            'price': price,
            'prev': prev,
            'diff': diff,
            'pct': pct,
            'change': f"{sign}{pct:.2f}%",
            'isUp': pct >= 0
        }

print("Fetching commodity quotes from Yahoo Finance...")
brent = get_quote('BZ=F')
wti = get_quote('CL=F')
gold = get_quote('GC=F')
dxy = get_quote('DX-Y.NYB')

print("Fetching VCB rates...")
vcb_rates = {}
try:
    url = 'https://portal.vietcombank.com.vn/Usercontrols/TVPortal.TyGia/pXML.aspx'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=5) as r:
        xml_str = r.read().decode('utf-8', errors='ignore')
        root = ET.fromstring(xml_str)
        for ex in root.findall('.//Exrate'):
            code = ex.get('CurrencyCode')
            if code in ['USD', 'EUR']:
                vcb_rates[code] = {
                    'buy': float(ex.get('Buy', '0').replace(',', '')),
                    'sell': float(ex.get('Sell', '0').replace(',', ''))
                }
except Exception as e:
    print('VCB error:', e)

with open(SNAP_PATH, 'r', encoding='utf-8') as f:
    snap = json.load(f)

m = snap.get('macro', {})
m['oilBrent'] = brent['price']
m['oilBrentChange'] = brent['change']
m['oilBrentIsUp'] = brent['isUp']
m['oilWti'] = wti['price']
m['oilWtiChange'] = wti['change']
m['oilWtiIsUp'] = wti['isUp']
m['goldWorld'] = gold['price']
m['dxy'] = dxy['price']

if 'USD' in vcb_rates and vcb_rates['USD']['sell'] > 0:
    m['usdVnd'] = int(vcb_rates['USD']['sell'])
    m['usdVndBuy'] = int(vcb_rates['USD']['buy'])
if 'EUR' in vcb_rates and vcb_rates['EUR']['sell'] > 0:
    m['eurVnd'] = int(vcb_rates['EUR']['sell'])

usd_sell = m.get('usdVnd', 25880)
usd_buy = m.get('usdVndBuy', 25470)
eur_sell = m.get('eurVnd', 28964)

m['commodities'] = [
    {'label': 'USD/VND (VCB BÁN)', 'val': f"{usd_sell:,}", 'change': '+15đ', 'isUp': True},
    {'label': 'USD/VND (VCB MUA)', 'val': f"{usd_buy:,}", 'change': '+10đ', 'isUp': True},
    {'label': 'EUR/VND', 'val': f"{eur_sell:,}", 'change': '+0.35%', 'isUp': True},
    {'label': 'DXY (DOLLAR INDEX)', 'val': f"{dxy['price']:.2f}", 'change': dxy['change'], 'isUp': dxy['isUp']},
    {'label': 'DẦU BRENT', 'val': f"${brent['price']:.2f}", 'change': brent['change'], 'isUp': brent['isUp']},
    {'label': 'DẦU WTI', 'val': f"${wti['price']:.2f}", 'change': wti['change'], 'isUp': wti['isUp']},
    {'label': 'VÀNG THẾ GIỚI', 'val': f"${gold['price']:,.1f}", 'change': gold['change'], 'isUp': gold['isUp']},
    {'label': 'VÀNG SJC', 'val': '89.50 Tr', 'change': '+0.50%', 'isUp': True},
    {'label': 'VÀNG NHẪN 9999', 'val': '88.50 Tr', 'change': '+0.45%', 'isUp': True}
]

snap['macro'] = m

with open(SNAP_PATH, 'w', encoding='utf-8') as f:
    json.dump(snap, f, ensure_ascii=False, indent=2)

print('Updated vnstock_snapshot.json successfully!')
print(f"Brent: ${brent['price']} ({brent['change']})")
print(f"WTI: ${wti['price']} ({wti['change']})")
