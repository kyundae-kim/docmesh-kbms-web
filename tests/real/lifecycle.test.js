import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

const runRealIntegration = process.env.RUN_REAL_INTEGRATION === '1';
const describeReal = runRealIntegration ? describe : describe.skip;
const baseUrl = process.env.KBMS_API_URL || 'http://kbms:8000';

async function waitForIndexed(agent, documentId) {
  const deadline = Date.now() + Number(process.env.REAL_INTEGRATION_TIMEOUT_MS || 120000);
  let latest;
  while (Date.now() < deadline) {
    const response = await agent.get(`/api/documents/${documentId}/status`);
    expect(response.status).toBe(200);
    latest = response.body;
    if (latest.status === 'indexed') return latest;
    if (latest.error) throw new Error(`KBMS indexing failed: ${latest.error}`);
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  throw new Error(`Timed out waiting for indexed status: ${JSON.stringify(latest)}`);
}

describeReal('real KBMS lifecycle through the BFF', () => {
  it('completes upload, status, list, metadata, content, search, delete, and deleted status', async () => {
    const app = createApp({ upstreamUrl: baseUrl });
    const agent = request(app);
    const documentId = `web-real-${Date.now()}`;
    const content = `DocMesh web integration ${documentId} semantic-search-token`;
    let uploaded = false;
    try {
      const uploadResponse = await agent
        .post('/api/documents')
        .field('title', 'DocMesh web integration')
        .field('source_uri', `https://example.test/${documentId}`)
        .field('document_id', documentId)
        .field('metadata', JSON.stringify({ suite: 'docmesh-kbms-web' }))
        .attach('file', Buffer.from(content), { filename: 'integration.txt', contentType: 'text/plain' })
        .expect(201);
      uploaded = true;
      expect(uploadResponse.body.document_id).toBe(documentId);

      const status = await waitForIndexed(agent, documentId);
      expect(status.status).toBe('indexed');

      const listed = await agent.get('/api/documents?limit=100').expect(200);
      expect(listed.body.items.some((item) => item.document_id === documentId)).toBe(true);

      const metadata = await agent.get(`/api/documents/${documentId}`).expect(200);
      expect(metadata.body.document_id).toBe(documentId);
      expect(metadata.body.filename).toBe('integration.txt');

      const downloaded = await agent.get(`/api/documents/${documentId}/content`).expect(200);
      expect(downloaded.text).toBe(content);
      expect(downloaded.headers['content-type']).toMatch(/text\/plain/);

      const search = await agent
        .post('/api/search')
        .send({ query: 'semantic-search-token', limit: 5, document_id: documentId })
        .expect(200);
      expect(search.body.some((hit) => hit.document_id === documentId)).toBe(true);

      await agent.delete(`/api/documents/${documentId}?hard_delete=true`).expect(204);
      const deleted = await agent.get(`/api/documents/${documentId}/status`).expect(200);
      expect(deleted.body.status).toBe('deleted');
      uploaded = false;
    } finally {
      if (uploaded) await agent.delete(`/api/documents/${documentId}?hard_delete=true`).catch(() => {});
    }
  }, 180000);
});
