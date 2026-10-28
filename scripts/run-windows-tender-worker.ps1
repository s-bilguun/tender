$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$logDirectory = Join-Path $repoRoot 'scratch\browser-worker'
$logPath = Join-Path $logDirectory ("worker-{0}.log" -f (Get-Date -Format 'yyyy-MM-dd'))

New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
Set-Location $repoRoot

"`r`n===== Tender worker started $(Get-Date -Format o) =====" | Out-File -FilePath $logPath -Append -Encoding utf8
# Only start the Edge worker when the source answers plain requests; otherwise
# it would sit on a Cloudflare challenge until the task's time limit.
& node.exe (Join-Path $PSScriptRoot 'source-probe.cjs') 2>&1 | Tee-Object -FilePath $logPath -Append
if ($LASTEXITCODE -ne 0) {
  "===== Tender worker skipped $(Get-Date -Format o): source not open to automated requests =====" | Out-File -FilePath $logPath -Append -Encoding utf8
  exit 0
}
& node.exe (Join-Path $PSScriptRoot 'browser-tender-worker.cjs') 2>&1 | Tee-Object -FilePath $logPath -Append
$workerExitCode = $LASTEXITCODE
"===== Tender worker ended $(Get-Date -Format o), exit code $workerExitCode =====" | Out-File -FilePath $logPath -Append -Encoding utf8
exit $workerExitCode
