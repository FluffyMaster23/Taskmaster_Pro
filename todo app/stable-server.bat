@echo off
setlocal enabledelayedexpansion
echo ========================================
echo TaskMaster Pro - Stable Server Launcher
echo ========================================
echo.

REM Get current IP address
for /f "tokens=2 delims=:" %%i in ('ipconfig ^| findstr /c:"IPv4 Address"') do (
    set IP=%%i
    set IP=!IP: =!
    if not "!IP!"=="" (
        echo Your current IP address: !IP!
        echo.
        echo Access TaskMaster Pro from iPhone:
        echo http://!IP!:8000
        echo.
        goto :found
    )
)

:found
echo ========================================
echo Starting TaskMaster Pro server...
echo Press Ctrl+C to stop server
echo ========================================
echo.

:restart
echo Starting server (restart if it crashes)...
python -m http.server 8000 --bind 0.0.0.0
echo.
echo Server stopped! Restarting in 3 seconds...
timeout /t 3 /nobreak >nul
goto restart