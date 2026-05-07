param(
  [string]$TargetDatabaseUrl = $env:TARGET_DATABASE_URL,
  [string]$BackupPath
)

$ErrorActionPreference = "Stop"

if (-not $TargetDatabaseUrl) {
  throw "TARGET_DATABASE_URL is required. Set it in your shell or pass -TargetDatabaseUrl."
}

if (-not $BackupPath) {
  throw "BackupPath is required. Pass the .bak file you want to restore."
}

if (-not (Test-Path -LiteralPath $BackupPath)) {
  throw "Backup file not found: $BackupPath"
}

$pgRestore = Get-Command pg_restore -ErrorAction SilentlyContinue
if (-not $pgRestore) {
  throw "pg_restore was not found. Install PostgreSQL client tools first."
}

Write-Host "Restoring backup into target database"
Write-Host "Safety note: restore into a fresh empty database to avoid conflicts."
& $pgRestore.Source --no-owner --no-privileges -v -d $TargetDatabaseUrl $BackupPath

if ($LASTEXITCODE -ne 0) {
  throw "pg_restore failed with exit code $LASTEXITCODE"
}

Write-Host "Restore completed successfully."
