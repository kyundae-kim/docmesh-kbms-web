import { Readable } from 'node:stream';

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
]);

export function isHopByHopHeader(name) {
  return HOP_BY_HOP_HEADERS.has(String(name).toLowerCase());
}

export function buildUpstreamUrl(upstreamUrl, requestPath) {
  const base = String(upstreamUrl).replace(/\/+$/, '');
  const path = String(requestPath || '/').startsWith('/')
    ? String(requestPath || '/')
    : `/${requestPath}`;
  return `${base}${path}`;
}

export function getForwardHeaders(input) {
  const source = input instanceof Headers ? input : new Headers(input);
  const forwarded = new Headers();
  source.forEach((value, name) => {
    if (!isHopByHopHeader(name)) forwarded.set(name, value);
  });
  return forwarded;
}

export async function proxyRequest(req, res, {
  upstreamUrl,
  requestPath,
  fetchImpl = globalThis.fetch,
}) {
  const target = buildUpstreamUrl(upstreamUrl, requestPath);
  const method = req.method.toUpperCase();
  const init = {
    method,
    headers: getForwardHeaders(req.headers),
  };

  if (method !== 'GET' && method !== 'HEAD') {
    init.body = req;
    init.duplex = 'half';
  }

  let upstreamResponse;
  try {
    upstreamResponse = await fetchImpl(target, init);
  } catch {
    if (!res.headersSent) {
      res.status(502).json({ error: 'KBMS API에 연결할 수 없습니다.' });
    }
    return;
  }

  res.status(upstreamResponse.status);
  upstreamResponse.headers.forEach((value, name) => {
    if (!isHopByHopHeader(name)) res.setHeader(name, value);
  });

  if (!upstreamResponse.body) {
    res.end();
    return;
  }

  Readable.fromWeb(upstreamResponse.body).pipe(res);
}
