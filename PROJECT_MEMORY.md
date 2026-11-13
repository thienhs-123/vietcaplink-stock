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
      1. *Phương pháp 1: Nền Tạo Đáy (Bottoming / Reversal Base)*: Áp dụng sau nhịp giảm sâu/bán tháo. Điểm gốc tính từ nhịp tạo đáy đảo chiều T0 (ví dụ đáy tháng 7/2026). Trong quá trình tích lũy, nếu có phiên nhúng rũ bỏ quét đáy (Spring / Shakeout) với mức đóng cửa thấp hơn đáy T0 ban đầu <= 5% rồi rút chân bật tăng trở lại kênh trên, ta vẫn công nhận toàn bộ là một Vùng Tích Lũy Gom Hàng (Wyckoff Base). Đáy hộp (Floor) cập nhật về mức giá Close thấp nhất thực tế (kèm ngày tạo đáy thực tế). Đỉnh hộp (Ceiling) là giá Close cao nhất của nền (kèm ngày tạo đỉnh thực tế). Thời gian tích lũy (số phiên) được đếm liên tục từ mốc khởi đầu T0 đến phiên hiện tại.
      2. *Phương pháp 2: Nền Phẳng Tiếp Diễn (Continuation Flat Base / High Tight Box)*: Áp dụng khi cổ phiếu trong xu hướng tăng mạnh/tái tích lũy kênh trên (nền chồng nền). Điểm gốc Đỉnh hộp (Ceiling) là phiên Close cao nhất chững đà tăng trong 3 ngày (T0). Đáy hộp (Floor) là giá Close thấp nhất của nhịp retest đi ngang. Thời gian tính từ đỉnh T0 đến phiên hiện tại.
    + **Quy ước đọc nến & kỷ luật dữ liệu (BẮT BUỘC TUÂN THỦ TRIỆT ĐỂ)**:
      * **Đọc nến Nhật chuẩn xác**: Phân biệt tuyệt đối giữa Giá mở cửa (Open), Cao nhất (High), Thấp nhất (Low), Đóng cửa (Close). Tuyệt đối không được nhầm lẫn giữa Open và Close (như bài học sai sót SSI ngày 02/11/2026: Open 19.25, Close 18.85).
      * **Nguyên tắc đáy/đỉnh hộp**: Chỉ lấy **giá đóng cửa (Close)** thấp nhất (đáy) hoặc cao nhất (đỉnh) trong cụm 2 – 3 cây nến vùng cực trị. **TUYỆT ĐỐI KHÔNG** đưa ra phương án lấp lửng "hoặc là ngày X hoặc là ngày Y", AI phải chịu trách nhiệm tính toán chọn duy nhất 1 điểm chuẩn xác.
      * **Tên loại nền**: Gọi chuẩn xác là **Loại: Nền Tạo Đáy** hoặc **Loại: Nền Phẳng Tiếp Diễn** (bỏ hoàn toàn các hậu tố phụ như "(Cách 1)", "(Cách 2)").
      * **Giải thích phương pháp**: Bắt buộc giải thích cặn kẽ, đầy đủ bản chất kỹ thuật và tâm lý cung cầu, không được viết vắn tắt sơ sài.
    + **Độ siết nền**: `(Đỉnh - Đáy) / Đáy * 100% <= 20%`.
    + **Hiển thị cột Nền tích lũy (Module 4)**:
      * Chỉ hiển thị theo 3 mốc: `3 – 6 tháng`, `6 – 12 tháng`, `Trên 12 tháng`.
      * Nếu thời gian < 3 tháng (< 60 phiên): Hiển thị `-` (không hiển thị gì, loại bỏ hoàn toàn chữ "Dưới 3 tháng").
      * Bên phải mốc có icon & nút `[ⓘ Chi tiết]`: Khi trỏ chuột hiển thị Tooltip format chuẩn:
        ```text
        Loại: [Tên loại nền]
        Lý do nhận diện loại nền: [Lý do chi tiết theo phân tích kỹ thuật]
        Độ siết nền: XX.XX%
        Đáy: XX.XX ngày dd/mm/yyyy; Đỉnh: YY.YY ngày dd/mm/yyyy
        Số phiên đi nền: XX phiên
        Thời gian đi nền: YY tháng
        ```
      * Dòng ghi chú bên dưới mốc: Hiển thị `Tiệm cận vùng đỉnh nền` (chữ xanh). Điều kiện: Chỉ hiển thị khi thị giá hiện tại nằm ở >= 80% biên độ hộp (`Price >= Min + 0.8 * (Max - Min)`). Nếu không tiệm cận vùng đỉnh thì tuyệt đối KHÔNG hiển thị dòng này.
    + **Giao diện Modal "Thông tin nền tích lũy của cổ phiếu" (Chuẩn hóa UX/UI)**:
      * **Tiêu đề Modal**: Chỉ hiển thị duy nhất text `Thông tin nền tích lũy của cổ phiếu` (loại bỏ chữ "Chi tiết" và bỏ tên mã CP).
      * **Thẻ cổ phiếu**: Bỏ badge thời gian (`3 – 6 tháng`) ở góc phải header.
      * **Cụm 6 thông số (Grid 2 cột)**:
        - `Loại: Nền Tạo Đáy` kèm nút **`[ⓘ Chi tiết]`** ngay sau tên loại nền:
          + **Lý do nhận diện loại nền**: Hiển thị trực tiếp ra bên ngoài ngay dưới lưới 6 ô thông số (trong khung bo góc viền xanh emerald đẹp mắt), người dùng mở Modal ra là thấy ngay phân tích chuyên môn của cổ phiếu đó mà **không cần bấm Chi tiết**.
          + **Nút `[ⓘ Chi tiết]`**: Dùng để đóng / mở khối lý thuyết **"Giải thích 2 Phương Pháp Xác Định Nền:"** (1. Nền Tạo Đáy & 2. Nền Phẳng Tiếp Diễn). Mặc định khối lý thuyết được ẩn gọn gàng, khi bấm nút `[ⓘ Chi tiết]` thì bung mở bên dưới, bấm lại thì thu gọn.
        - `Độ siết nền: XX.XX%`.
        - `Đáy hộp: XX.XX (dd/mm/yyyy)`.
        - `Đỉnh hộp: YY.YY (dd/mm/yyyy)`.
        - `Số phiên đi nền: XX phiên` (bỏ số tháng trong ngoặc).
        - `Thời gian đi nền: YY tháng` (thay thế cho ô "Vị thế nến" đã bị loại bỏ hoàn toàn).
        - `Spring: XX.XX (ngày dd/mm/yyyy)` (ở phần cuối lưới thông số; nếu không có Spring thì hiển thị `Spring: Không xuất hiện`).
      * **Đồng nhất phông chữ**: Bỏ class `font-mono` ở khối lưới thông số, đồng nhất hoàn toàn sang phông sans-serif hiện đại cùng kiểu với khối bài giảng phân tích kỹ thuật 2 phương pháp bên dưới.
    + **Dữ liệu chuẩn hóa mẫu đã qua rà soát**:
      * CTG: Đáy `28.75` ngày 27/07/2026; Đỉnh `32.50` ngày 07/08/2026. Độ siết `13.04%`, 76 phiên (3.6 tháng). Giá 31.90 >= 31.75 => Hiển thị `Tiệm cận vùng đỉnh nền`.
      * SSI: Đáy `17.58` ngày 27/07/2026 (Close thấp nhất); Đỉnh `21.65` ngày 26/08/2026. Độ siết `23.15%`, 75 phiên (3.6 tháng). Giá 20.40 < 20.84 => Không hiển thị dòng tiệm cận.
      * DPR: Đáy `35.10` ngày 29/07/2026 (Close thấp nhất, không hoặc); Đỉnh `38.80` ngày 29/10/2026. Độ siết `10.54%`, 73 phiên (3.5 tháng). Loại: Nền Tạo Đáy (chưa breakout khỏi đỉnh hộp để chuyển sang nền tiếp diễn). Giá 38.00 < 38.06 => Không hiển thị dòng tiệm cận.
  - *Lưu ý*: Cả MA và Nền đều được tính toán lại động theo thị giá thời gian thực mỗi giây/phút.
