# scripts/run-backend.ps1
# Helper script to launch OpenShelf Spring Boot backend with local .env variables
[CmdletBinding()]
param (
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$MavenArgs
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir
$envFile = Join-Path $rootDir ".env"

if (-not (Test-Path $envFile)) {
    Write-Warning "No .env file found in root directory ($rootDir). Falling back to defaults."
    Write-Warning "To create one, copy .env.example to .env and adjust values."
} else {
    Write-Host "Loading environment variables from .env..." -ForegroundColor Cyan
    $allowedKeys = @(
        "POSTGRES_DB",
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_PORT",
        "POSTGRES_HOST",
        "SPRING_PROFILES_ACTIVE",
        "SERVER_PORT"
    )

    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not ($line.StartsWith("#"))) {
            $equalsIndex = $line.IndexOf("=")
            if ($equalsIndex -gt 0) {
                $key = $line.Substring(0, $equalsIndex).Trim()
                $val = $line.Substring($equalsIndex + 1).Trim()
                if ($val.StartsWith('"') -and $val.EndsWith('"')) {
                    $val = $val.Substring(1, $val.Length - 2)
                } elseif ($val.StartsWith("'") -and $val.EndsWith("'")) {
                    $val = $val.Substring(1, $val.Length - 2)
                }

                if ($allowedKeys -contains $key) {
                    [System.Environment]::SetEnvironmentVariable($key, $val, "Process")
                }
            }
        }
    }
    Write-Host "Environment variables safely loaded into current process." -ForegroundColor Green
}

$backendDir = Join-Path $rootDir "backend"
Set-Location $backendDir

Write-Host "Starting Spring Boot application via Maven Wrapper..." -ForegroundColor Cyan
if ($MavenArgs) {
    & ".\mvnw.cmd" spring-boot:run $MavenArgs
} else {
    & ".\mvnw.cmd" spring-boot:run
}
