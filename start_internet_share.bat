@echo off
chcp 65001 > nul
title Vietcaplink Stock AI Dashboard - PHAT LINK INTERNET MIEN PHI (CLOUDFLARE TUNNEL)
color 0b

:: Chuyen den dung thu muc chua file script
cd /d "%~dp0"

:: Thiet lap API Key Vnstock
set VNSTOCK_API_KEY=vnstock_fd6806b2490020fd64e6f78bc851c412

echo =======================================================================
echo   VIETCAPLINK STOCK AI DASHBOARD - PHAT LINK INTERNET MIEN PHI
echo =======================================================================
echo   * Cong nghe: Cloudflare Tunnel (Bao mat HTTPS toan cau, 0 DONG)
echo   * Quy mo: VN100 (100 ma CP cap nhat gia va BCTC quy moi nhat)
echo   * KHONG CAN TAI KHOAN, KHONG CAN DANG KY GITHUB HAY RENDER
echo =======================================================================
echo.

:: 1. Kiem tra trinh thong dich Python
set PY_CMD=
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PY_CMD=python
    goto check_node
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PY_CMD=py
    goto check_node
)

echo [CANH BAO] Khong tim thay Python trong he thong!
echo Vui long cai dat Python de khoi dong may chu.
pause
exit /b 1

:check_node
:: 2. Kiem tra Node.js
set NODE_CMD=
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set NODE_CMD=node
)

:: 3. Khoi dong May chu Python Realtime Server tren cong 8088 trong cua so rieng
echo [1/2] Dang khoi dong may chu du lieu VN100 (Port 8088)...
start "Vietcaplink Python VN100 Server (Port 8088)" %PY_CMD% realtime_server.py

:: Doi 3 giay de may chu Python on dinh truoc khi ket noi Internet
timeout /t 3 /nobreak > nul

:: 4. Khoi dong Cloudflare Tunnel
echo [2/2] Dang ket noi Cloudflare de tao duong link HTTPS cong khai...
echo.

if not exist "cloudflared.exe" (
    echo [CANH BAO] Khong tim thay file cloudflared.exe!
    pause
    exit /b 1
)

if "%NODE_CMD%"=="node" (
    node share_tunnel.js
) else (
    echo =======================================================================
    echo   TIM DUONG LINK DANG: https://...trycloudflare.com TRONG CAC DONG DUOI:
    echo =======================================================================
    cloudflared.exe tunnel --url http://127.0.0.1:8088
)

:end
pause
