# Runs a single load-test scenario end-to-end against a DEDICATED local MongoDB
# database. It never points at the production/Atlas database.
#
# Usage:
#   pwsh -File loadtest/run-scenario.ps1 -Scenario slot-capacity
#   pwsh -File loadtest/run-scenario.ps1 -Scenario stock-race
#   pwsh -File loadtest/run-scenario.ps1 -Scenario idempotency
#   pwsh -File loadtest/run-scenario.ps1 -Scenario baseline
#
# Requirements: Node.js, MongoDB on 127.0.0.1:27017, k6 (https://k6.io).

param(
  [Parameter(Mandatory = $true)]
  [ValidateSet('slot-capacity', 'stock-race', 'idempotency', 'baseline')]
  [string]$Scenario,
  [int]$Port = 5099,
  [string]$LoadTestDb = 'smart_canteen_loadtest'
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$backend = Split-Path $PSScriptRoot -Parent
$resultsDir = Join-Path $root 'results'
New-Item -ItemType Directory -Force -Path $resultsDir | Out-Null

$mongoUri = "mongodb://127.0.0.1:27017/$LoadTestDb"
$jwtSecret = 'loadtest_secret'

$k6 = (Get-Command k6 -ErrorAction SilentlyContinue).Source
if (-not $k6 -and (Test-Path 'C:\Program Files\k6\k6.exe')) { $k6 = 'C:\Program Files\k6\k6.exe' }
if (-not $k6) { throw 'k6 not found on PATH or at C:\Program Files\k6\k6.exe. Install it from https://k6.io.' }

$serverLog = Join-Path $resultsDir "server-$Scenario.log"
$summaryFile = Join-Path $resultsDir "k6-$Scenario-summary.json"

Write-Host "[run] Starting backend on port $Port against $mongoUri"
$env:MONGO_URI = $mongoUri
$env:JWT_SECRET = $jwtSecret
$env:PORT = "$Port"
$env:NODE_ENV = 'development'
$env:CLIENT_ORIGIN = 'http://localhost:3000'

$server = Start-Process -FilePath 'node' -ArgumentList 'src/server.js' -WorkingDirectory $backend `
  -RedirectStandardOutput $serverLog -RedirectStandardError "$serverLog.err" -PassThru -WindowStyle Hidden

try {
  # Wait for the health endpoint before starting the test.
  $healthy = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 500
    try {
      $r = Invoke-WebRequest -UseBasicParsing "http://127.0.0.1:$Port/api/health" -TimeoutSec 2
      if ($r.StatusCode -eq 200) { $healthy = $true; break }
    } catch {}
  }
  if (-not $healthy) { throw "Backend did not become healthy. See $serverLog" }

  $env:LOADTEST_BASE_URL = "http://127.0.0.1:$Port"
  $env:LOADTEST_PORT = "$Port"

  Write-Host "[run] Seeding dedicated load-test data (scenario=$Scenario)"
  & node (Join-Path $root 'setup.js') "--scenario=$Scenario"
  if ($LASTEXITCODE -ne 0) { throw 'setup.js failed' }

  $k6Script = Join-Path $root "k6\$Scenario.js"
  Write-Host "[run] Running k6 scenario $Scenario"
  & $k6 run --summary-export=$summaryFile --quiet $k6Script
  $k6Exit = $LASTEXITCODE

  Write-Host "[run] Verifying DB invariants"
  & node (Join-Path $root 'verify.js')
  $verifyExit = $LASTEXITCODE

  Write-Host "[run] Done. k6 exit=$k6Exit, verify exit=$verifyExit"
  Write-Host "[run] Summary: $summaryFile"
} finally {
  if ($server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
    Write-Host "[run] Backend stopped (pid $($server.Id))"
  }
}
