# 📘 CẨM NANG HƯỚNG DẪN TRIỂN KHAI VIETCAPLINK LÊN INTERNET (RENDER + NETLIFY)
*Dành cho hệ thống Dashboard Chứng khoán VN100 & Bộ lọc Realtime*

---

## 📌 TỔNG QUAN KIẾN TRÚC ĐÁM MÂY (0 ĐỒNG / THÁNG)
Hệ thống vận hành độc lập 24/7 không cần mở máy tính cá nhân bằng cách kết hợp 2 dịch vụ đám mây miễn phí trọn đời:
1. **Netlify (Frontend)**: Lưu trữ và phân phối giao diện web `index.html` siêu tốc qua mạng lưới CDN toàn cầu với tên miền miễn phí dạng `https://ten-ung-dung.netlify.app`.
2. **Render.com (Backend)**: Đảm nhận môi trường Python chạy ngầm `realtime_server.py` 24/7, tự động kết nối Vnstock quét giá và cập nhật BCTC 100 mã cổ phiếu mỗi 60 giây.

---

## 🚀 QUY TRÌNH 3 BƯỚC THỰC HIỆN KHI BẠN SẴN SÀNG

### BƯỚC 1: Đẩy mã nguồn lên GitHub cá nhân (Mất ~1 phút)
Toàn bộ mã nguồn đã được Antigravity khởi tạo và đóng gói sẵn Git (`commit`) trong máy bạn. Bạn chỉ cần đưa lên GitHub cá nhân:

1. Mở trình duyệt vào: **[https://github.com/new](https://github.com/new)**
2. Nhập tên kho (Repository name): `vietcaplink-stock`
3. Để chế độ **Public** (hoặc Private tùy bạn) -> Bấm **Create repository**.
4. Sao chép đường link kho của bạn (Dạng: `https://github.com/ten-tai-khoan/vietcaplink-stock.git`).
5. **Thực hiện đẩy mã nguồn**:
   - **Cách A (Nhanh nhất)**: Mở khung chat Antigravity, dán đường link repo GitHub vào và nói: *"Hãy đẩy code lên kho này cho tôi"*. Antigravity sẽ tự động chạy lệnh `git push` trong 3 giây.
   - **Cách B (Tự chạy bằng tay)**: Mở PowerShell hoặc Command Prompt tại thư mục dự án và chạy:
     ```bash
     cd C:\Users\ADMIN\.gemini\antigravity\scratch\stock-ai-dashboard
     git remote add origin https://github.com/ten-tai-khoan/vietcaplink-stock.git
     git branch -M main
     git push -u origin main
     ```

---

### BƯỚC 2: Kích hoạt Backend Python trên Render.com (Mất ~2 phút)
1. Đăng nhập vào: **[https://render.com/](https://render.com/)** (đăng nhập nhanh bằng tài khoản GitHub).
2. Ở trang quản trị, bấm nút **New +** (góc trên bên phải) -> Chọn **Web Service**.
3. Chọn kho `vietcaplink-stock` từ danh sách GitHub của bạn -> Bấm **Connect**.
4. Cấu hình thông số (Render sẽ tự động điền sẵn hầu hết thông tin):
   - **Name**: `vietcaplink-backend` (hoặc tên tùy bạn thích)
   - **Region**: `Singapore` (để kết nối về Việt Nam có độ trễ thấp nhất ~18ms)
   - **Branch**: `main` (hoặc `master`)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt` *(Đã chuẩn bị sẵn)*
   - **Start Command**: `python realtime_server.py`
   - **Instance Type**: Chọn **Free ($0/month)**.
5. Bấm nút **Deploy Web Service** ở cuối trang.
6. Đợi khoảng 1 - 2 phút, khi dòng trạng thái chuyển sang **Live**, bạn sao chép đường link do Render cấp:
   - Ví dụ: `https://vietcaplink-backend.onrender.com`

---

### BƯỚC 3: Đưa giao diện lên Netlify và liên kết (Mất ~30 giây)
1. Mở trình duyệt vào trang: **[https://app.netlify.com/drop](https://app.netlify.com/drop)**
2. Đăng nhập tài khoản Netlify (miễn phí).
3. Mở thư mục `C:\Users\ADMIN\.gemini\antigravity\scratch\stock-ai-dashboard` trên máy tính, **kéo và thả toàn bộ thư mục này** vào khung nét đứt trên màn hình Netlify.
4. Trong vòng 5 giây, Netlify sẽ cấp ngay một đường link công khai (ví dụ: `https://vietcaplink-app.netlify.app`).
5. **Liên kết với dữ liệu Render:**
   - Mở trang web Netlify vừa tạo lên -> Bấm vào biểu tượng trạng thái Realtime trên góc phải (hoặc mở Cài đặt API) -> Dán đường link Render (`https://vietcaplink-backend.onrender.com`) vào ô cấu hình Backend -> Bấm **Lưu**.
   - Kể từ lúc này, hệ thống sẽ tự động nhảy giá và BCTC 100 mã cổ phiếu liên tục 24/7!

---

## 💡 PHƯƠNG ÁN PHÁT LINK INTERNET TỨC THÌ (DỰ PHÒNG TRONG KHI CHƯA LÀM GITHUB)
Nếu bạn chưa muốn tạo tài khoản GitHub hay Render mà chỉ muốn phát link cho 10 - 20 người dùng test ngay:
1. Nhấp đúp chuột vào file: **`start_internet_share.bat`**
2. Cửa sổ màu xanh sẽ cấp ngay cho bạn đường link: `https://...trycloudflare.com`
3. Sao chép link gửi cho bạn bè xem ngay lập tức (miễn phí 100%).
