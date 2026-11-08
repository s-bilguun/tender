$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $env:LOCALAPPDATA 'TenderMN\worker.env'
if (-not (Test-Path -LiteralPath $destination)) { throw 'Configure the Supabase worker first.' }
if (Select-String -LiteralPath $destination -Pattern '^ZENROWS_API_KEY=' -Quiet) { throw 'A ZenRows key is already configured. No changes made.' }
$node = Join-Path $repoRoot 'scratch\pdf-worker-runtime\node.exe'
if (-not (Test-Path -LiteralPath $node)) { $node = (Get-Command node.exe -ErrorAction Stop).Source }
Write-Host 'Paste your ZenRows API key. It will be hidden and will not be sent to chat.'
$secureKey = Read-Host 'ZenRows API key' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try { $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer).Trim() } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
try {
  if ($key.Length -lt 10 -or $key -match '[\r\n]') { throw 'The key does not look valid.' }
  $env:ZENROWS_API_KEY = $key
  & $node (Join-Path $PSScriptRoot 'test-zenrows-download.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'The key was not saved because the PDF test did not pass.' }
  [IO.File]::AppendAllText($destination, "`nZENROWS_API_KEY=$key`n", (New-Object Text.UTF8Encoding($false)))
  Write-Host 'ZenRows key saved locally after a successful PDF test.'
} finally { Remove-Item Env:ZENROWS_API_KEY -ErrorAction SilentlyContinue; $key = $null }
