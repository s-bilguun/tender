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
$now.ToString('o') | Set-Content -LiteralPath $attemptFile -Encoding ASCII
Set-Location $repoRoot
& node.exe (Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs') (Join-Path $PSScriptRoot 'sync-active-pdfs.ts') --all --concurrency 1 2>&1 | Tee-Object -FilePath $log -Append
$syncExit = $LASTEXITCODE
if ($syncExit -eq 0) { [DateTime]::UtcNow.ToString('o') | Set-Content -LiteralPath $successFile -Encoding ASCII }
exit $syncExit
