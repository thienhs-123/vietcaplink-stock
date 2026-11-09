@echo off
chcp 65001 >nul
title Kích hoạt chế độ hỏi Git Push khi tắt Antigravity
echo ========================================================
echo  ĐANG KÍCH HOẠT CHẾ ĐỘ GIÁM SÁT ANTIGRAVITY (CHẠY ẨN)...
echo  Mỗi khi tắt Antigravity, hệ thống sẽ tự động hiện thông báo hỏi Git Push.
echo ========================================================
cscript //nologo "%~dp0Khoi_Dong_Watcher_Ngam.vbs"
echo.
echo [OK] ĐÃ KÍCH HOẠT CHẠY ẨN THÀNH CÔNG!
echo Bạn có thể đóng cửa sổ này và yên tâm làm việc.
echo Khi bạn bấm tắt Antigravity, hộp thoại thông báo sẽ tự động bật lên.
timeout /t 3 >nul
