# All database tests use disposable Testcontainers PostgreSQL instances, never .env.
[CmdletBinding()]
param (
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$MavenArgs
)

$ErrorActionPreference = "Stop"
$backendDir = Join-Path (Split-Path -Parent $PSScriptRoot) "backend"
$testExitCode = 1
$previousTestProfiles = $env:SPRING_PROFILES_ACTIVE
$env:SPRING_PROFILES_ACTIVE = "test"

Push-Location -LiteralPath $backendDir
try {
    Write-Host "Running Maven tests against isolated PostgreSQL containers..." -ForegroundColor Cyan
    & ".\mvnw.cmd" clean test @MavenArgs
    $testExitCode = $LASTEXITCODE
} finally {
    $env:SPRING_PROFILES_ACTIVE = $previousTestProfiles
    Pop-Location
}

exit $testExitCode
