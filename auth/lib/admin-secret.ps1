# Helpers for creating and delivering the ADMIN_TOKEN without trailing whitespace.
# Windows PowerShell 5.1 appends CRLF when a string is piped to a native command,
# which would be stored as part of the secret and break the exact Bearer comparison.
Set-StrictMode -Version Latest

function New-AdminToken {
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try { $bytes = New-Object byte[] 32; $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
}

function Assert-AdminTokenShape([string]$Token) {
  if ($Token -notmatch '^[A-Za-z0-9_-]{43}$') { throw "Admin token has an unexpected shape (whitespace or wrong length)." }
}

# Writes the token to a temp file as exact UTF-8 bytes (no BOM, no newline) and returns the path.
function Write-TokenStdinFile([string]$Token) {
  Assert-AdminTokenShape $Token
  $path = Join-Path ([System.IO.Path]::GetTempPath()) ("mo-admin-" + [Guid]::NewGuid().ToString('N') + ".tmp")
  [System.IO.File]::WriteAllBytes($path, (New-Object System.Text.UTF8Encoding($false)).GetBytes($Token))
  return $path
}

# Sets the Cloudflare secret by redirecting the file to stdin (cmd keeps the bytes as-is).
function Set-AdminSecret([string]$Token, [string]$Config = './wrangler.toml') {
  $file = Write-TokenStdinFile $Token
  try {
    cmd /c "npx --yes wrangler secret put ADMIN_TOKEN --config=$Config < `"$file`""
    if ($LASTEXITCODE -ne 0) { throw "Failed: Set admin secret (exit $LASTEXITCODE)" }
  } finally { Remove-Item -LiteralPath $file -Force -ErrorAction SilentlyContinue }
}
