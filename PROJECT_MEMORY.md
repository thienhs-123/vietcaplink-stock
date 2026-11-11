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
  - **Tiêu chuẩn 2 (Độ chặt chẽ nền & Phương pháp tính)**:
    + **Hai phương pháp xác định nền giá**:
      1. *Phương pháp 1: Nền Tạo Đáy (Bottoming / Reversal Base)*: Áp dụng sau nhịp giảm sâu/bán tháo. Điểm gốc Đáy hộp (Floor) lấy từ cụm 2 - 3 cây nến đảo chiều thấp nhất (giá Close thấp nhất làm T0). Đỉnh hộp (Ceiling) là giá Close cao nhất của nhịp hồi phục đầu tiên. Thời gian tích lũy tính từ T0 đến phiên hiện tại.
      2. *Phương pháp 2: Nền Phẳng Tiếp Diễn (Continuation Flat Base / High Tight Box)*: Áp dụng khi cổ phiếu trong xu hướng tăng mạnh/tái tích lũy kênh trên (nền chồng nền). Điểm gốc Đỉnh hộp (Ceiling) là phiên Close cao nhất chững đà tăng trong 3 ngày (T0). Đáy hộp (Floor) là giá Close thấp nhất của nhịp retest đi ngang. Thời gian tính từ đỉnh T0 đến phiên hiện tại.
    + **Quy ước đọc nến**: Bắt buộc lấy **giá đóng cửa (Close)** của vùng nến (không lấy râu nến High/Low). Vùng đáy/đỉnh xác định từ nhóm 2 – 3 cây nến cực trị.
    + **Độ siết nền**: `(Đỉnh - Đáy) / Đáy * 100% <= 20%`.
    + **Hiển thị cột Nền tích lũy (Module 4)**:
      * Chỉ hiển thị theo 3 mốc: `3 – 6 tháng`, `6 – 12 tháng`, `Trên 12 tháng`.
      * Nếu thời gian < 3 tháng (< 60 phiên): Hiển thị `-` (không hiển thị gì, loại bỏ hoàn toàn chữ "Dưới 3 tháng").
      * Bên phải mốc có icon & nút `[ⓘ Chi tiết]`: Khi trỏ chuột hiển thị Tooltip format chuẩn:
        `Phương pháp: ...\nĐộ siết nền: ...%\nĐáy: XX.XX ngày dd/mm/yyyy; Đỉnh: YY.YY ngày dd/mm/yyyy\nSố phiên đi nền XX phiên (tương đương YY tháng)`.
      * Khi bấm vào `[ⓘ Chi tiết]`: Mở Modal `baseDetailModal` hiển thị thông số chi tiết của cổ phiếu và bài giảng phân tích kỹ thuật của cả 2 phương pháp.
      * Dòng ghi chú bên dưới: Hiển thị `Tiệm cận vùng đỉnh nền` (chữ xanh). Điều kiện: Chỉ hiển thị khi thị giá hiện tại nằm ở >= 80% biên độ hộp (`Price >= Min + 0.8 * (Max - Min)`). Nếu không tiệm cận vùng đỉnh thì tuyệt đối KHÔNG hiển thị dòng này.
    + **Dữ liệu chuẩn hóa mẫu**:
      * CTG: Đáy `28.75` ngày 27/07/2026; Đỉnh `32.50` ngày 07/08/2026. Độ siết `13.04%`, 76 phiên (3.6 tháng). Giá 31.90 >= 31.75 => Hiển thị `Tiệm cận vùng đỉnh nền`.
      * SSI: Đáy `17.58` ngày 27/07/2026; Đỉnh `21.65` ngày 26/08/2026. Độ siết `23.15%`, 75 phiên (3.6 tháng). Giá 20.40 < 20.84 => Không hiển thị dòng tiệm cận.
      * DPR: Đáy `35.10` ngày 29/07/2026; Đỉnh `38.80` ngày 29/10/2026. Độ siết `10.54%`, 73 phiên (3.5 tháng). Phương pháp: Nền Tạo Đáy (chưa breakout khỏi đỉnh hộp để chuyển sang nền tiếp diễn). Giá 38.00 < 38.06 => Không hiển thị dòng tiệm cận.
  - *Lưu ý*: Cả MA và Nền đều được tính toán lại động theo thị giá thời gian thực mỗi giây/phút.
- **Tiêu chuẩn Định giá (P/E rẻ nhất)**:
  - Top 10 cổ phiếu có chỉ số P/E thấp nhất trong danh mục, có P/E dương (> 0).
- **Kết hợp cả 2**:
  - Giao thoa giữa Tiêu chuẩn Kỹ thuật và Tiêu chuẩn Định giá (hiện tại thỏa mãn mã HDB).
