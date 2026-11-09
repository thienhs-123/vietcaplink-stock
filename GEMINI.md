# 🤖 ANTIGRAVITY AGENT RULES (VIETCAPLINK STOCK DASHBOARD)

> File này được Antigravity tự động đọc mỗi khi mở dự án trên bất kỳ máy tính nào (máy cơ quan hoặc máy ở nhà).

## 1. QUY TẮC BẮT BUỘC ĐỒNG BỘ 2 MÁY
- **Bắt đầu mọi phiên làm việc**: Agent phải kiểm tra và ưu tiên `git pull origin main` nếu người dùng yêu cầu hoặc trước khi chỉnh sửa.
- **Kết thúc mọi phiên làm việc**: Tự động test kỹ lưỡng, `git commit` rõ ràng và `git push origin main`.
- **Tuyệt đối không dùng lệnh `Copy-Item -Force`**: Không bao giờ copy đè file thô bạo giữa các thư mục hoặc giữa ổ đĩa làm mất code của người dùng.
- **Bảo toàn ngữ cảnh**: Đọc file `PROJECT_MEMORY.md` để hiểu trọn vẹn kiến trúc, API và tiêu chuẩn lọc của dự án.

## 2. QUY TRÌNH CROSS-CHECK & KIỂM TRA CHÉO BẮT BUỘC (VERIFICATION PROTOCOL)
- **Kiểm soát phạm vi nghiêm ngặt (Scope Boundary)**: Chỉ can thiệp đúng các thành phần nằm trong phạm vi yêu cầu của task. TUYỆT ĐỐI KHÔNG tự ý điều chỉnh, ghi đè hay làm sai lệch các điều kiện, bộ lọc hoặc tính năng khác không liên quan.
- **Rà soát Git Diff trước khi Commit (Diff Inspection)**: Luôn chạy `git diff` để tự kiểm tra chéo từng dòng code thay đổi, đảm bảo không có bất kỳ dòng code ngoài ý muốn nào bị sửa nhầm.
- **Kiểm thử tự động bắt buộc (Automated Verification)**: Phải chạy bộ test tự động (như `verify_screener_engine.js`, `verify_ticker_macro.js`) để xác nhận không có lỗi cú pháp hay logic hồi quy (regression) trước khi hoàn tất task.
- **Đối chiếu danh sách yêu cầu (Requirements Checklist)**: Trước khi báo cáo hoàn thành, Agent phải tự kiểm tra chéo từng tiêu chí trong yêu cầu của người dùng xem đã được thực hiện chính xác và đầy đủ chưa.

## 3. QUY TẮC KỸ THUẬT DỰ ÁN
- **Tiêu chuẩn điểm mua**: Luôn tuân thủ Giá > MA10 & MA50 kết hợp 2 tiêu chuẩn nền (Thời gian ≥ 60 phiên, biên độ siết ≤ 20%, thị giá vận động ở nửa trên vùng nền).
- **Headline Ticker & Macro**: Giữ vững các kết nối thời gian thực đến Yahoo Finance (Chỉ số thế giới), Vietcombank (Tỷ giá USD/EUR) và Gold/Oil.
- **Bảo vệ dữ liệu giá**: Không bao giờ để giá cổ phiếu hiển thị chuỗi `"Lỗi"`, luôn có fallback giá xác thực.
