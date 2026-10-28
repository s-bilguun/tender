@echo off
rem Double-click to remove stored PDFs of closed tenders from Supabase.
rem Live tenders keep their PDFs. Shows a preview first; nothing is deleted until you press a key.
cd /d "%~dp0"
echo Checking what would be removed (nothing is deleted yet)...
echo.
node scripts\prune-closed-tender-pdfs.cjs
if errorlevel 1 (
  echo.
  echo The check failed. Send Claude a screenshot of this window.
  pause
  exit /b 1
)
echo.
echo Press any key to DELETE the closed-tender PDFs listed above.
echo To cancel, just close this window.
pause >nul
node scripts\prune-closed-tender-pdfs.cjs --apply
echo.
pause
