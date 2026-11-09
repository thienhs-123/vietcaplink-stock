@echo off
chcp 65001 >nul
title Vietcaplink - Đồng bộ code & Lịch sử hội thoại lên GitHub
echo ========================================================
echo  ĐANG ĐỒNG BỘ CODE & LỊCH SỬ HỘI THOẠI LÊN GITHUB...
echo ========================================================
powershell.exe -ExecutionPolicy Bypass -File "%~dp0scripts\export_chat_and_push.ps1"
pause
