import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { expect, it } from 'vitest';

it('upgrades an existing friends database even when the earlier gender migration was skipped', async () => {
  const client = new PGlite();
  try {
    for (const name of ['0000_init', '0001_messages', '0002_friends']) {
      await client.exec(await readFile(`drizzle/${name}.sql`, 'utf8'));
    }
    await client.exec(`CREATE SCHEMA drizzle;
      CREATE TABLE drizzle.__drizzle_migrations (id serial PRIMARY KEY, hash text NOT NULL, created_at bigint);
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ('previous-friends', 1794582439273);`);
    await migrate(drizzle(client), { migrationsFolder: 'drizzle' });
    const result = await client.query<{ column_name: string }>(
      "SELECT column_name FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'gender_preference'"
    );
    expect(result.rows).toEqual([{ column_name: 'gender_preference' }]);
    // Reapplying the repair must also be safe for a fresh/current installation.
    await client.exec(await readFile('drizzle/0004_repair_group_gender_preference.sql', 'utf8'));
  } finally {
    await client.close();
  }
});
