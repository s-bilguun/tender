param(
  [string]$At = '12:15 AM'
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$runnerPath = Join-Path $PSScriptRoot 'run-windows-tender-worker.ps1'
$powershellPath = Join-Path $PSHOME 'powershell.exe'
$taskName = 'TenderMN daily browser sync'

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
  throw 'Node.js was not found. Install Node.js 20 or newer, then reopen PowerShell.'
}
if (-not (Test-Path (Join-Path $repoRoot '.env.tender-worker'))) {
  throw "Create $repoRoot\.env.tender-worker with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first."
}

$action = New-ScheduledTaskAction -Execute $powershellPath -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runnerPath`"" -WorkingDirectory $repoRoot
$trigger = New-ScheduledTaskTrigger -Daily -At ([datetime]$At)
$principal = New-ScheduledTaskPrincipal -UserId ([System.Security.Principal.WindowsIdentity]::GetCurrent().Name) -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -WakeToRun -ExecutionTimeLimit (New-TimeSpan -Hours 12) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Settings $settings -Description 'Sync public tender listings and extract official PDFs through a visible Microsoft Edge session.' -Force | Out-Null
Write-Host "Installed '$taskName' at $At local time. It runs only while this Windows user is signed in so Edge can access the source site."
Write-Host "Run it once now with: Start-ScheduledTask -TaskName '$taskName'"
Write-Host "Logs: $repoRoot\scratch\browser-worker"
