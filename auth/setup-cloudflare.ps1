# MOSHIMATION ORDER credential server bootstrap (Windows PowerShell)
# This does NOT issue members or activate the public website.
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
function Check-Exit([string]$phase) { if ($LASTEXITCODE -ne 0) { throw "Failed: $phase (exit $LASTEXITCODE)" } }
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw "Install Node.js LTS first." }
if (-not (Get-Command npx -ErrorAction SilentlyContinue)) { throw "npm/npx is required." }
Push-Location $PSScriptRoot
try {
  Write-Host "Step 1: Sign in to Cloudflare in your browser."
  npx --yes wrangler login
  Check-Exit "Cloudflare login"
  $dbId = (Read-Host "D1 database UUID (press Enter to create a NEW database)").Trim()
  if (-not $dbId) {
    Write-Host "Creating D1 database. Copy the database_id UUID from the output."
    npx --yes wrangler d1 create moshimation-credentials
    Check-Exit "Create D1"
    $dbId = (Read-Host "Paste the new database_id UUID").Trim()
  }
  $uuidPattern='^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
  if ($dbId -notmatch $uuidPattern) { throw "Invalid D1 database UUID." }
  $config = Join-Path $PSScriptRoot 'wrangler.toml'
  $toml = [System.IO.File]::ReadAllText($config)
  $toml = [regex]::Replace($toml,'database_id\s*=\s*"[^"]+"',('database_id = "'+$dbId+'"'))
  [System.IO.File]::WriteAllText($config,$toml,(New-Object System.Text.UTF8Encoding($false)))
  Write-Host "Step 2: Apply SQL schema to the remote database."
  npx --yes wrangler d1 execute moshimation-credentials --remote --file=./schema.sql --config=./wrangler.toml
  Check-Exit "Apply D1 schema"
  Write-Host "Step 3: Deploy Worker (not yet connected to the website)."
  npx --yes wrangler deploy --config=./wrangler.toml
  Check-Exit "Deploy Worker"
  Write-Host "Step 4: Create an admin token, save an encrypted local copy, set Cloudflare secret."
  . (Join-Path $PSScriptRoot 'lib/admin-secret.ps1')
  $token=New-AdminToken
  Assert-AdminTokenShape $token
  $secure=ConvertTo-SecureString $token -AsPlainText -Force
  $protected=ConvertFrom-SecureString $secure
  $secretFile=Join-Path $PSScriptRoot "admin-token-DPAPI-PRIVATE.txt"
  [System.IO.File]::WriteAllText($secretFile,$protected)
  # Never pipe the token into wrangler: PowerShell 5.1 appends CRLF, which becomes part of the secret.
  Set-AdminSecret $token './wrangler.toml'
  $token=$null
  Write-Host ""
  Write-Host "BOOTSTRAP COMPLETE (pending live authentication checks)."
  Write-Host "The admin token has been saved encrypted for the current Windows account:"
  Write-Host $secretFile
  Write-Host "Do NOT commit, email, upload, or share that file."
  Write-Host "Copy the workers.dev URL printed above into the deployment checklist."
  Write-Host "Do not issue member 001 or announce until backend and holder approval checks pass."
} finally { Pop-Location }
