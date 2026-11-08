$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$logDir = Join-Path $repoRoot 'scratch\pdf-sync'
New-Item -ItemType Directory -Path $logDir -Force | Out-Null
$log = Join-Path $logDir ('sync-{0}.log' -f (Get-Date -Format 'yyyy-MM-dd'))
Set-Location $repoRoot
& node.exe (Join-Path $repoRoot 'node_modules\tsx\dist\cli.mjs') (Join-Path $PSScriptRoot 'sync-active-pdfs.ts') --all --concurrency 1 2>&1 | Tee-Object -FilePath $log -Append
exit $LASTEXITCODE
