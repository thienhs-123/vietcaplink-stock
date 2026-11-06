# HƯỚNG DẪN CHI TIẾT: ĐƯA DỰ ÁN LÊN GITHUB & PUBLIC RA INTERNET

> **Tài liệu hướng dẫn chuẩn hóa** cho dự án **Vietcaplink Stock AI Dashboard**.  
> Giúp bạn dễ dàng triển khai, chia sẻ đường link ra toàn thế giới và cập nhật giao diện tự động 24/7 hoàn toàn miễn phí.

---

## MỤC LỤC
1. [Tổng quan các phương án Public](#1-tổng-quan-các-phương-án-public)
2. [Giai đoạn 1: Đóng gói & Đẩy mã nguồn lên GitHub](#giai-đoạn-1-đóng-gói--đẩy-mã-nguồn-lên-github)
3. [Giai đoạn 2: Bật tính năng Public Internet qua GitHub Pages](#giai-đoạn-2-bật-tính-năng-public-internet-qua-github-pages)
4. [Giai đoạn 3: Đổi tên miền đường link theo thương hiệu `vietcaplink`](#giai-đoạn-3-đổi-tên-miền-đường-link-theo-thương-hiệu-vietcaplink)
5. [Giai đoạn 4: Quy trình cập nhật mã nguồn khi Vibecode tiếp](#giai-đoạn-4-quy-trình-cập-nhật-mã-nguồn-khi-vibecode-tiếp)
6. [Xử lý sự cố thường gặp (Troubleshooting)](#xử-lý-sự-cố-thường-gặp-troubleshooting)

---

## 1. TỔNG QUAN CÁC PHƯƠNG ÁN PUBLIC

| Đặc tính | GitHub Pages (Khuyên Dùng Nhất) | Render.com (Máy chủ Python) | Cloudflare Tunnel (Chạy máy tính) |
| :--- | :---: | :---: | :---: |
| **Chi phí** | **Miễn phí 100% vĩnh viễn** | Miễn phí (Gói Free) | Miễn phí |
| **Độ ổn định** | **99.99%** (Hạ tầng Microsoft) | Hay bị ngủ (Sleep sau 15p) | Phụ thuộc máy tính cá nhân |
| **Tốc độ tải web** | **Cực nhanh (< 1 giây)** | Chậm khi mới đánh thức (~50s) | Phụ thuộc mạng gia đình |
| **Dạng đường link** | `vietcaplink.github.io/vietcaplink-stock/` | `vietcaplink-stock.onrender.com` | `xxx.trycloudflare.com` |
| **Tùy biến tên miền** | Hỗ trợ tên miền riêng miễn phí | Hỗ trợ tên miền riêng | Cần cấu hình Cloudflare |

---

## GIAI ĐOẠN 1: ĐÓNG GÓI & ĐẨY MÃ NGUỒN LÊN GITHUB

### Bước 1.1: Tạo kho lưu trữ (Repository) trên GitHub
1. Truy cập vào trang tạo kho mới: **[https://github.com/new](https://github.com/new)**
2. Nhập thông tin:
   - **Repository name**: `vietcaplink-stock`
   - **Quyền riêng tư**: Chọn **Public** (công khai để người khác vào xem được).
   - **Lưu ý**: **Không** tích chọn *"Add a README file"*, giữ nguyên mặc định.
3. Bấm nút màu xanh **Create repository**.
4. Copy đường link kho dạng:
   ```text
   https://github.com/ten-tai-khoan-cua-ban/vietcaplink-stock.git
   ```

### Bước 1.2: Đẩy mã nguồn từ máy tính lên GitHub (1-Click)
Trong thư mục dự án trên máy tính (`stock-ai-dashboard`), hệ thống đã tạo sẵn file tự động:
👉 **`push_to_github.bat`**

1. Bạn chỉ cần **bấm đúp chuột vào file `push_to_github.bat`**.
2. Cửa sổ màu đen sẽ tự động đóng gói toàn bộ code và đẩy lên nhánh `main` của GitHub.

---

## GIAI ĐOẠN 2: BẬT TÍNH NĂNG PUBLIC INTERNET QUA GITHUB PAGES

Sau khi mã nguồn đã nằm trên GitHub, bạn chỉ cần kích hoạt tính năng Web trong 30 giây:

1. Mở trang cài đặt GitHub Pages của kho:
   👉 **`https://github.com/thienhs-123/vietcaplink-stock/settings/pages`**
2. Tại phần **Build and deployment**:
   - Ở mục **Source**: Giữ nguyên là **Deploy from a branch**.
   - Ở mục **Branch**: Đang hiển thị là `None`, bạn bấm vào chọn nhánh **`main`**.
   - Thư mục bên cạnh giữ nguyên là **`/(root)`**.
3. Bấm nút **Save** màu xanh.
4. Đợi khoảng **30 - 60 giây**, tải lại trang bạn sẽ thấy xuất hiện thông báo:
   > *"Your site is live at https://thienhs-123.github.io/vietcaplink-stock/"*

---

## GIAI ĐOẠN 3: ĐỔI TÊN MIỀN ĐƯỜNG LINK THEO THƯƠNG HIỆU `vietcaplink`

Mặc định, GitHub Pages lấy tên tài khoản của bạn để làm tiền tố đường link:
$$\text{https://} \mathbf{[Tên\ Tài\ Khoản]} \text{.github.io/vietcaplink-stock/}$$

Để đổi từ `thienhs-123.github.io` sang `vietcaplink.github.io`, bạn chọn 1 trong 2 cách sau:

### Cách A: Đổi tên tài khoản GitHub (Username)
1. Đăng nhập GitHub và truy cập: **[https://github.com/settings/admin](https://github.com/settings/admin)**
2. Tìm đến mục **Change username** -> Bấm nút **Change username**.
3. Nhập tên mới bạn muốn:
   - Nếu `vietcaplink` khả dụng: Nhập `vietcaplink`.
   - Nếu đã bị đăng ký trước, bạn có thể chọn các biến thể chuyên nghiệp:
     - `vietcaplink-vn` ➡️ Link: `https://vietcaplink-vn.github.io/vietcaplink-stock/`
     - `vietcaplink-official` ➡️ Link: `https://vietcaplink-official.github.io/vietcaplink-stock/`
     - `vietcap-link` ➡️ Link: `https://vietcap-link.github.io/vietcaplink-stock/`
4. Bấm **I understand, change my username**. Mọi link của bạn sẽ đổi tên ngay lập tức!

### Cách B: Tạo một Organization (Tổ chức) mới miễn phí
1. Truy cập: **[https://github.com/organizations/plan](https://github.com/organizations/plan)**
2. Chọn gói **Free ($0)**.
3. Đặt tên tổ chức là `vietcaplink-vn` hoặc tên bạn thích.
4. Vào kho `vietcaplink-stock` -> **Settings** -> Kéo xuống dưới cùng mục **Danger Zone** -> Chọn **Transfer ownership** -> Chuyển vào Organization vừa tạo.

### Cách C: Gắn tên miền riêng độc lập (Custom Domain)
Nếu bạn đã sở hữu tên miền riêng (ví dụ `vietcaplink.com` hoặc `vietcaplink.vn`):
1. Vào **Settings** -> **Pages** của kho.
2. Tại ô **Custom domain**, nhập tên miền của bạn (ví dụ: `stock.vietcaplink.com` hoặc `vietcaplink.com`).
3. Cấu hình bản ghi CNAME tại nhà cung cấp tên miền trỏ về `<username>.github.io`.

---

## GIAI ĐOẠN 4: QUY TRÌNH CẬP NHẬT MÃ NGUỒN KHI VIBECODE TIẾP

Khi bạn tiếp tục trò chuyện với AI để sửa đổi giao diện, thêm tính năng lọc cổ phiếu hoặc chỉnh sửa số liệu kỹ thuật:

1. **Bước 1**: Sau khi tôi và bạn sửa code xong trong thư mục máy tính.
2. **Bước 2**: Bạn chỉ cần **bấm đúp chuột vào file `push_to_github.bat`**.
3. **Bước 3**: Không cần cấu hình gì thêm! GitHub Pages sẽ tự động nhận diện và làm mới trang web online sau 30 giây.

---

## XỬ LÝ SỰ CỐ THƯỜNG GẶP (TROUBLESHOOTING)

1. **Bật Pages xong nhưng mở link bị báo lỗi `404 Not Found`?**
   - Đợi 60 giây và bấm **Ctrl + F5** (hoặc mở ẩn danh) để xóa cache trình duyệt.
2. **Có cần phải bật máy tính hay mở file `.bat` liên tục không?**
   - **Hoàn toàn KHÔNG!** Sau khi đã đưa lên GitHub Pages, trang web chạy 100% trên máy chủ toàn cầu của GitHub/Microsoft 24/7.
