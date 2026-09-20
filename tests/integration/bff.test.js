import http from 'node:http';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

let upstream;
let upstreamUrl;
let app;
let received = [];

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(payload);
}

beforeAll(async () => {
  upstream = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks);
      received.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body,
      });

      if (req.url === '/health') return sendJson(res, 200, { status: 'ok' });
      if (req.url === '/openapi.json') {
        return sendJson(res, 200, { info: { title: 'fake', version: '0.1.0' }, paths: {} });
      }
      if (req.url === '/documents' && req.method === 'POST') {
        return sendJson(res, 201, { document_id: 'doc-123', metadata: {}, created: true });
      }
      if (req.url === '/documents?limit=50') {
        return sendJson(res, 200, { items: [], next_cursor: null, has_more: false });
      }
      if (req.url === '/documents/doc-123/status') {
        return sendJson(res, 200, {
          document_id: 'doc-123', status: 'indexed', chunks_count: 1, error: null,
          updated_at: '2026-01-01T00:00:00+00:00',
        });
      }
      if (req.url === '/documents/doc-123' && req.method === 'GET') {
        return sendJson(res, 200, { document_id: 'doc-123', filename: 'guide.txt' });
      }
      if (req.url === '/documents/doc-123/content') {
        res.writeHead(200, {
          'content-type': 'text/plain',
          'content-disposition': 'attachment; filename="guide.txt"',
        });
        return res.end('knowledge document');
      }
      if (req.url === '/search' && req.method === 'POST') {
        return sendJson(res, 200, [{ document_id: 'doc-123', text: 'knowledge document', score: 1 }]);
      }
      if (req.url === '/documents/doc-123?hard_delete=true' && req.method === 'DELETE') {
        res.writeHead(204);
        return res.end();
      }
      if (req.url?.startsWith('/docs') || req.url?.startsWith('/redoc')) {
        res.writeHead(200, { 'content-type': 'text/html' });
        return res.end('<!doctype html><title>Docs</title>');
      }
      return sendJson(res, 404, { detail: 'not found' });
    });
  });
  await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
  upstreamUrl = `http://127.0.0.1:${upstream.address().port}`;
  app = createApp({ upstreamUrl });
});

afterAll(async () => {
  await new Promise((resolve, reject) => upstream.close((error) => (error ? reject(error) : resolve())));
});

describe('BFF public API', () => {
  it('proxies health, OpenAPI, and framework documentation endpoints', async () => {
    await request(app).get('/api/health').expect(200, { status: 'ok' });
    await request(app).get('/api/openapi.json').expect(200);
    await request(app).get('/api/docs').expect(200).expect('Content-Type', /html/);
    await request(app).get('/api/docs/oauth2-redirect').expect(200).expect('Content-Type', /html/);
    await request(app).get('/api/redoc').expect(200).expect('Content-Type', /html/);
    await request(app).get('/openapi.json').expect(200);
    await request(app).get('/docs').expect(200).expect('Content-Type', /html/);
    await request(app).get('/redoc').expect(200).expect('Content-Type', /html/);
    expect(received.map((entry) => entry.url)).toEqual([
      '/health', '/openapi.json', '/docs', '/docs/oauth2-redirect', '/redoc',
      '/openapi.json', '/docs', '/redoc',
    ]);
  });

  it('proxies multipart upload without parsing or changing the request', async () => {
    const response = await request(app)
      .post('/api/documents')
      .field('title', 'Platform guide')
      .field('source_uri', 'https://example.test/guide')
      .field('document_id', 'doc-123')
      .field('metadata', JSON.stringify({ team: 'platform' }))
      .attach('file', Buffer.from('knowledge document'), {
        filename: 'guide.txt',
        contentType: 'text/plain',
      })
      .expect(201);

    expect(response.body.created).toBe(true);
    const upload = received.find(
      (entry) => entry.method === 'POST' && entry.url === '/documents',
    );
    expect(upload.headers['content-type']).toMatch(/multipart\/form-data/);
    expect(upload.body.toString()).toContain('Platform guide');
    expect(upload.body.toString()).toContain('knowledge document');
  });

  it('proxies list, status, metadata, content download, search, and delete', async () => {
    await request(app).get('/api/documents?limit=50').expect(200);
    await request(app).get('/api/documents/doc-123/status').expect(200);
    await request(app).get('/api/documents/doc-123').expect(200);

    const content = await request(app)
      .get('/api/documents/doc-123/content')
      .expect(200)
      .expect('Content-Type', /text\/plain/)
      .expect('Content-Disposition', /guide\.txt/);
    expect(content.text).toBe('knowledge document');

    await request(app)
      .post('/api/search')
      .send({ query: 'knowledge', limit: 5 })
      .expect(200)
      .expect([{ document_id: 'doc-123', text: 'knowledge document', score: 1 }]);

    await request(app)
      .delete('/api/documents/doc-123?hard_delete=true')
      .expect(204);

    expect(received.map((entry) => `${entry.method} ${entry.url}`)).toEqual(
      expect.arrayContaining([
        'GET /documents?limit=50',
        'GET /documents/doc-123/status',
        'GET /documents/doc-123',
        'GET /documents/doc-123/content',
        'POST /search',
        'DELETE /documents/doc-123?hard_delete=true',
      ]),
    );
  });

  it('returns a useful gateway error when the upstream is unavailable', async () => {
    const unavailable = createApp({ upstreamUrl: 'http://127.0.0.1:1' });
    const response = await request(unavailable).get('/api/health').expect(502);
    expect(response.body).toEqual({ error: 'KBMS API에 연결할 수 없습니다.' });
  });
});
