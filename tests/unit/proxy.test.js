import { describe, expect, it } from 'vitest';
import {
  buildUpstreamUrl,
  getForwardHeaders,
  isHopByHopHeader,
} from '../../server/proxy.js';

describe('BFF proxy helpers', () => {
  it('joins the BFF path with the upstream URL without losing query parameters', () => {
    expect(buildUpstreamUrl('http://kbms:8000/', '/documents?limit=10')).toBe(
      'http://kbms:8000/documents?limit=10',
    );
    expect(buildUpstreamUrl('http://kbms:8000', '/health')).toBe('http://kbms:8000/health');
  });

  it('forwards content headers but removes hop-by-hop headers', () => {
    const headers = getForwardHeaders(
      new Headers({
        Host: 'localhost:3001',
        Connection: 'keep-alive',
        'Content-Type': 'multipart/form-data; boundary=demo',
        Accept: 'application/json',
        'X-Request-Id': 'request-1',
      }),
    );

    expect(headers.get('content-type')).toContain('multipart/form-data');
    expect(headers.get('accept')).toBe('application/json');
    expect(headers.get('x-request-id')).toBe('request-1');
    expect(headers.has('host')).toBe(false);
    expect(headers.has('connection')).toBe(false);
    expect(isHopByHopHeader('transfer-encoding')).toBe(true);
  });
});
