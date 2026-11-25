// Local development database (no install needed): starts PostgreSQL on port 5433.
// Usage: npm run dev:db, then in another terminal:
//   DATABASE_URL=postgres://ailim:ailim@localhost:5433/ailim npm start
import EmbeddedPostgres from 'embedded-postgres';

const pg = new EmbeddedPostgres({ databaseDir: process.env.DEV_DB_DIR || './.dev-db', user: 'ailim', password: 'ailim', port: 5433, persistent: true });
try { await pg.initialise(); } catch { /* already initialised */ }
await pg.start();
try { await pg.createDatabase('ailim'); } catch { /* exists */ }
console.log('Dev database ready: postgres://ailim:ailim@localhost:5433/ailim');
process.on('SIGINT', async () => { await pg.stop(); process.exit(0); });
