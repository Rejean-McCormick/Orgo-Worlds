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

Write-Host "`n=== Static Worlds gate ===" -ForegroundColor Cyan
& $npm.Source run check:worlds
if ($LASTEXITCODE -ne 0) { throw 'Static Worlds gate failed.' }

Write-Host "`n=== Starting standalone API ===" -ForegroundColor Cyan
$api = Start-Process -FilePath $npm.Source -ArgumentList @('run', 'dev:api') -WorkingDirectory $Root -PassThru

Write-Host "`n=== Starting standalone web ===" -ForegroundColor Cyan
$web = Start-Process -FilePath $npm.Source -ArgumentList @('run', 'dev:web') -WorkingDirectory $Root -PassThru

Write-Host "`nORGO WORLDS = STARTED" -ForegroundColor Green
Write-Host 'Web : http://127.0.0.1:3100/worlds'
Write-Host 'API : http://127.0.0.1:4100/api'
Write-Host "API PID: $($api.Id) · Web PID: $($web.Id)"
Write-Host 'State: runtime\orgo-worlds-state.json'
