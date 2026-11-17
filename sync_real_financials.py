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
    url = f"https://apiweb.cafef.vn/api/v1/BCTC/GetReportSummary?symbol={sym}&pageIndex=1&pageSize=4&reportType=KQKD&TypeTime=QUY"
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        with urllib.request.urlopen(req, timeout=8) as r:
            val = json.loads(r.read().decode('utf-8'))['value']
            if not val or not val.get('data') or not val['data'][0].get('data'):
                return sym, None
            
            quarters = val['data'][0]['data']
            quarters_sorted = sorted(quarters, key=lambda x: (x.get('year', 0), x.get('quater', 0)))
            
            # Map code to template name
            template = val.get('templace', [{}])[0].get('data', [])
            temp_map = {t.get('code'): t.get('name', '') for t in template}

            labels = []
            revs = []
            profits = []

            for q in quarters_sorted:
                time_lbl = q.get('time') or f"Q{q.get('quater')}-{q.get('year')}"
                labels.append(time_lbl)
                data_items = q.get('data', [])

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
                        if ('doanh thu thuần' in n or 'thu nhập lãi thuần' in n) and it.get('value', 0) != 0:
                            rev_val = it['value']
                            break

                # 2. Lợi nhuận sau thuế
                profit_val = 0
                for c in ['KQKD_13', 'KQKD_14', 'KQKD_18', 'KQKD_17', 'KQKD_10', 'KQKD_9', '60', '61']:
                    it = next((x for x in data_items if x.get('code') == c), None)
                    if it:
                        n = temp_map.get(c, '').lower()
                        # Ensure it's not "lợi nhuận khác"
                        if 'khác' not in n and it.get('value', 0) != 0:
                            profit_val = it['value']
                            break

                if profit_val == 0:
                    for it in data_items:
                        n = temp_map.get(it.get('code'), '').lower()
                        if ('lợi nhuận sau thuế' in n or 'lnst' in n) and 'khác' not in n and it.get('value', 0) != 0:
                            profit_val = it['value']
                            break

                revs.append(round(rev_val / 1e9, 1))
                profits.append(round(profit_val / 1e9, 1))

            return sym, {
                'quarterLabels': labels,
                'quarterlyRevenue': revs,
                'quarterlyProfit': profits,
                'latestRev': revs[-1] if revs else 0,
                'latestProfit': profits[-1] if profits else 0,
                'ttmProfit': round(sum(profits), 1),
                'ttmRevenue': round(sum(revs), 1)
            }
    except Exception as e:
        return sym, None

def sync_all_financials():
    print(f"🚀 Bắt đầu đồng bộ Báo cáo tài chính 4 quý từ nguồn chính thức cho {len(TRACKED_SYMBOLS)} mã...")
    t0 = time.time()
    results = {}
    with ThreadPoolExecutor(max_workers=10) as ex:
        for sym, data in ex.map(fetch_stock_bctc, TRACKED_SYMBOLS):
            if data:
                results[sym] = data

    print(f"✅ Đã nạp thành công BCTC 4 quý chuẩn xác cho {len(results)}/{len(TRACKED_SYMBOLS)} mã trong {round(time.time() - t0, 2)} giây!")

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
