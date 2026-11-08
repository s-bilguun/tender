$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot 'scratch\pdf-sync'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir ('sync-{0}.log' -f (Get-Date -Format 'yyyy-MM-dd'))
$successFile = Join-Path $logDir 'last-success.txt'
$attemptFile = Join-Path $logDir 'last-attempt.txt'
$now = [DateTime]::UtcNow
function IsRecent([string]$Path, [TimeSpan]$Window) {
  if (-not (Test-Path -LiteralPath $Path)) { return $false }
  try {
    $date = [DateTime]::Parse((Get-Content -LiteralPath $Path -Raw), [Globalization.CultureInfo]::InvariantCulture, [Globalization.DateTimeStyles]::RoundtripKind).ToUniversalTime()
    return (($now - $date) -lt $Window -and $date -le $now)
  } catch { return $false }
}
if (IsRecent $successFile (New-TimeSpan -Hours 24)) { exit 0 }
if (IsRecent $attemptFile (New-TimeSpan -Hours 3)) { exit 0 }
# A manually started backlog can outlive this scheduler. Do not start another
# browser against the same profile or duplicate its provider requests.
$otherWorker = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*browser-tender-worker.cjs*' }
if ($otherWorker) { exit 0 }
$now.ToString('o') | Set-Content -LiteralPath $attemptFile -Encoding ASCII
Set-Location $repoRoot
$localEnv = Join-Path $env:LOCALAPPDATA 'TenderMN\worker.env'
if (-not $env:TENDER_WORKER_ENV_FILE -and (Test-Path -LiteralPath $localEnv)) { $env:TENDER_WORKER_ENV_FILE = $localEnv }
$nodePath = Join-Path $repoRoot 'scratch\pdf-worker-runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
$version = & $nodePath --version
if ($version -notmatch '^v(\d+)' -or [int]$Matches[1] -lt 20) { throw 'The worker needs Node.js 20 or newer.' }
$env:TENDER_BROWSER_ACTIVE_PDFS = 'true'
& $nodePath (Join-Path $PSScriptRoot 'browser-tender-worker.cjs') 2>&1 | Tee-Object -FilePath $log -Append
$syncExit = $LASTEXITCODE
if ($syncExit -eq 0) { [DateTime]::UtcNow.ToString('o') | Set-Content -LiteralPath $successFile -Encoding ASCII }
exit $syncExit
