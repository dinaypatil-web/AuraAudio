function sendJson(res: any, status: number, data: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.end(JSON.stringify(data));
}

function getQueryParams(urlStr: string = ''): Record<string, string> {
  try {
    const parsed = new URL(urlStr, 'http://localhost');
    const params: Record<string, string> = {};
    parsed.searchParams.forEach((val, key) => {
      params[key] = val;
    });
    return params;
  } catch {
    return {};
  }
}

export default async function handler(req: any, res: any) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.end();
    return;
  }

  try {
    const params = req.query || getQueryParams(req.url);
    const title = (params.title as string) || '';
    const artist = (params.artist as string) || '';
    const q = `${title} ${artist}`.trim();

    if (!q) {
      return sendJson(res, 400, { error: 'Query parameters title and artist required' });
    }

    // Try finding a matching YouTube video via Invidious instances
    const instances = [
      'https://inv.nadeko.net',
      'https://invidious.nerdvpn.de',
      'https://invidious.private.coffee',
    ];

    for (const inst of instances) {
      try {
        const iRes = await fetch(`${inst}/api/v1/search?q=${encodeURIComponent(q)}&type=video`, {
          signal: AbortSignal.timeout(2500),
        });
        if (iRes.ok) {
          const data = await iRes.json();
          if (Array.isArray(data) && data[0]?.videoId) {
            return sendJson(res, 200, {
              matched: true,
              youtubeId: data[0].videoId,
              duration: data[0].lengthSeconds || 210,
              title: data[0].title,
            });
          }
        }
      } catch {}
    }

    return sendJson(res, 200, { matched: false });
  } catch (err: any) {
    return sendJson(res, 500, { error: err.message || 'Match error' });
  }
}
