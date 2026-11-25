# Regression tests: ADMIN_TOKEN must never be delivered with a trailing newline.
# Run: powershell -NoProfile -File auth/tests/admin-secret.tests.ps1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '../lib/admin-secret.ps1')
$fail = 0
function Check([string]$name, [bool]$ok) { if ($ok) { "PASS $name" } else { "FAIL $name"; $script:fail++ } }

$t = New-AdminToken
Check 'token shape (43 url-safe chars, no whitespace)' ($t -match '^[A-Za-z0-9_-]{43}$')
Check 'tokens are unique' ((New-AdminToken) -ne (New-AdminToken))

$f = Write-TokenStdinFile $t
$bytes = [System.IO.File]::ReadAllBytes($f)
Remove-Item -LiteralPath $f -Force
Check 'stdin file has exact token length (no CR/LF/BOM)' ($bytes.Length -eq 43)
Check 'stdin file contains no CR or LF' (-not ($bytes -contains 10) -and -not ($bytes -contains 13))
Check 'stdin file equals token bytes' ([System.Text.Encoding]::UTF8.GetString($bytes) -ceq $t)

$threw = $false; try { Assert-AdminTokenShape ($t + "`r`n") } catch { $threw = $true }
Check 'token with CRLF is rejected' $threw

$setup = Get-Content (Join-Path $PSScriptRoot '../setup-cloudflare.ps1') -Raw
Check 'setup script does not pipe the token to native wrangler' ($setup -notmatch '\$token\s*\|\s*npx')
Check 'setup script uses Set-AdminSecret' ($setup -match 'Set-AdminSecret')

$t = $null
if ($fail -gt 0) { "$fail test(s) failed"; exit 1 } else { 'all passed' }
