import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import { migrate, cleanup } from './db.js';
import { loadUser, sameOriginOnly } from './auth.js';
import { api } from './routes.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // Inline style attributes are used for small layout tweaks; scripts stay strictly same-origin.
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", 'data:'],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(compression());
app.use(express.json({ limit: '20kb' }));

app.use('/api', sameOriginOnly, loadUser, api);

app.use(express.static(path.join(root, 'public'), {
  index: false,
  setHeaders(res, file) {
    if (/\.(js|css|json)$/.test(file)) res.setHeader('Cache-Control', 'no-cache');
  },
}));

// Single-page app: every non-API route returns index.html.
app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(root, 'public', 'index.html')));

// Error handler: log details on the server, send a neutral code to the client.
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'bad_json' });
  console.error(err);
  res.status(500).json({ error: 'server_error' });
});

const port = Number(process.env.PORT) || 3000;
await migrate();
setInterval(() => cleanup().catch((e) => console.error('cleanup failed', e.message)), 6 * 3600_000).unref();
app.listen(port, () => console.log(`Ailim is running on http://localhost:${port}`));
