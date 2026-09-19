[CmdletBinding()]
param()
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$npm = (Get-Command npm.cmd -ErrorAction SilentlyContinue)
if (-not $npm) { $npm = Get-Command npm -ErrorAction Stop }

if (-not (Test-Path .\node_modules)) {
    Write-Host "`n=== npm install ===" -ForegroundColor Cyan
    & $npm.Source install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw 'npm install failed.' }
}

Write-Host "`n=== Orgo Worlds validation ===" -ForegroundColor Cyan
& $npm.Source run validate
if ($LASTEXITCODE -ne 0) { throw 'Orgo Worlds validation failed.' }

Write-Host "`nORGO WORLDS VALIDATION = PASS" -ForegroundColor Green
