import urllib.request, json, time, os, concurrent.futures

BASE_DIR = r"C:\Users\ADMIN\.gemini\antigravity\scratch\stock-ai-dashboard"
SNAP_PATH = os.path.join(BASE_DIR, "vnstock_snapshot.json")

with open(SNAP_PATH, "r", encoding="utf-8") as f:
    snap = json.load(f)

stocks = snap.get("stocks", {})
symbol_list = list(stocks.keys())
print(f"Bắt đầu đồng bộ 20 phiên khối ngoại cho {len(symbol_list)} mã cổ phiếu...")

def fetch_symbol_foreign(sym):
    url = f'https://cafef.vn/du-lieu/Ajax/PageNew/DataHistory/GDKhoiNgoai.ashx?Symbol={sym}&StartDate=&EndDate=&PageIndex=1&PageSize=20'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://cafef.vn/'})
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            data = json.loads(resp.read().decode('utf-8'))
            items = data.get('Data', {}).get('Data', [])
            if not items:
                return sym, None
            # items: newest first
            nets = [it['GTDGRong'] / 1e9 for it in items]
            
            p1 = round(nets[0], 2)
            p5 = round(sum(nets[:5]), 2)
            p10 = round(sum(nets[:10]), 2)
            p20 = round(sum(nets[:20]), 2)
            
            b5 = sum(1 for x in nets[:5] if x > 0)
            b10 = sum(1 for x in nets[:10] if x > 0)
            b20 = sum(1 for x in nets[:20] if x > 0)
            
            return sym, {
                'foreignNet1P': p1,
                'foreignNet5P': p5,
                'foreignNet10P': p10,
                'foreignNet20P': p20,
                'foreignBuySessions5P': b5,
                'foreignBuySessions10P': b10,
                'foreignBuySessions20P': b20,
                'foreignSessionsCount': len(nets)
            }
    except Exception as e:
        return sym, None

results = {}
with concurrent.futures.ThreadPoolExecutor(max_workers=12) as executor:
    futures = [executor.submit(fetch_symbol_foreign, sym) for sym in symbol_list]
    for fut in concurrent.futures.as_completed(futures):
        sym, res = fut.result()
        if res:
            results[sym] = res

print(f"Đã lấy thành công dữ liệu cho {len(results)}/{len(symbol_list)} mã cổ phiếu.")

# Cập nhật snapshot
for sym, res in results.items():
    st = stocks[sym]
    st['foreignNet1P'] = res['foreignNet1P']
    st['foreignNet5P'] = res['foreignNet5P']
    st['foreignNet10P'] = res['foreignNet10P']
    st['foreignNet20P'] = res['foreignNet20P']
    st['foreignBuySessions5P'] = res['foreignBuySessions5P']
    st['foreignBuySessions10P'] = res['foreignBuySessions10P']
    st['foreignBuySessions20P'] = res['foreignBuySessions20P']

with open(SNAP_PATH, "w", encoding="utf-8") as f:
    json.dump(snap, f, indent=2, ensure_ascii=False)

print("Đã lưu vào vnstock_snapshot.json!")

# In một số mã tiêu biểu
for sym in ['VIX', 'DBC', 'MSN', 'HPG', 'TCB', 'MWG', 'FPT', 'SSI', 'VNM']:
    s = stocks.get(sym, {})
    print(f"{sym:5}: 1P={s.get('foreignNet1P', 0):+7.2f} tỷ | 5P={s.get('foreignNet5P', 0):+8.2f} tỷ ({s.get('foreignBuySessions5P')}/5P) | 10P={s.get('foreignNet10P', 0):+8.2f} tỷ ({s.get('foreignBuySessions10P')}/10P) | 20P={s.get('foreignNet20P', 0):+8.2f} tỷ ({s.get('foreignBuySessions20P')}/20P)")
