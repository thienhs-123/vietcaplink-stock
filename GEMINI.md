# 🤖 ANTIGRAVITY AGENT RULES (VIETCAPLINK STOCK DASHBOARD)

> File này được Antigravity tự động đọc mỗi khi mở dự án trên bất kỳ máy tính nào (máy cơ quan hoặc máy ở nhà).

## 1. QUY TẮC BẮT BUỘC ĐỒNG BỘ 2 MÁY
- **Bắt đầu mọi phiên làm việc**: Agent phải kiểm tra và ưu tiên `git pull origin main` nếu người dùng yêu cầu hoặc trước khi chỉnh sửa.
- **Kết thúc mọi phiên làm việc**: Tự động test kỹ lưỡng, `git commit` rõ ràng và `git push origin main`.
- **Tuyệt đối không dùng lệnh `Copy-Item -Force`**: Không bao giờ copy đè file thô bạo giữa các thư mục hoặc giữa ổ đĩa làm mất code của người dùng.
- **Bảo toàn ngữ cảnh**: Đọc file `PROJECT_MEMORY.md` để hiểu trọn vẹn kiến trúc, API và tiêu chuẩn lọc của dự án.

## 2. QUY TẮC KỸ THUẬT DỰ ÁN
- **Tiêu chuẩn điểm mua**: Luôn tuân thủ Giá > MA10 & MA50 kết hợp 2 tiêu chuẩn nền (Thời gian ≥ 60 phiên, biên độ siết ≤ 20%, thị giá vận động ở nửa trên vùng nền).
- **Headline Ticker & Macro**: Giữ vững các kết nối thời gian thực đến Yahoo Finance (Chỉ số thế giới), Vietcombank (Tỷ giá USD/EUR) và Gold/Oil.
- **Bảo vệ dữ liệu giá**: Không bao giờ để giá cổ phiếu hiển thị chuỗi `"Lỗi"`, luôn có fallback giá xác thực.
