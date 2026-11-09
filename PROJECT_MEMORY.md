# 🧠 PROJECT MEMORY & NGỮ CẢNH DỰ ÁN (VIETCAPLINK STOCK DASHBOARD)
> *Tài liệu ghi nhớ ngữ cảnh dự án tự động đồng bộ giữa máy cơ quan và máy ở nhà qua Git.*
> *Cập nhật lần cuối: 09/11/2026*

---

## 1. TỔNG QUAN HỆ THỐNG
- **Dự án**: Dashboard Đầu tư Chứng khoán Thông minh AI (Vietcaplink Stock).
- **Kho lưu trữ GitHub**: `https://github.com/thienhs-123/vietcaplink-stock.git` (Nhánh: `main`).
- **Thư mục làm việc máy cơ quan**: `C:\Users\ADMIN\.gemini\antigravity\scratch\stock-ai-dashboard\`.
- **Thư mục làm việc máy ở nhà**: Tải về từ GitHub bằng lệnh `git pull origin main`.

---

## 2. KIẾN TRÚC DỮ LIỆU & NGUỒN CẤP THỜI GIAN THỰC (REALTIME FEEDS)
1. **100 Cổ phiếu rổ VN100**:
   - Backend `realtime_server.py`: Tự động nạp bảng giá thời gian thực từ thư viện **Vnstock (v5.x)** và API SSI iBoard (1 phút/lần).
   - Snapshot dự phòng: `vnstock_snapshot.json` đảm bảo 100/100 mã cổ phiếu luôn hiển thị giá số thực tế, không bao giờ bị lỗi `"Lỗi"`.
2. **Chỉ số chứng khoán thế giới**:
   - 7 chỉ số lớn (`^DJI`, `^GSPC`, `^IXIC`, `^N225`, `000001.SS`, `^KS11`, `^HSI`) kết nối trực tiếp qua **Yahoo Finance API**.
3. **Tỷ giá ngoại tệ**:
   - Nạp tỷ giá chính thức niêm yết thời gian thực từ **Ngân hàng Vietcombank (VCB XML)** cho USD/VND (Mua TM: 25,370 | Bán ra: 25,780) và EUR/VND (29,261).
4. **Hàng hóa & Năng lượng toàn cầu**:
   - Vàng thế giới Spot Gold: `$4,138.4` (Yahoo Finance & gold-api.com).
   - Vàng SJC Việt Nam: `89.50 Tr/lượng`.
   - Dầu thô Brent: `$97.67` | Dầu WTI: `$90.61`.
   - Dollar Index (DXY): `102.14`.

---

## 3. TIÊU CHUẨN LỌC ĐIỂM MUA (MỤC 4. MUA)
- **Mặc định khi mở trang / khởi tạo**: Cả 2 điều kiện mua đều ở trạng thái **KHÔNG CHỌN** (hiển thị danh sách tổng thể). Người dùng chủ động bấm chọn 1 hoặc cả 2 thẻ để kích hoạt lọc điểm mua.
- **Tiêu chuẩn Kỹ thuật (MA & Nền tích lũy)**:
  - Thị giá hiện tại > cả MA 10 ngày và MA 50 ngày (`st.diffMA10 > 0 && st.diffMA50 > 0`).
  - **Tiêu chuẩn 1 (Thời gian nền - Cơ chế Tick chọn/Bỏ chọn tinh gọn & Thân thiện UX)**:
    + **Giao diện tối giản**: Không dùng thêm thanh nút phụ gây rối mắt. Chỉ giữ duy nhất 3 ô tick chọn trực tiếp:
      * `[ ] Từ 3 – 6 tháng (60 – 125 phiên)`
      * `[ ] Từ 6 – 12 tháng (126 – 250 phiên)`
      * `[ ] Trên 12 tháng (> 250 phiên)`
    + **Cơ chế luân chuyển (Tick = Chọn, Tick lại = Bỏ chọn)**:
      * Ô chưa chọn: Bấm vào $\rightarrow$ Đổi sang trạng thái chọn (`[✓]`).
      * Ô đang chọn: Bấm vào $\rightarrow$ Bỏ chọn (`[ ]`).
      * Khi thẻ Kỹ thuật đang tắt: Bấm vào bất kỳ ô nào sẽ tự động bật Thẻ Kỹ thuật với duy nhất ô đó.
      * Khi chỉ còn 1 ô duy nhất đang chọn: Bấm bỏ chọn ô đó sẽ tự động tắt Thẻ Kỹ thuật sạch sẽ (`filterMaAndBase = false`).
    + **Quy tắc khoảng liền kề (Không chọn 2 khoảng cách quãng)**:
      * Cho phép chọn 1 khoảng đơn lẻ (`[3-6T]`, `[6-12T]`, `[>12T]`).
      * Cho phép chọn 2 khoảng liền kề (`[3-6T] + [6-12T]`, `[6-12T] + [>12T]`).
      * Cho phép chọn cả 3 khoảng (`[3-6T] + [6-12T] + [>12T]`).
      * **Ngăn chặn tuyệt đối**: Không cho phép chọn cùng lúc 2 ô cách quãng `3 – 6 tháng` và `trên 12 tháng` (nếu người dùng bấm tạo khoảng cách quãng hoặc cố tình bỏ chọn ô giữa khi cả 3 ô đang bật, hệ thống sẽ hiện thông báo hướng dẫn và giữ nguyên trạng thái hợp lệ).
  - **Tiêu chuẩn 2 (Độ chặt chẽ nền)**:
    + Biên độ biến động đỉnh - đáy nền: `(Max - Min) / Min <= 20%`.
    + Thị giá vận động ở nửa trên vùng nền tích lũy (`st.price >= Mid`).
  - *Lưu ý*: Cả MA và Nền đều được tính toán lại động theo thị giá thời gian thực mỗi giây/phút.
- **Tiêu chuẩn Định giá (P/E rẻ nhất)**:
  - Top 10 cổ phiếu có chỉ số P/E thấp nhất trong danh mục, có P/E dương (> 0).
- **Kết hợp cả 2**:
  - Giao thoa giữa Tiêu chuẩn Kỹ thuật và Tiêu chuẩn Định giá (hiện tại thỏa mãn mã HDB).

---

## 4. QUY TẮC ĐỒNG BỘ 2 MÁY (BẮT BUỘC TUÂN THỦ)
1. **Khi ngồi vào máy (ở nhà hoặc cơ quan)**:
   - Luôn chạy: `git pull origin main` trước khi thực hiện bất kỳ sửa đổi nào.
2. **Khi chuẩn bị rời máy / tắt máy**:
   - Luôn chạy: `git add .` $\rightarrow$ `git commit` $\rightarrow$ `git push origin main`.
3. **Tuyệt đối không dùng lệnh Copy đè thô bạo (`Copy-Item -Force`)**:
   - Mọi thay đổi đều được kiểm soát và đồng bộ qua Git/GitHub để tránh ghi đè nhầm mã nguồn giữa 2 máy.

---

## 5. THƯ MỤC THIẾT KẾ GOOGLE STITCH (`design/stitch/`)
- **Mục đích**: Lưu trữ các mẫu giao diện UI/UX HTML + Tailwind CSS xuất từ Google Stitch (`stitch.withgoogle.com`) để Antigravity tích hợp vào code chính.
- **Cấu trúc hiện có**:
  - `design/stitch/modal_detail.html`: Mẫu Modal xem chi tiết phân tích từng mã cổ phiếu (Thị giá, MA10/50, Nền, P/E, RSI...).
  - `design/stitch/portfolio_card.html`: Mẫu Widget Quản lý danh mục & Cảnh báo AI thời gian thực.
  - `design/stitch/README.md`: Hướng dẫn prompt chuẩn Design System (Dark mode, Emerald #10b981) và quy trình kết hợp Stitch $\rightarrow$ Antigravity.
- **Triển khai thực tế**:
  - *Biểu đồ VN-Index (Mục 1)*: Đã khoác giao diện Stitch (nền `#131824`, viền `#1e2638`, cụm nút thời gian pill `#0b0e17`, đường sóng Area Gradient màu Vivid Cyan `#38bdf8`) trong khi vẫn bảo toàn 100% cỗ máy ApexCharts, Realtime feed tự động 1 phút/lần và các sự kiện zoom/pan.

