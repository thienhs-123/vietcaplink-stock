@echo off
chcp 65001 > nul
title Vietcaplink Stock AI Dashboard - VN100 Realtime & BCTC Bridge Server
color 0a

:: Chuyen den dung thu muc chua file script (tranh loi chay sai thu muc tren Windows)
cd /d "%~dp0"

:: Thiet lap truc tiep bien moi truong API Key chinh thuc cua Vnstock
set VNSTOCK_API_KEY=vnstock_fd6806b2490020fd64e6f78bc851c412

echo =======================================================================
echo   VIETCAPLINK STOCK AI DASHBOARD - VN100 REALTIME & BCTC BRIDGE SERVER
echo =======================================================================
echo   * Quy mo theo doi: VN100 (100 ma co phieu hang dau HOSE ^& HNX)
echo   * Tan suat dong bo gia: 1 LAN / PHUT (60 giay - Chia 2 batch tranh Rate Limit)
echo   * Dong bo chi so BCTC: Tu dong chay nen, cap nhat P/E, P/B, EPS, ROE
echo   * Kien truc may chu: Multi-threaded (Da luong), Gzip Compression, RAM Cache
echo   * Nguon du lieu: DUY NHAT VNSTOCK (100%% chinh thuc, khong crawl trai phep)
echo   * Vnstock API Key: %VNSTOCK_API_KEY:~0,10%...%VNSTOCK_API_KEY:~-4%
echo   * Cong uu tien: 8088 (Host: 0.0.0.0 - San sang chia se qua mang LAN hoac Tunnel)
echo =======================================================================
echo.

:: 1. Xac dinh trinh thong dich Python
set PY_CMD=
where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PY_CMD=python
    goto check_pkg
)

where py >nul 2>nul
if %ERRORLEVEL% equ 0 (
    set PY_CMD=py
    goto check_pkg
)

echo [CANH BAO] Khong tim thay Python trong PATH he thong!
echo Vui long cai dat Python 3.10 tro len hoac them vao bien PATH.
pause
exit /b 1

:check_pkg
echo [OK] Phat hien trinh chay: %PY_CMD%.exe.
echo.

:: 2. Kiem tra thu vien vnstock trong moi truong Python
%PY_CMD% -c "import vnstock" >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [THONG BAO] Dang cai dat thu vien vnstock chinh thuc...
    %PY_CMD% -m pip install -U --extra-index-url https://vnstocks.com/api/packages vnstock
    echo.
)

:: 3. Khoi dong Server (Server se tu dong mo trinh duyet den dung cong hoat dong)
echo =======================================================================
echo   Dang khoi dong VN100 Bridge Server va dong bo du lieu ban dau...
echo =======================================================================
%PY_CMD% realtime_server.py

:end
pause
