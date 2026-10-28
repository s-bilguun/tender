@echo off
cd /d "%~dp0"
if not exist pdf-inbox mkdir pdf-inbox
echo Put tender PDFs in: %cd%\pdf-inbox  (file name = tender ID, e.g. 1792928904122.pdf)
echo.
node scripts\import-pdf-folder.cjs
echo.
pause