- **Tiêu chuẩn Định giá (P/E rẻ nhất)**:
  - Top 10 cổ phiếu có chỉ số P/E thấp nhất trong danh mục, có P/E dương (> 0).
- **Kết hợp cả 2**:
  - Giao thoa giữa Tiêu chuẩn Kỹ thuật và Tiêu chuẩn Định giá (hiện tại thỏa mãn mã HDB).
- **Bảng kết quả lọc điểm mua & Modal thông tin nền tích lũy**:
  - Đã lược bỏ cột "Biến động" theo yêu cầu, tập trung hiển thị 6 cột trọng tâm với bảng cố định tỷ lệ `table-fixed`: Mã CP (24%), Ngành (15%), Giá VND (12%), P/E Lần (10%), Trên đường MA10 và MA50 (18%), Nền tích lũy (21%) - tổng cộng 100% chuẩn xác, cân đối.
  - **Tiêu đề các cột**: Chỉ ngắt dòng ở tiêu đề dài Cột 5 ("Trên đường" / "MA10 và MA50"), tất cả các cột khác giữ nguyên 1 dòng duy nhất. Cột "Nền tích lũy", cột "P/E (Lần)" và cột "Trên đường MA10 và MA50" được căn giữa cả tiêu đề lẫn nội dung.
  - **Sắp xếp & Bộ lọc Excel cột "Nền tích lũy"**:
    + **Sắp xếp**: Sửa triệt để cơ chế sắp xếp cột "Nền tích lũy" (dùng `getStockBaseDetails(st)` và `baseMonths` thay vì `baseValid` cũ gây lỗi lẫn lộn `-` và `3 - 6 tháng`). Toàn bộ cổ phiếu có nền tích lũy được gom nhóm và sắp xếp chính xác theo độ dài thời gian tích lũy (tăng dần ở `▲` và giảm dần ở `▼`), các mã không có nền (`-`) luôn được đưa về cuối bảng; đồng thời tự động reset phân trang về trang 1 khi bấm sắp xếp.
    + **Bộ lọc Excel**: Bổ sung thêm tiêu chí lọc `"Tiệm cận vùng đỉnh nền"` vào danh sách checklist lọc nhanh của cột "Nền tích lũy" (bên cạnh `-`, `3 – 6 tháng`, `6 – 12 tháng`, `Trên 12 tháng`). Cho phép người dùng lọc riêng các mã tiệm cận đỉnh nền hoặc kết hợp đa tiêu chí linh hoạt.
  - **Badge Nền tích lũy**: Nội dung badge "3 – 6 tháng" được căn giữa tuyệt đối theo tâm cột.
  - **Nút "chi tiết" trong bảng**: Đã bỏ icon chữ "i", bỏ viền, nền trong suốt, chữ thường với màu sắc nhẹ nhàng nép sát bên phải badge, không lấn át badge và định vị absolute không kéo lệch tâm căn giữa của badge so với tiêu đề. Đã loại bỏ hoàn toàn thuộc tính `title` (không còn pop-up tooltip nền trắng khi rê chuột/hover), chỉ xuất hiện hộp thoại modal khi người dùng bấm click trực tiếp vào chữ `chi tiết`.
  - **Phông chữ bảng**: Gỡ bỏ thẻ `td` khỏi CSS rule `SF Mono !important`, đồng thời bổ sung rule CSS ưu tiên cao áp đặt toàn bộ `#screenerTable` và các phần tử con dùng chuẩn phông sans-serif (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif !important`), đồng nhất hoàn toàn với giao diện giải thích của modal.
  - **Modal thông tin nền tích lũy**:
    + Tiêu đề modal: `Thông tin nền tích lũy của cổ phiếu`.
    + Tiêu đề khối lý do: `Lý do nhận diện loại nền:`. Hiển thị trực tiếp ra bên ngoài ngay khi mở modal từ bảng bên ngoài dashboard, người dùng không cần phải click thêm lần nữa.
    + Nút `[ⓘ Chi tiết]` bên cạnh tên loại nền dùng để bung mở khối `Giải thích 2 Phương Pháp Xác Định Nền` (Nền Tạo Đáy & Nền Phẳng Tiếp Diễn).
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


---

## 6. CHUẨN HÓA THUẬT TOÁN NỀN GIÁ, SPRING & KHỐI LƯỢNG ĐỘT BIẾN (MA20 VOLUME)
1. **Khối lượng đột biến (Volume Surge / Volume Breakout)**:
   - **Bắt buộc**: Luôn so sánh khối lượng của phiên với **đường trung bình 20 phiên của khối lượng (MA20 Volume)**:
     $$\text{Volume Surge Ratio} = \frac{\text{Volume}}{\text{MA20(Volume)}}$$
   - **Nguyên tắc kỹ thuật**: Tuyệt đối không so sánh với 1 phiên trước vì phiên đơn lẻ trước đó dễ bị nhiễu do nghỉ lễ hoặc thanh khoản teo tóp cục bộ. Ngưỡng xác nhận đột biến dòng tiền lớn hấp thụ là $\ge 1.3\times - 1.5\times$ MA20 Volume.
2. **Quy tắc xác định Đáy hộp & Cú Spring (Wyckoff Phase C)**:
   - **Đáy hộp**: Neo theo giá đóng cửa tại điểm tạo đáy đảo chiều $T_0$.
   - **Spring hợp lệ**:
     + Nhúng thủng đáy hộp $T_0$ với độ lệch $\le 5\%$.
     + Phải phục hồi nhanh chóng và không được đóng cửa dưới đáy quá 3 phiên liên tiếp (tránh nhầm lẫn với các nhịp bán tháo gãy nền kéo dài nhiều tuần).
     + Nếu nến tại $T_0$ là nến rút chân mạnh mẽ (Pinbar / Doji chuồn chuồn) có râu nến quét thủng đáy với volume đột biến $\ge 1.3\times$ MA20 Volume, phiên đó được ghi nhận là cú Spring Reversal trong phiên (rũ bỏ cướp hàng).
3. **Chuẩn hóa các mã tiêu biểu**:
   - **GMD**: Nền bắt đầu ngày **23/07/2026** (78 phiên, 3.7 tháng, nhóm 3 – 6 tháng), Đáy hộp `48.00`, Đỉnh hộp `57.50`, Độ siết `19.8%` ($\le 20\%$). Cú Spring rũ bỏ râu nến ngày 23/07/2026 nhúng về `44.67` với thanh khoản đạt 3.4M cổ phiếu (gấp **2.43 lần** MA20 Volume 1.4M cp).
   - **TPB**: Nền bắt đầu ngày **27/07/2026** (76 phiên, 3.6 tháng, nhóm 3 – 6 tháng), Đáy hộp `11.67`, Đỉnh hộp `13.10`, Độ siết `12.3%`. Cú Spring ngày 09/10/2026 nhúng về `11.45` rồi hồi phục ngay trong 2 phiên tiếp theo.

4. **Cập nhật giao diện Modal thông số nền (13/11/2026)**:
   - Thêm thông tin ngày bắt đầu sau số phiên đi nền: `Số phiên đi nền: XX phiên (tính từ ngày dd/mm/yyyy)`.
     * Với Nền Tạo Đáy: ngày bắt đầu tính từ ngày tạo đáy hộp $T_0$ (`baseMinDate`).
     * Với Nền Phẳng Tiếp Diễn: ngày bắt đầu tính từ ngày bứt phá đỉnh hộp $T_0$ (`baseMaxDate`).
   - Bỏ đường viền kẻ mờ (`border-t`) ngăn cách phía trên dòng `Spring`.
   - Căn chỉnh khoảng cách dọc giữa 4 dòng đều tăm tắp bằng `gap-y-2.5`.

5. **Nâng cấp Động cơ Phân loại Nền 3 Trụ cột (13/11/2026)**:
   - Khắc phục triệt để lỗi phân loại sai loại nền bằng cách đưa **Vị thế Chu kỳ 52 tuần & Quan hệ với MA50** vào làm điều kiện tiên quyết:
     * **Nền Phẳng Tiếp Diễn (Continuation Flat Base)**: Cách đỉnh 52 tuần $\le 15\%$ và giữ vững trên hoặc sát MA50 (`diffMA50 >= -2.5%`). Loại bỏ hoàn toàn lỗi gán nhãn Nền Tiếp Diễn cho các mã đang gãy nền cắm đầu dưới MA50 (như BID, PLX).
     * **Nền Tái Tích Lũy (Re-accumulation Base)**: Cổ phiếu đã thoát đáy thành công ($\ge 20\%$ từ đáy 52T) nhưng chưa tiệm cận đỉnh cũ ($> 15\%$ từ đỉnh), đang tích lũy kênh giữa quanh MA50 (như MWG, VJC).
     * **Nền Tạo Đáy (Bottom Reversal Base)**: Tích lũy gom hàng đảo chiều sau nhịp giảm sâu từ vùng đáy (như TPB, FCN, BID, PLX, SSI, CTG).
   - Modal hiển thị giải thích đầy đủ cả 3 phương pháp nhận diện khi bấm nút [Chi tiết].

6. **Khắc phục Triệt để Thuật toán Xác định Điểm Bắt đầu Nền & Thời gian Đi nền (13/11/2026)**:
   - **Bản chất lỗi trước đó (Trường hợp điển hình HHV & FCN)**:
     * Thuật toán cũ quét cửa sổ máy móc theo cực trị Max-Min ($\le 20\%$). Với HHV, nó bắt đỉnh ngày 12/08/2026 (10.30) và đáy ngày 09/10/2026 (8.75) với biên độ 17.7% và gộp nguyên con sóng giảm -15% suốt 1 tháng vào nền, gán nhầm thành "Nền 3 – 6 tháng (71 phiên)" tính từ đỉnh 12/08/2026.
     * Tương tự, FCN bị gán nhầm từ đỉnh 26/08/2026 (11.60) gộp nhịp rơi về 07/10/2026 (10.15) thành 64 phiên (3 tháng).
   - **Bộ 3 Quy tắc Mới chuẩn hóa**:
     * **Quy tắc 1 (Neo Đáy Đảo Chiều cho Nền Tạo Đáy)**: Mọi nền tạo đáy bắt buộc phải neo gốc tính từ ngày xác lập đáy đảo chiều thấp nhất gần nhất ($T_{đáy}$ = `baseMinDate`).
     * **Quy tắc 2 (Trend Breakdown & Reset Clock)**: Nếu trong quá trình vận động có nhịp rơi gãy đáy $> 5\%$ hoặc đóng cửa dưới đáy cũ $> 3$ phiên, nền cũ bị hủy bỏ hoàn toàn và đồng hồ tính nền RESET về 0 tại đáy mới.
     * **Quy tắc 3 (Spring Validation)**: Một cú nhúng thấp hơn đáy chỉ được xem là Spring nếu trước đó đã hình thành nhịp hồi phản ứng ($\ge 4\%$) tạo biên trên của hộp. Nếu chỉ rơi từ từ tạo đáy sau thấp hơn đáy trước, đó là sóng giảm, không phải Spring.
   - **Kết quả kiểm chứng thực tế**:
     * **HHV**: Nền Tạo Đáy chuẩn xác từ **09/10/2026** (26 phiên ~ 1.2 tháng), biên độ 8.75 – 9.88 (12.9%), xếp vào nhóm "Dưới 3 tháng", loại bỏ khỏi bộ lọc "3 – 6 tháng". (Do nhịp rơi tháng 10 gãy thủng sâu đáy tháng 8 tới -9.9%, phá vỡ cấu trúc tích lũy trước đó).
     * **SSI, CTG, MWG, TCB, VNM, HSG, DIG**: Nền 3 – 6 tháng chuẩn mực (68 – 97 phiên) giữ vững đáy từ tháng 7/8/2026.

7. **Cơ chế Độ Siết Nền Động theo Thời Gian Tích Lũy (Dynamic Base Tightness) (13/11/2026)**:
   - **Quy tắc**: Theo chỉ đạo chiến lược của người dùng, đối với các nền tích lũy trung-dài hạn $\ge 8$ tháng, biên độ dao động $22\% – 25\%$ vẫn là trạng thái gom hàng rất tích cực theo quy luật Nhân - Quả Wyckoff (Cause and Effect). Quy tắc này áp dụng đồng bộ cho toàn bộ thị trường.
   - **Biểu chuẩn độ siết động**:
     * Dưới 6 tháng: $\le 20.0\%$ (yêu cầu độ nén cao).
     * 6 – 8 tháng: $\le 22.5\%$.
     * Trên 8 tháng: $\le 25.0\%$.
   - **Áp dụng thành công cho TCB**:
     * Nhận diện chuẩn xác **Nền Tái Tích Lũy Lớn (Major Re-accumulation)** kéo dài **8.3 tháng (174 phiên)** bắt đầu từ ngày 09/03 - 10/03/2026.
     * Biên độ: Đáy 19.10 – Đỉnh 22.93 (độ siết $20.1\% \le 25.0\%$).
     * Có nhịp rũ bỏ quét đáy (Spring) ngày 07/04/2026 về 18.74 với lực cầu hấp thụ mạnh, hiện đang vận động ở nửa trên chiếc hộp quanh MA50 để chuẩn bị vượt đỉnh 52 tuần.
     * Phân loại chuẩn xác vào nhóm bộ lọc **"Từ 6 – 12 tháng"**.

8. **Chuẩn hóa Cơ chế Nhận diện Mô hình Hai Đáy (Double Bottom Base) - Phân biệt Triệt để FCN và HHV (13/11/2026)**:
   - **Thừa nhận lỗi trước đó**: Khi xử lý trường hợp HHV (bị gãy đáy -9.9%), thuật toán đã áp dụng bộ lọc cơ học quá thô bạo (`consecutiveBelow > 3`), dẫn tới việc ngộ nhận FCN bị gãy nền trong khi thực tế FCN giữ vững đáy tạo mô hình Hai Đáy kinh điển. Điều này tạo ra mâu thuẫn lớn giữa phân tích kỹ thuật (nhận định FCN tích lũy 3.6 tháng) và thuật toán thực tế (bị cắt ngắn về 1.3 tháng).
   - **Cơ chế phân biệt Price Action**:
     * **HHV**: Đáy 1 ngày 08/08 là 9.50. Đến tháng 10 rơi thủng sâu về 8.56 (-9.9% so với Đáy 1). Đây là **Gãy xu hướng (Breakdown)**, bắt buộc phải Reset đồng hồ về ngày 09/10/2026 (26 phiên, 1.2 tháng).
     * **FCN**: Đáy 1 ngày 28/07/2026 có Low 9.96 (nến rút chân pinbar). Nhịp test Đáy 2 ngày 06-07/10/2026 có Low 9.94. Chênh lệch Low giữa Đáy 1 và Đáy 2 chỉ là **0.2%** ($\le 1.5\%$). Đây là **Mô hình Hai Đáy (Double Bottom)** chuẩn mực 100%, bảo toàn nguyên vẹn toàn bộ quá trình tích lũy 3.6 tháng!
   - **Nâng cấp thuật toán trong `update_technical_bases.js`**:
     * Bổ sung nhận diện Trough bằng cả `closesVND` và `lowsVND` (nến pinbar rút chân ngày 28/07).
     * Phát hiện Double Bottom: `const isDoubleBottom = (minLowIdx > 15 && minLow >= t0Low * 0.985)`. Khi thỏa mãn, không bị áp dụng điều kiện `consecutiveBelow` cơ học, giữ nguyên cấu trúc nền từ Đáy 1.
     * Gán nhãn và mô tả rõ ràng: `baseMethodName = 'Nền Tạo Đáy'`, mô tả: *"Cổ phiếu hình thành mô hình Hai Đáy (Double Bottom) vững chắc với Đáy 1 ngày 28/07/2026 và Đáy 2 ngày 07/10/2026, vận động siết chặt trong chiếc hộp 10.50 - 11.60 (10.5%) kéo dài 3.6 tháng (76 phiên)..."*.
   - **Kết quả FCN sau chuẩn hóa**:
     * Bắt đầu: **28/07/2026**.
     * Thời gian đi nền: **76 phiên (3.6 tháng)** $\rightarrow$ Xếp chuẩn xác vào nhóm **"Từ 3 – 6 tháng"**.
     * Độ siết: **10.5%** ($\le 20\%$).
     * Vị thế: Nửa trên hộp tích lũy (`baseUpperHalf: true`). Đạt tiêu chuẩn kỹ thuật hàng đầu.

9. **Đại Tu Toàn Diện Động Cơ Xác Định Nền: Tầm Nhìn Dài Hạn & Phi Máy Móc (13/11/2026)**:
   - **Tư duy cốt lõi**:
     1. **Tầm nhìn dài hạn (Wyckoff Cause & Effect)**: Hệ thống ưu tiên nhận diện và bảo toàn Cấu trúc Tích lũy Lớn (Major Base 3 – 12 tháng) thay vì bị "cận thị" chỉ nhìn cái nền cóc 2 – 3 tuần.
     2. **Loại bỏ hoàn toàn tư duy máy móc**:
        * Không cắt cụt nền chỉ vì vài phiên râu nến nhúng xuống hay vài phiên lình xình dưới đáy hộp vài lai nếu tổng thể hỗ trợ đáy vẫn được tôn trọng.
        * Nhận diện đa hình thái Price Action: **Mô hình Hai Đáy (Double Bottom)**, **Cấu trúc Nâng Đáy (Ascending Base / Higher Lows)**, **Hộp Wyckoff có Spring rũ bỏ**, **Nền Phẳng Tiếp Diễn Kênh Trên**, và **Nền Tái Tích Lũy Lớn $\ge 6$ tháng**.
        * Phân biệt rõ **Gãy nền thật sự (True Breakdown)** như HHV (rơi thủng đáy cũ -9.9%) bắt buộc phải reset về đáy mới; với **Kiểm định đáy / Rũ bỏ (Retest / Shakeout)** như FCN, VCI, IDC (giữ vững đáy) bảo toàn nguyên vẹn nền mẹ.
     3. **Biểu chuẩn độ siết động (Dynamic Tightness)**:
        * Dưới 3 tháng: $\le 20.0\%$.
        * 3 – 6 tháng: $\le 22.0\%$ (phù hợp biên dao động VN-Index thời gian qua).
        * 6 – 8 tháng: $\le 23.5\%$.
        * Trên 8 tháng: $\le 25.0\%$.
   - **Kết quả phân bổ toàn thị trường (100 cổ phiếu)**:
     * **Nền 3 – 6 tháng**: Tăng từ 19 lên **32 cổ phiếu** (nhận diện chuẩn xác các mã tích lũy đáy lớn từ tháng 7/2026 như VCI, IDC, DIG, NLG, PDR, FCN, SSI, CTG, MWG, DBC, HAX, DGW...).
     * **Nền 6 – 12 tháng**: **20 cổ phiếu** (các cấu trúc tái tích lũy siêu tích cực như TCB, VJC, VPB, GMD, MSH, OCB, NAB, STB, HCM, MSN, POW, VNM, HPG, HDB, MBB, VIB, ORS, BAF, SAB, ACB).
     * **Nền Dưới 3 tháng**: Giảm từ 40 xuống **30 cổ phiếu** (chỉ còn các mã mới tạo đáy ngắn hạn gần đây như HHV, VHM, VIC, VRE, VND, FTS, VIX, AGR, MSB, NVL, DXG, KDH...).
     * **Chưa có nền / Biến động lỏng**: Giảm còn **18 cổ phiếu** (đang rơi tự do dò đáy 52T hoặc biến động $> 25-30\%$).
     * **Mô hình Hai Đáy kiểm định**: Nhận diện thành công **25 cổ phiếu**.

10. **Chỉnh sửa Danh mục Tiêu biểu Model Portfolios (13/11/2026)**:
   - **1. Danh mục Tấn công (Offensive)**:
     * Chiến lược: Tập trung tối đa 100% vào **POW** (Tổng Công ty Điện lực Dầu khí Việt Nam).
     * Tỷ trọng: **100% POW** (Ngành Điện lực & Năng lượng).
     * Mức tập trung hiển thị: "100% POW (All-in)".
   - **2. Danh mục Cân bằng (Balanced)**:
     * Bộ 3 điều kiện tuyển chọn:
       1) **Giá nằm trên MA10 và MA50** (`aboveMA10_50: true`, xu hướng tăng ngắn và trung hạn xác lập).
       2) **Kết quả kinh doanh tốt** (Tăng trưởng LNST, Doanh thu, EPS, ROE cao).
       3) **Khối ngoại mua ròng** (Dòng vốn ngoại gom ròng tích cực trên sàn HOSE).
     * **Top 5 cổ phiếu xuất sắc nhất được lựa chọn (Mỗi mã 20% tỷ trọng)**:
       1) **MSN (CTCP Tập đoàn Masan)**: Tiêu dùng & Bán lẻ (20%). Khối ngoại mua ròng **+56.08 Tỷ** (Top 1 sàn), LNST **+145%**, DTT **+12.8%**, ROE 11.5%, trên MA10 (+0.7%) và MA50 (+1.4%).
       2) **TCB (Ngân hàng Techcombank)**: Ngân hàng & Tài chính (20%). Khối ngoại mua ròng **+53.00 Tỷ**, LNST **+34.2%**, DTT **+22.8%**, ROE 16.8%, EPS 3,250 đ, P/E 6.7x, Nền Tái Tích Lũy 8.3 tháng.
       3) **HPG (Tập đoàn Hòa Phát)**: Thép & Vật liệu (20%). Khối ngoại mua ròng **+24.56 Tỷ**, LNST **+77%**, DTT **+17%**, ROE 11.8%, EPS 1,970 đ, P/E 10.9x.
       4) **KDH (CTCP Đầu tư và Kinh doanh Nhà Khang Điền)**: Bất động sản (20%). Khối ngoại mua ròng **+44.16 Tỷ**, LNST **+22%**, DTT **+18.5%**, P/E 12.5x, bứt phá mạnh trên MA10 (+6.0%) và MA50 (+8.8%).
       5) **DBC (CTCP Tập đoàn DABACO Việt Nam)**: Nông nghiệp & Thực phẩm (20%). Khối ngoại mua ròng **+0.35 Tỷ**, LNST tăng trưởng vượt bậc **+280%**, DTT **+18.5%**, ROE 14.8%, EPS 2,150 đ, P/E 7.5x.
     * Cơ cấu ngành cân bằng 5 trụ cột: Tiêu dùng (20%) - Ngân hàng (20%) - Thép (20%) - BĐS (20%) - Nông nghiệp (20%).
