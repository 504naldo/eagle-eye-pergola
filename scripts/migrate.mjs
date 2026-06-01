/**
 * Applies all pending Drizzle migrations to the MySQL database.
 * Run automatically by docker-entrypoint.sh on every container start.
 */
import 'dotenv/config';
import { createConnection } from 'mysql2/promise';
import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('[migrate] DATABASE_URL is not set.');
  process.exit(1);
}

const connection = await createConnection(url);
const db = drizzle(connection);

await migrate(db, { migrationsFolder: './drizzle' });

await connection.end();
console.log('[migrate] All migrations applied successfully.');
