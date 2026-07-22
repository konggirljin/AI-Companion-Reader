import { NextRequest, NextResponse } from 'next/server';

const HOP_BY_HOP = new Set([
  'connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization',
  'te', 'trailers', 'transfer-encoding', 'upgrade', 'host', 'content-length',
  // Node's fetch auto-decompresses gzip/deflate/br bodies but keeps the header —
  // forwarding it makes the browser try to decompress already-plain bytes → ERR_CONTENT_DECODING_FAILED
  'content-encoding',
]);

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}

export async function GET(req: NextRequest) {
  return proxyRequest(req);
}

async function proxyRequest(req: NextRequest): Promise<NextResponse> {
  const url = req.nextUrl.searchParams.get('url');
  if (!url || !/^https?:\/\//.test(url)) {
    return NextResponse.json({ error: 'Missing or invalid ?url= parameter' }, { status: 400 });
  }

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers[key] = value;
  });

  const body = ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text();

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
    });
  } catch {
    return NextResponse.json({ error: 'Upstream fetch failed' }, { status: 502 });
  }

  const respHeaders: Record<string, string> = {};
  upstream.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    respHeaders[key] = value;
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
