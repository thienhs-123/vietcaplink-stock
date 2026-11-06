# HƯỚNG DẪN LÀM VIỆC Ở NHÀ VỚI DỰ ÁN VIETCAPLINK STOCK AI DASHBOARD
*(Cập nhật ngày 06/11/2026 - Tự động đồng bộ sang Google Drive `J:\`)*

---

## 1. CẤU TRÚC DỮ LIỆU ĐÃ ĐƯỢC CHUYỂN SANG Ổ J:\

Toàn bộ dự án và lịch sử cuộc hội thoại AI đã được sao chép và đồng bộ hoàn chỉnh sang Google Drive cá nhân của bạn tại ổ **`J:\`**:

| Đường dẫn trên ổ J:\ | Mô tả nội dung |
| :--- | :--- |
| **`J:\My Drive\stock-ai-dashboard\`** | **Thư mục mã nguồn chính của dự án:** Bao gồm file giao diện `index.html`, server realtime `realtime_server.py`, dữ liệu `vnstock_snapshot.json`, các script tự động hóa và đầy đủ lịch sử Git repository (`.git`). |
| **`J:\My Drive\antigravity_conversation_f6e7e92d\`** | **Toàn bộ dữ liệu cuộc hội thoại Antigravity:** Chứa 2.714 file bao gồm lịch sử chat (`transcript.jsonl`), tất cả các artifact phân tích tài chính/kỹ thuật, hình ảnh đính kèm và log xử lý. |
| **`J:\My Drive\Vietcaplink_Workspace\`** | **Thư mục tổng hợp (Master Workspace):** Gom cả 2 thư mục trên vào một nơi để bạn dễ dàng quản lý, nén sao lưu hoặc di chuyển sang máy tính khác. |

---

## 2. HƯỚNG DẪN CHẠY VÀ LÀM VIỆC Ở NHÀ

### Cách 1: Mở Dashboard xem trực tiếp (Không cần cài đặt)
1. Trên máy tính ở nhà, mở Google Drive và truy cập thư mục:
   `J:\My Drive\stock-ai-dashboard` (hoặc `J:\My Drive\Vietcaplink_Workspace\stock-ai-dashboard`)
2. Click đúp vào file **`index.html`** để mở ngay trên trình duyệt (Chrome, Edge, Brave, Cốc Cốc).
3. Dashboard sẽ tự động kết nối nguồn dữ liệu sàn chứng khoán trực tiếp SSI qua giao thức CORS và cập nhật giá thời gian thực mỗi 1 phút/lần.

### Cách 2: Chạy Server Python Realtime (Vnstock Local Bridge)
Nếu bạn muốn máy tính ở nhà vừa chạy server nén Gzip, vừa đồng bộ trực tiếp BCTC từ thư viện Vnstock:
1. Mở PowerShell hoặc Command Prompt tại thư mục:
   ```powershell
   cd "J:\My Drive\stock-ai-dashboard"
   ```
2. Chạy file batch khởi động nhanh:
   ```cmd
   start_realtime.bat
   ```
   *(Hoặc gõ lệnh: `python realtime_server.py`)*
3. Server sẽ mở tại `http://localhost:8088`, tự động phục vụ dữ liệu cho Dashboard.

---

## 3. ĐỒNG BỘ MÃ NGUỒN VỚI GITHUB
Thư mục `stock-ai-dashboard` trên ổ `J:\` đã có sẵn liên kết Git với kho lưu trữ từ xa:
- **Remote URL:** `https://github.com/thienhs-123/vietcaplink-stock.git`
- **Branch:** `main`

Khi bạn sửa đổi code ở nhà và muốn đẩy lên GitHub:
- Click đúp vào file **`push_to_github.bat`**
- Hoặc dùng lệnh Git:
  ```powershell
  cd "J:\My Drive\stock-ai-dashboard"
  git add .
  git commit -m "Update from home workstation"
  git push origin main
  ```

---

## 4. CÁCH KHÔI PHỤC NGỮ CẢNH CUỘC HỘI THOẠI VÀO ANTIGRAVITY TRÊN MÁY Ở NHÀ
Nếu trên máy tính ở nhà bạn có cài đặt **Antigravity AI (IDE / CLI)**:
1. Mở thư mục người dùng cá nhân trên máy ở nhà:
   `C:\Users\<Tên_User_Ở_Nhà>\.gemini\antigravity\brain\`
2. Sao chép toàn bộ thư mục `antigravity_conversation_f6e7e92d` từ ổ `J:\` vào đường dẫn trên và đổi tên thành:
   `f6e7e92d-c6ed-4fbe-9e74-04897dc40f83`
3. Khi bạn mở Antigravity lên, toàn bộ lịch sử trao đổi, các bộ lọc đã build, biểu đồ và artifact của phiên làm việc hôm nay sẽ được khôi phục 100% nguyên vẹn để tiếp tục tương tác.
