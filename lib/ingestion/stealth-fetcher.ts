/**
 * TenderHub MN: Cloudflare Bot Bypass & Stealth HTTP Client
 * Designed for Vercel Serverless (Zero headless browser / native binary dependencies).
 * Routes target URLs through scraping proxy services (ZenRows, ScrapingBee, ScraperAPI)
 * or falls back to browser-impersonating direct fetch.
 */

export interface StealthFetchOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  renderJs?: boolean;
}

/**
 * Cloudflare ботыг алгасаж URL-аас PDF файлыг Binary Buffer хэлбэрээр татах
 */
export async function fetchStealthBinary(
  targetUrl: string,
  options: StealthFetchOptions = {}
): Promise<Buffer> {
  const { timeoutMs = 45000 } = options;
  const proxyUrl = buildProxyUrl(targetUrl, options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/pdf,application/octet-stream,*/*',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'mn,en-US;q=0.9,en;q=0.8',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(
        `PDF татаж чадсангүй (HTTP ${res.status}): ${errText.slice(0, 300) || res.statusText}`
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`PDF татах хугацаа хэтэрлээ (${timeoutMs / 1000}s timeout): ${targetUrl}`);
    }
    throw error;
  }
}

/**
 * Cloudflare ботыг алгасаж HTML эсвэл JSON хуудсыг татах
 */
export async function fetchStealthHtml(
  targetUrl: string,
  options: StealthFetchOptions = {}
): Promise<string> {
  const { timeoutMs = 30000 } = options;
  const proxyUrl = buildProxyUrl(targetUrl, options);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(proxyUrl, {
      signal: controller.signal,
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept-Language': 'mn,en-US;q=0.9,en;q=0.8',
        ...options.headers,
      },
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Хуудас татаж чадсангүй (HTTP ${res.status}): ${errText.slice(0, 300)}`);
    }

    return await res.text();
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Хуудас татах хугацаа хэтэрлээ (${timeoutMs / 1000}s timeout): ${targetUrl}`);
    }
    throw error;
  }
}

/**
 * Тохируулсан Scraping API сервисүүдийн дагуу proxy URL-ийг бүтээх
 */
function buildProxyUrl(targetUrl: string, options: StealthFetchOptions): string {
  // 1. ZenRows Proxy (Cloudflare anti-bot bypass & premium residential proxy)
  const zenrowsKey = process.env.ZENROWS_API_KEY;
  if (zenrowsKey) {
    const params = new URLSearchParams({
      apikey: zenrowsKey,
      url: targetUrl,
      antibot: 'true',
      premium_proxy: 'true',
      proxy_country: 'mn',
    });
    if (options.renderJs) {
      params.append('js_render', 'true');
    }
    return `https://api.zenrows.com/v1/?${params.toString()}`;
  }

  // 2. ScrapingBee Proxy
  const scrapingBeeKey = process.env.SCRAPINGBEE_API_KEY;
  if (scrapingBeeKey) {
    const params = new URLSearchParams({
      api_key: scrapingBeeKey,
      url: targetUrl,
      premium_proxy: 'true',
      render_js: options.renderJs ? 'true' : 'false',
    });
    return `https://app.scrapingbee.com/api/v1/?${params.toString()}`;
  }

  // 3. ScraperAPI Proxy
  const scraperApiKey = process.env.SCRAPER_API_KEY;
  if (scraperApiKey) {
    const params = new URLSearchParams({
      api_key: scraperApiKey,
      url: targetUrl,
      premium: 'true',
    });
    if (options.renderJs) {
      params.append('render', 'true');
    }
    return `http://api.scraperapi.com?${params.toString()}`;
  }

  // 4. Custom Proxy URL (хэрэв өөрийн proxy сервер тохируулсан бол)
  const customProxy = process.env.SCRAPER_PROXY_URL;
  if (customProxy) {
    return `${customProxy}?url=${encodeURIComponent(targetUrl)}`;
  }

  // 5. Fallback: Шууд холбогдох (Local development & Direct access)
  return targetUrl;
}
