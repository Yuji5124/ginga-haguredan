@echo off
setlocal

set "PORT=8787"
set "URL=http://localhost:%PORT%/"

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing -Uri '%URL%' -TimeoutSec 1 > $null; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
  where python >nul 2>nul
  if errorlevel 1 (
    echo Python was not found. Please install Python or start a local server manually.
    pause
    exit /b 1
  )

  pushd "%~dp0"
  start "ginga-haguredan server" /min python -m http.server %PORT% --bind 127.0.0.1
  popd
  timeout /t 2 /nobreak >nul
)

start "" "%URL%"
endlocal
