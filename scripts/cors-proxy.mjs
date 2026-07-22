#!/usr/bin/env node
// Standalone CORS proxy for AI Companion Reader (browser PWA → OpenAI-compatible APIs).
//
// Usage:
//   node scripts/cors-proxy.mjs            # listens on http://localhost:8787
//   PORT=9000 node scripts/cors-proxy.mjs  # custom port
//
// The app routes requests here only when `proxyUrl` is configured in Settings.
// Request shape:  http://localhost:8787/<absolute-target-url>
//   e.g. http://localhost:8787/https://opencode.ai/zen/go/v1/chat/completions
// Everything after the first `/` is treated as the target URL.
// Method, headers (except hop-by-hop), and body are forwarded verbatim.
// Response is returned with permissive CORS headers so the browser accepts it.

import http from 'node:http';

const PORT = Number(process.env.PORT ?? 8787);
const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host', 'content-length',
  // Node's fetch auto-decompresses; forwarding the header corrupts the body
  'content-encoding',
]);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

const server = http.createServer(async (req, res) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // Target URL: path-style (everything after first /) or query-param (?url=...)
  let targetUrl = (req.url ?? '').replace(/^\//, '');
  if (req.url?.startsWith('/?url=')) {
    const params = new URLSearchParams(req.url.slice(req.url.indexOf('?')));
    targetUrl = params.get('url') ?? '';
  }
  if (!targetUrl || !/^https?:\/\//.test(targetUrl)) {
    res.writeHead(400, { 'content-type': 'text/plain', ...corsHeaders() });
    res.end('CORS proxy: pass an absolute URL after the first slash. Example: http://localhost:8787/https://api.example.com/v1/chat/completions');
    return;
  }

  let target;
  try { target = new URL(targetUrl); }
  catch {
    res.writeHead(400, { 'content-type': 'text/plain', ...corsHeaders() });
    res.end('CORS proxy: invalid target URL.');
    return;
  }

  // Collect request body
  const bodyChunks = [];
  for await (const chunk of req) bodyChunks.push(chunk);
  const body = bodyChunks.length ? Buffer.concat(bodyChunks) : undefined;

  // Forward headers, drop hop-by-hop
  const headers = {};
  for (const [k, v] of Object.entries(req.headers)) {
    if (HOP_BY_HOP.has(k.toLowerCase())) continue;
    headers[k] = v;
  }

  // Fetch upstream using global fetch (Node 18+)
  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: body && ['GET', 'HEAD'].includes(req.method) ? undefined : body,
      duplex: 'half',
    });
  } catch (err) {
    res.writeHead(502, { 'content-type': 'text/plain', ...corsHeaders() });
    res.end(`CORS proxy: upstream fetch failed — ${err?.message ?? 'unknown error'}`);
    return;
  }

  // Relay response headers (drop hop-by-hop), then body
  const respHeaders = { ...corsHeaders() };
  upstream.headers.forEach((v, k) => {
    if (HOP_BY_HOP.has(k.toLowerCase())) return;
    // Replace CORS headers from upstream with ours to avoid conflicts
    if (k.toLowerCase().startsWith('access-control-')) return;
    respHeaders[k] = v;
  });
  res.writeHead(upstream.status, respHeaders);
  const buf = Buffer.from(await upstream.arrayBuffer());
  res.end(buf);
});

server.listen(PORT, () => {
  console.log(`[arc-cors-proxy] listening on http://localhost:${PORT}`);
  console.log('Set "Proxy URL" in the app Settings to: ' + `http://localhost:${PORT}`);
});

server.on('error', (err) => {
  console.error('[arc-cors-proxy] error:', err.message);
  process.exit(1);
});