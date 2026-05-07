# Move DigiChain From Prisma Postgres To Neon Free

This path keeps your current data safe by copying it first and only switching the app after verification.

## Before you start

- Do not delete your current Prisma Postgres database.
- Do not run `prisma migrate reset`.
- Restore into a fresh empty Neon database.
- Keep the old database untouched for at least a few days after cutover.

## 1. Create your Neon database

Create a free Neon project and copy its direct database URL.

What you need:
- Current Prisma/Postgres `DATABASE_URL`
- New Neon `DATABASE_URL`

Your Prisma schema already uses standard PostgreSQL:
- [server/prisma/schema.prisma](../server/prisma/schema.prisma)

## 2. Install PostgreSQL client tools on Windows

This machine currently does not have `pg_dump` or `pg_restore`.

Install one of these:
- PostgreSQL from the official installer
- `winget install PostgreSQL.PostgreSQL`

After install, reopen PowerShell and confirm:

```powershell
pg_dump --version
pg_restore --version
```

## 3. Back up the current database

From the `server` folder:

```powershell
$env:SOURCE_DATABASE_URL="YOUR_OLD_DATABASE_URL"
npm run db:backup
```

This creates a `.bak` file in `server/backups`.

You can also choose the output path:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/backup-postgres.ps1 `
  -SourceDatabaseUrl "YOUR_OLD_DATABASE_URL" `
  -OutputPath ".\backups\digichain-manual.bak"
```

## 4. Restore into Neon

Create a fresh empty database in Neon, then run:

```powershell
$env:TARGET_DATABASE_URL="YOUR_NEW_NEON_DATABASE_URL"
npm run db:restore -- -BackupPath ".\backups\YOUR_BACKUP_FILE.bak"
```

Or directly:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/restore-postgres.ps1 `
  -TargetDatabaseUrl "YOUR_NEW_NEON_DATABASE_URL" `
  -BackupPath ".\backups\YOUR_BACKUP_FILE.bak"
```

## 5. Point the app to Neon

Update the server environment:

```env
DATABASE_URL="YOUR_NEW_NEON_DATABASE_URL"
```

Then regenerate Prisma client:

```powershell
cd server
npm install
npx prisma generate
```

## 6. Verify before cutover

Check these screens carefully:
- Login still works
- Users list loads
- Attendance history loads
- Sign in / sign out works
- Tasks load and comments work
- Messages/channels load
- Leaves, documents, meetings, announcements load

You can also verify with Prisma Studio:

```powershell
cd server
npx prisma studio
```

## 7. Safe cutover order

1. Back up old DB.
2. Restore to Neon.
3. Test locally with Neon `DATABASE_URL`.
4. Update production `DATABASE_URL`.
5. Verify production.
6. Keep the old DB unchanged as rollback.

## 8. Rollback plan

If anything looks wrong after cutover:

1. Put the old Prisma/Postgres `DATABASE_URL` back.
2. Restart the server.
3. Investigate Neon data separately.

Because this process copies data first, rollback is just switching the connection string back.

## 9. Recommended zero-cost hygiene

Free plans are okay for small usage, but protect yourself:

- Keep one local `.bak` backup
- Keep one copy in Google Drive or another cloud folder
- Take a backup before any schema change
- Take a backup before any production deploy

## 10. Current app note

This app does a full app-data load during session restore and also sends presence updates every minute:
- [src/context/AppContext.jsx](../src/context/AppContext.jsx)

That means moving to Neon helps, but reducing query volume later will still matter.
