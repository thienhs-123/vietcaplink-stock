import os
import sys
import json
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SNAPSHOT_FILE = os.path.join(BASE_DIR, "vnstock_snapshot.json")

TRACKED_SYMBOLS = [
    "ACB","BCM","BID","BVH","CTG","FPT","GAS","GVR","HDB","HPG",
    "MBB","MSN","MWG","PLX","POW","SAB","SHB","SSB","SSI","STB",
    "TCB","TPB","VCB","VHM","VIB","VIC","VJC","VNM","VPB","VRE",
    "VND","VCI","HCM","FTS","BSI","CTS","VIX","ORS","AGR","LPB",
    "EIB","MSB","OCB","NAB","NKG","HSG","VGS","KSB","HT1","NVL",
    "DIG","PDR","DXG","KDH","NLG","TCH","HDG","CEO","DXS","KBC",
    "IDC","VGC","SZC","PHR","DPR","FRT","DGW","PET","PNJ","CTR",
    "ELC","DGC","DCM","DPM","BFC","CSV","DBC","BAF","PVD","PVS",
    "PVT","BSR","GMD","HAH","VOS","REE","GEG","PC1","VCG","HHV",
    "LCG","FCN","CII","VHC","ANV","TNG","MSH","GIL","PTB","HAX"
]

def fetch_stock_bctc(sym):
    url = f"https://apiweb.cafef.vn/api/v1/BCTC/GetReportSummary?symbol={sym}&pageIndex=1&pageSize=8&reportType=KQKD&TypeTime=QUY"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=10) as r:
            val = json.loads(r.read().decode('utf-8'))['value']
            if not val or not val.get('data') or not val['data'][0].get('data'):
                return sym, None
            quarters = val['data'][0]['data']
            template = val.get('templace', [{}])[0].get('data', [])
            temp_map = {t.get('code'): t.get('name', '') for t in template}

            q_map = {}
            for d in quarters:
                data_items = d.get('data', [])

                # 1. Doanh thu thuần
                rev_val = 0
                for c in ['KQKD_2', 'KQKD_1', '01', '02', '21']:
                    it = next((x for x in data_items if x.get('code') == c), None)
                    if it and it.get('value', 0) != 0:
                        rev_val = it['value']
                        break
                if rev_val == 0:
                    for it in data_items:
                        n = temp_map.get(it.get('code'), '').lower()
                        if ('doanh thu thuần' in n or 'thu nhập lãi thuần' in n or 'doanh thu hoạt động' in n or 'kinh doanh bảo hiểm' in n) and it.get('value', 0) != 0:
                            rev_val = it['value']
                            break

                # 2. Lợi nhuận sau thuế
                profit_val = 0
                for c in ['KQKD_13', 'KQKD_14', 'KQKD_18', 'KQKD_17', 'KQKD_10', 'KQKD_9', '60', '61']:
                    it = next((x for x in data_items if x.get('code') == c), None)
                    if it:
                        n = temp_map.get(c, '').lower()
                        if 'khác' not in n and it.get('value', 0) != 0:
                            profit_val = it['value']
                            break
                if profit_val == 0:
                    for it in data_items:
                        n = temp_map.get(it.get('code'), '').lower()
                        if ('lợi nhuận sau thuế' in n or 'lnst' in n) and 'khác' not in n and it.get('value', 0) != 0:
                            profit_val = it['value']
                            break

                y = d.get('year', 0)
                q = d.get('quater', 0)
                q_map[(y, q)] = {
                    'year': y,
                    'quarter': q,
                    'label': f"Q{q}/{y}",
                    'rev': round(rev_val / 1e9, 1),
                    'profit': round(profit_val / 1e9, 1)
                }

            sorted_qs = sorted(q_map.values(), key=lambda x: (x['year'], x['quarter']))
            if not sorted_qs:
                return sym, None

            latest = sorted_qs[-1]
            prev_year = latest['year'] - 1
            same_q_last_year = next((item for item in sorted_qs if item['year'] == prev_year and item['quarter'] == latest['quarter']), None)

            profit_growth = 0.0
            rev_growth = 0.0
            if same_q_last_year:
                if same_q_last_year['profit'] != 0:
                    profit_growth = round(((latest['profit'] - same_q_last_year['profit']) / abs(same_q_last_year['profit'])) * 100, 1)
                if same_q_last_year['rev'] != 0:
                    rev_growth = round(((latest['rev'] - same_q_last_year['rev']) / abs(same_q_last_year['rev'])) * 100, 1)

            # Cap growth between -999% and 9999%
            if profit_growth > 9999: profit_growth = 9999.0
            if profit_growth < -999: profit_growth = -999.0
            if rev_growth > 9999: rev_growth = 9999.0
            if rev_growth < -999: rev_growth = -999.0

            last_4 = sorted_qs[-4:] if len(sorted_qs) >= 4 else sorted_qs

            return sym, {
                'latestQuarter': latest['label'],
                'latestRev': latest['rev'],
                'latestProfit': latest['profit'],
                'profitGrowth': profit_growth,
                'revGrowth': rev_growth,
                'prevRev': same_q_last_year['rev'] if same_q_last_year else 0.0,
                'prevProfit': same_q_last_year['profit'] if same_q_last_year else 0.0,
                'quarterLabels': [item['label'] for item in last_4],
                'quarterlyRevenue': [item['rev'] for item in last_4],
                'quarterlyProfit': [item['profit'] for item in last_4],
                'ttmProfit': round(sum(item['profit'] for item in last_4), 1),
                'ttmRevenue': round(sum(item['rev'] for item in last_4), 1)
            }
    except Exception as e:
        return sym, None

def sync_all_financials():
    print(f"🚀 Bắt đầu đồng bộ Kết quả kinh doanh quý gần nhất & 8 quý BCTC cho {len(TRACKED_SYMBOLS)} mã...")
    t0 = time.time()
    results = {}
    with ThreadPoolExecutor(max_workers=15) as ex:
        for sym, data in ex.map(fetch_stock_bctc, TRACKED_SYMBOLS):
            if data:
                results[sym] = data

    print(f"✅ Đã nạp thành công BCTC quý gần nhất chuẩn xác cho {len(results)}/{len(TRACKED_SYMBOLS)} mã trong {round(time.time() - t0, 2)} giây!")

    # Merge into vnstock_snapshot.json
    if os.path.exists(SNAPSHOT_FILE):
        try:
            with open(SNAPSHOT_FILE, "r", encoding="utf-8") as f:
                snapshot = json.load(f)

            stocks = snapshot.get("stocks", {})
            for sym, data in results.items():
                if sym in stocks:
                    stocks[sym].update(data)
                else:
                    stocks[sym] = data

            snapshot["stocks"] = stocks
            snapshot["bctc_last_synced"] = time.strftime("%Y-%m-%d %H:%M:%S")

            with open(SNAPSHOT_FILE, "w", encoding="utf-8") as f:
                json.dump(snapshot, f, ensure_ascii=False, indent=2)
            print(f"💾 Đã lưu dữ liệu BCTC vào {SNAPSHOT_FILE}")
        except Exception as e:
            print(f"❌ Lỗi khi cập nhật snapshot: {e}")

    # Output JSON bundle for frontend
    bundle_path = os.path.join(BASE_DIR, "financials_real_quarterly.json")
    with open(bundle_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"💾 Đã xuất file tổng hợp: {bundle_path}")

    return results

if __name__ == '__main__':
    sync_all_financials()
