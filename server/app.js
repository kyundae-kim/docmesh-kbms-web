import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { proxyRequest } from './proxy.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultStaticDirectory = path.resolve(serverDirectory, '../dist');

export function createApp({
  upstreamUrl = process.env.KBMS_API_URL || 'http://kbms:8000',
  fetchImpl = globalThis.fetch,
  staticDirectory = defaultStaticDirectory,
} = {}) {
  const app = express();
  app.disable('x-powered-by');

  const forward = async (req, res) => {
    await proxyRequest(req, res, {
      upstreamUrl,
      requestPath: req.originalUrl,
      fetchImpl,
    });
  };

  // FastAPI's generated documentation refers to these paths from the site root.
  // Keep root aliases as well as /api/* so Swagger and ReDoc remain usable.
  app.use(['/openapi.json', '/docs', '/redoc'], forward);

  // Keep the request stream untouched: multipart uploads are forwarded byte-for-byte.
  app.use('/api', async (req, res) => {
    const requestPath = req.originalUrl.replace(/^\/api(?=\/|\?|$)/, '') || '/';
    await proxyRequest(req, res, { upstreamUrl, requestPath, fetchImpl });
  });

  if (fs.existsSync(staticDirectory)) {
    app.use(express.static(staticDirectory, { index: 'index.html' }));
    const indexPath = path.join(staticDirectory, 'index.html');
    app.get(/^(?!\/api(?:\/|$)).*/, (req, res) => {
      res.sendFile(indexPath);
    });
  }

  app.use((req, res) => {
    res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
  });

  return app;
}
