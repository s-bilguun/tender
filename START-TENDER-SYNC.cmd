@echo off
rem Double-click to install the daily tender sync task and start a sync now.
rem Edge will open and work through tender.gov.mn; leave it running.
cd /d "%~dp0"
echo Installing the daily tender sync (runs every day at 00:15)...
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-windows-worker-task.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. Send Claude a screenshot of this window.
  pause
  exit /b 1
)
echo Starting a sync right now...
powershell -NoProfile -Command "Start-ScheduledTask -TaskName 'TenderMN daily browser sync'"
echo.
echo Done. Edge will open shortly and sync tenders. Logs: scratch\browser-worker
echo You can close this window.
pause
