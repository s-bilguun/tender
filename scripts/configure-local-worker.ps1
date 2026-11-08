$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$directory = Join-Path $env:LOCALAPPDATA 'TenderMN'
$destination = Join-Path $directory 'worker.env'
if (Test-Path -LiteralPath $destination) { throw 'Local worker credentials already exist. They were not changed.' }
$nodePath = Join-Path $repoRoot 'scratch\pdf-worker-runtime\node.exe'
if (-not (Test-Path -LiteralPath $nodePath)) { $nodePath = (Get-Command node.exe -ErrorAction Stop).Source }
Write-Host 'Enter the Supabase project URL and service-role/secret key. The key is hidden and is not sent to chat.'
$url = (Read-Host 'Supabase project URL').Trim().TrimEnd('/')
if ($url -notmatch '^https://[a-z0-9-]+\.supabase\.co$') { throw 'The project URL must look like https://project-id.supabase.co.' }
$secureKey = Read-Host 'Supabase service-role or secret key' -AsSecureString
$pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureKey)
try { $key = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) } finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
try {
  if ($key.Length -lt 32 -or $key -match '[\r\n]') { throw 'The key does not look valid.' }
  $env:SUPABASE_URL = $url
  $env:SUPABASE_SERVICE_ROLE_KEY = $key
  & $nodePath (Join-Path $PSScriptRoot 'verify-local-supabase.cjs')
  if ($LASTEXITCODE -ne 0) { throw 'Credentials were not saved because verification failed.' }
  New-Item -ItemType Directory -Path $directory -Force | Out-Null
  $stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
  try {
    $writer = New-Object IO.StreamWriter($stream, (New-Object Text.UTF8Encoding($false)))
    try { $writer.Write("SUPABASE_URL=$url`nSUPABASE_SERVICE_ROLE_KEY=$key`n") } finally { $writer.Dispose() }
  } finally { $stream.Dispose() }
  Write-Host "Credentials saved locally at $destination. The scheduled task remains disabled until the source download test passes."
} finally {
  Remove-Item Env:SUPABASE_URL,Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
  $key = $null
}