- **Bảng kết quả lọc điểm mua**:
  - Đã lược bỏ cột "Biến động" theo yêu cầu, tập trung hiển thị 6 cột trọng tâm: Mã CP, Ngành, Giá (VND), P/E (Lần), Vị thế MA 10 & 50, Nền tích lũy. Colspan khi rỗng tự động điều chỉnh thành 6 cột.
  - Đã gỡ bỏ hoàn toàn thanh chỉ dẫn phụ ("👉 Bấm tick chọn điều kiện lọc cổ phiếu muốn xem..." kèm 2 nút "Tick chọn cả 2" và "Bỏ chọn") nằm phía trên 2 thẻ điều kiện để giao diện thoáng, tinh tế và tập trung trực tiếp vào 2 thẻ chọn chính.
  - Đã cập nhật badge trạng thái khi chưa chọn điều kiện thành "Chưa chọn tiêu chí", đồng thời bỏ hiển thị banner cảnh báo màu cam ("Chưa chọn điều kiện lọc nào • Đang hiển thị tất cả cổ phiếu") giúp giao diện sạch và tinh tế.
  - Đã gỡ bỏ toàn bộ huy hiệu đánh số thứ tự (`#1`, `#2`, `#3`...) trong cột P/E (Lần), chỉ giữ số P/E thuần túy rõ ràng.
  - Đã gỡ bỏ cụm nút thao tác ở tiêu đề Mục 4 ("Đặt lại bộ lọc" và "Thêm / Sửa cổ phiếu") theo yêu cầu tinh gọn giao diện.

---

## 4. QUY TẮC ĐỒNG BỘ 2 MÁY & TIẾP NHẬN TASK (BẮT BUỘC TUÂN THỦ)
1. **Quy tắc tiếp nhận task (Task Intake & Alignment Protocol)**:
   - Trước khi bắt đầu build, fix, chỉnh sửa code hoặc thực hiện bất kỳ nhiệm vụ chính thức nào, Agent **BẮT BUỘC** phải trình bày rõ ý hiểu của mình về task đó (yêu cầu chi tiết, phạm vi thay đổi, giao diện/logic xử lý) trong phản hồi chat để người dùng kiểm tra và xác nhận.
   - Tuyệt đối không tự ý can thiệp code hay sửa file trước khi trình bày ý hiểu.
2. **Khi ngồi vào máy (ở nhà hoặc cơ quan)**:
   - Luôn chạy: `git pull origin main` trước khi thực hiện bất kỳ sửa đổi nào.
3. **Khi chuẩn bị rời máy / tắt máy**:
   - Luôn chạy: `git add .` $\rightarrow$ `git commit` $\rightarrow$ `git push origin main`.
4. **Tuyệt đối không dùng lệnh Copy đè thô bạo (`Copy-Item -Force`)**:
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
  - *Cơ chế Realtime 1 phút/lần chuẩn xác (Dual-Mode Local & GitHub)*:
    + **GitHub Pages & Trình duyệt trực tuyến (`https://thienhs-123.github.io/vietcaplink-stock/`)**:
      - **Chỉ số thị trường (VN-INDEX, VN30, HNX, UPCOM)**: Truy vấn trực tiếp qua **VNDIRECT DCHART API** (`resolution=D`) với tiêu đề `Access-Control-Allow-Origin: *`. Tự động tính toán giá tham chiếu (phiên trước), chỉ số hiện tại, điểm tăng giảm, % biến động và khối lượng lũy kế mà không cần proxy hay server trung gian.
      - **Toàn bộ 100 mã cổ phiếu (VN100)**: Truy vấn trực tiếp qua **VPS Realtime Datafeed** (`https://bgapidatafeed.vps.com.vn/getliststockdata/{symbols}`) trong một HTTP GET duy nhất với `Access-Control-Allow-Origin: *`. Cập nhật thị giá khớp lệnh, % thay đổi, khối lượng, trần/sàn/tham chiếu cho toàn bộ 100 mã đồng thời tính toán độ rộng thị trường (adv, dec, ref, ceil, flr) tức thời.
      - Tự động kích hoạt chu kỳ cập nhật chuẩn 1 lần / phút (`intervalMs: 60000`, `setInterval(tickMinuteRealtime, 60000)`).
    + **Bản Local (Server Python & Fallback)**:
      - `realtime_server.py` ưu tiên lấy dữ liệu từ VNDIRECT DCHART & SSI Chart API, kết hợp tính toán độ rộng thị trường.
      - Nếu người dùng mở trực tiếp file `index.html` mà không bật Python server, trình duyệt sẽ tự động kích hoạt Engine Client VNDirect/VPS trực tiếp nói trên, bảo đảm 100% thời gian thực không bao giờ bị gián đoạn.
