export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return Response.json({ error: 'No URL' }, { status: 400 });

  try {
    new URL(url); // URL 형식 검증
  } catch {
    return Response.json({ error: 'Invalid URL' }, { status: 400 });
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; Ourday-LinkPreview/1.0; +https://ourday.kr)',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(6000),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // 최대 200KB만 읽어서 OG 태그 파싱 (이미지 등 불필요한 바이트 방지)
    const reader = res.body.getReader();
    let html = '';
    let done = false;
    while (!done && html.length < 200_000) {
      const { value, done: d } = await reader.read();
      done = d;
      if (value) html += new TextDecoder().decode(value);
    }
    reader.cancel().catch(() => {});

    // OG 태그 추출 헬퍼
    function getOg(prop) {
      const re1 = new RegExp(
        `<meta[^>]+property=["']og:${prop}["'][^>]+content=["']([^"']+)["']`,
        'i'
      );
      const re2 = new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:${prop}["']`,
        'i'
      );
      return (html.match(re1) || html.match(re2))?.[1]?.trim() || null;
    }

    function getMeta(name) {
      const re = new RegExp(
        `<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`,
        'i'
      );
      return html.match(re)?.[1]?.trim() || null;
    }

    const titleMatch = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i);
    const pageTitle = titleMatch?.[1]?.trim() || null;

    const domain = new URL(url).hostname.replace(/^www\./, '');

    // favicon URL 구성
    const faviconRe = html.match(/<link[^>]+rel=["'][^"']*icon[^"']*["'][^>]+href=["']([^"']+)["']/i);
    let favicon = faviconRe?.[1] || null;
    if (favicon && favicon.startsWith('/')) {
      const base = new URL(url);
      favicon = `${base.protocol}//${base.host}${favicon}`;
    }
    if (!favicon) {
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    }

    return Response.json({
      title:       getOg('title')       || pageTitle,
      description: getOg('description') || getMeta('description'),
      image:       getOg('image'),
      site_name:   getOg('site_name')   || domain,
      favicon,
      domain,
    });
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
}
