$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot 'scratch\pdf-sync'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir ('backfill-{0}.log' -f (Get-Date -Format 'yyyy-MM-dd'))
Set-Location $repoRoot
$env:TENDER_WORKER_ENV_FILE = Join-Path $env:LOCALAPPDATA 'TenderMN\worker.env'
$env:TENDER_SKIP_LISTING_SYNC = 'true'
$env:TENDER_BROWSER_ACTIVE_PDFS = 'true'
$node = Join-Path $repoRoot 'scratch\pdf-worker-runtime\node.exe'
if (-not (Test-Path -LiteralPath $node)) { $node = (Get-Command node.exe -ErrorAction Stop).Source }
# Native programs write warnings to stderr. PowerShell 5 treats those records
# as errors with Stop, aborting the worker even when Node is still healthy.
$ErrorActionPreference = 'Continue'
& $node (Join-Path $PSScriptRoot 'browser-tender-worker.cjs') 2>&1 | Tee-Object -FilePath $log -Append
$workerExit = $LASTEXITCODE
exit $workerExit
