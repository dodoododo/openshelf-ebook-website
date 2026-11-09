# scripts/test-backend.ps1
# Helper script to execute backend Maven tests with local .env variables
[CmdletBinding()]
param (
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$MavenArgs
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$rootDir = Split-Path -Parent $scriptDir
$envFile = Join-Path $rootDir ".env"

if (Test-Path $envFile) {
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
}

$backendDir = Join-Path $rootDir "backend"
Set-Location $backendDir

Write-Host "Running Maven tests..." -ForegroundColor Cyan
if ($MavenArgs) {
    & ".\mvnw.cmd" clean test $MavenArgs
} else {
    & ".\mvnw.cmd" clean test
}
