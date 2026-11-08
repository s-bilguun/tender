param([switch]$Enable)
$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) { throw 'Install Node.js 20 or newer.' }
$localEnv = Join-Path $env:LOCALAPPDATA 'TenderMN\worker.env'
if ($Enable -and -not (Test-Path -LiteralPath $localEnv) -and -not (Test-Path (Join-Path $repoRoot '.env.tender-worker'))) { throw 'Configure the local Supabase credentials first.' }
if (-not (Test-Path (Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs'))) { throw 'Run npm ci in the repository first.' }
$runner = Join-Path $PSScriptRoot 'run-active-pdf-sync.ps1'
$action = New-ScheduledTaskAction -Execute (Join-Path $PSHOME 'powershell.exe') -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" -WorkingDirectory $repoRoot
$user = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$logon = New-ScheduledTaskTrigger -AtLogOn -User $user
$hourly = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) -RepetitionInterval (New-TimeSpan -Hours 1) -RepetitionDuration (New-TimeSpan -Days 3650)
$principal = New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 12) -MultipleInstances IgnoreNew
if (Get-ScheduledTask -TaskName 'TenderMN active PDF sync' -ErrorAction SilentlyContinue) { throw 'The task already exists; inspect it before changing it.' }
Register-ScheduledTask -TaskName 'TenderMN active PDF sync' -Action $action -Trigger @($logon, $hourly) -Principal $principal -Settings $settings -Description 'Acquire and process active tender attachments.' | Out-Null
if (-not $Enable) { Disable-ScheduledTask -TaskName 'TenderMN active PDF sync' | Out-Null }
Write-Host "Installed TenderMN active PDF sync. Enabled: $Enable. It checks at sign-in and hourly while this user is signed in; logs: scratch\pdf-sync"
