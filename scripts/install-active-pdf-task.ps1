param([string]$At = '12:15 AM')
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Install Node.js 20 or newer.' }
if (-not (Test-Path (Join-Path $repoRoot '.env.tender-worker'))) { throw 'Create .env.tender-worker with Supabase credentials and your source provider key.' }
if (-not (Test-Path (Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs'))) { throw 'Run npm ci in the repository first.' }
$runner = Join-Path $PSScriptRoot 'run-active-pdf-sync.ps1'
$action = New-ScheduledTaskAction -Execute (Join-Path $PSHOME 'powershell.exe') -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]$At)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 12) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName 'TenderMN active PDF sync' -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Acquire and process active tender attachments.' -Force | Out-Null
Write-Host 'Installed TenderMN active PDF sync. It runs while this Windows user is signed in. Logs: scratch\pdf-sync'
