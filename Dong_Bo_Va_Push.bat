@echo off
chcp 65001 >nul
title Vietcaplink - Đồng bộ code & Lịch sử hội thoại lên GitHub
echo ========================================================
echo  ĐANG ĐỒNG BỘ CODE & LỊCH SỬ HỘI THOẠI LÊN GITHUB...
echo ========================================================
node "%~dp0scripts\sync_and_push.js"
echo.
echo [Xong] Bạn có thể đóng cửa sổ này.
pause
