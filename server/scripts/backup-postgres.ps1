param(
  [string]$SourceDatabaseUrl = $env:SOURCE_DATABASE_URL,
  [string]$OutputPath
)

$ErrorActionPreference = "Stop"

if (-not $SourceDatabaseUrl) {
  throw "SOURCE_DATABASE_URL is required. Set it in your shell or pass -SourceDatabaseUrl."
}

$pgDump = Get-Command pg_dump -ErrorAction SilentlyContinue
if (-not $pgDump) {
  throw "pg_dump was not found. Install PostgreSQL client tools first."
}

$backupDir = Join-Path $PSScriptRoot "..\backups"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (-not $OutputPath) {
  $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
  $OutputPath = Join-Path $backupDir "digichain_$timestamp.bak"
}

Write-Host "Creating backup at $OutputPath"
& $pgDump.Source -Fc -v -d $SourceDatabaseUrl -n public -f $OutputPath

if ($LASTEXITCODE -ne 0) {
  throw "pg_dump failed with exit code $LASTEXITCODE"
}

Write-Host "Backup completed: $OutputPath"
