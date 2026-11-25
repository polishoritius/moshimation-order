# Generates a fresh member authentication key and stores it ONLY as a DPAPI-encrypted local file.
# Nothing is printed, registered or uploaded. Register it later from the owner's private system.
param([Parameter(Mandatory)][ValidatePattern('^\d{3,6}$')][string]$Number)
$ErrorActionPreference = 'Stop'
$file = Join-Path $PSScriptRoot ("member-$Number-key-DPAPI-PRIVATE.txt")
if (Test-Path -LiteralPath $file) { throw "Refusing to overwrite existing key file: $file (delete it deliberately first)." }
$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
try { $b = New-Object byte[] 32; $rng.GetBytes($b) } finally { $rng.Dispose() }
# 43 url-safe chars: satisfies the Worker's validSecret rule (20-128 chars, [A-Za-z0-9_-]).
$key = [Convert]::ToBase64String($b).TrimEnd('=').Replace('+','-').Replace('/','_')
[System.IO.File]::WriteAllText($file, (ConvertFrom-SecureString (ConvertTo-SecureString $key -AsPlainText -Force)))
$key = $null
Write-Host "Key generated and stored encrypted (current Windows account only): $file"
Write-Host "Not registered. Do not commit, upload or paste it."
