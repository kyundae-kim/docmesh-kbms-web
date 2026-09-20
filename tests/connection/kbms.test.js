import { describe, expect, it } from 'vitest';

const baseUrl = process.env.KBMS_API_URL || 'http://kbms:8000';

describe('kbms-api connection', () => {
  it('reaches health and verifies the documented public contract', async () => {
    const health = await fetch(`${baseUrl}/health`);
    expect(health.status).toBe(200);
    expect(await health.json()).toEqual({ status: 'ok' });

    const openapi = await fetch(`${baseUrl}/openapi.json`);
    expect(openapi.status).toBe(200);
    const contract = await openapi.json();
    expect(contract.info?.version).toBe('0.1.0');
    expect(Object.keys(contract.paths || {}).sort()).toEqual([
      '/documents',
      '/documents/{document_id}',
      '/documents/{document_id}/content',
      '/documents/{document_id}/status',
      '/health',
      '/search',
    ]);
  }, 20000);
});
