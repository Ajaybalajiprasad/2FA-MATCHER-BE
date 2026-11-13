import { PGlite } from '@electric-sql/pglite';
import { drizzle, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '../db/schema';
import { seedDatabase } from '../db/seed';

type TestDatabase = PgliteDatabase<typeof schema>;

let client: PGlite | undefined;
let current: TestDatabase | undefined;
let snapshot: Blob | File | undefined;

// Repositories capture `db` at import time, so `db` forwards to whichever PGlite instance is current.
export const db = new Proxy({} as TestDatabase, {
  get(_target, prop) {
    if (!current) throw new Error('Test DB not initialised: call resetDb() first');
    const value = Reflect.get(current, prop, current);
    return typeof value === 'function' ? value.bind(current) : value;
  },
});

export const pool = { end: async () => {} };

export const runMigrations = () => migrate(db, { migrationsFolder: 'drizzle' });

export { schema };

export type Database = TestDatabase;
export type DbOrTx = Database | Parameters<Parameters<Database['transaction']>[0]>[0];

// Migrate + seed once per test file, then restore every reset from a data-dir snapshot (much faster).
export const resetDb = async (): Promise<void> => {
  await client?.close();
  if (!snapshot) {
    client = new PGlite();
    current = drizzle(client, { schema });
    await runMigrations();
    await seedDatabase(db as never);
    snapshot = await client.dumpDataDir('none');
    await client.close();
  }
  client = new PGlite({ loadDataDir: snapshot });
  current = drizzle(client, { schema });
};
