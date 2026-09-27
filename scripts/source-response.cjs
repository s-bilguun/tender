// A normal page may load Turnstile or Cloudflare scripts. Their presence alone
// does not mean the requested page was replaced by an access challenge.
function visibleText(html) {
  return String(html || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classifySourceResponse({ status = 200, body = '', title = '', mitigated = '' } = {}) {
  if (mitigated === 'challenge') return 'challenge';
  // API records can legitimately contain these words inside document text.
  if (status >= 200 && status < 300 && !title && /^\s*[\[{]/.test(String(body))) return 'ok';
  const pageTitle = title || String(body).match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '';
  const text = visibleText(body);
  if (/you have been blocked|error\s*(?:code\s*)?1020|access denied/i.test(`${pageTitle}\n${text}`)) {
    return 'blocked';
  }
  if (/^(?:just a moment|checking your browser)/i.test(pageTitle.trim()) ||
      /checking your browser before accessing|verifying you are human|verify you are human/i.test(text)) {
    return 'challenge';
  }
  if (status === 403) return 'blocked';
  if (status >= 400 || status < 200) return 'http_error';
  return 'ok';
}

module.exports = { classifySourceResponse, visibleText };
