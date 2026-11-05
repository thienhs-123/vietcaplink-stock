@echo off
chcp 65001 >nul
title ĐẨY MÃ NGUỒN LÊN GITHUB - VIETCAPLINK
color 0A

echo ================================================================
echo      TIẾN TRÌNH ĐẨY MÃ NGUỒN LÊN GITHUB (VIETCAPLINK)
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/3] Đang kiểm tra và đóng gói các tệp mã nguồn...
git add .
git commit -m "Deploy stock AI dashboard to Render" >nul 2>&1

echo [2/3] Đang kiểm tra nhánh main...
git branch -M main

echo [3/3] Đang kết nối và tải lên kho GitHub:
echo       https://github.com/thienhs-123/vietcaplink-stock.git
echo.
echo * Luu y: Neu trinh duyet bat len tab hoi xac nhan GitHub,
echo          ban hay bam nut "Authorize" de cho phep nhe!
echo.

git push -u origin main

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ================================================================
    echo  [THANH CONG] Toan bo ma nguon da duoc day len GitHub an toan!
    echo ================================================================
) else (
    echo.
    echo ================================================================
    echo  [CHU Y] Neu chua dang nhap GitHub tren may nay, ban hay dang
    echo         nhap theo huong dan tren trinh duyet roi bam chay lai nhe.
    echo ================================================================
)

echo.
pause
