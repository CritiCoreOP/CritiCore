import DOMPurify from 'dompurify';

// Own instance: the style hook below must not apply to other DOMPurify calls in the app
const purify = typeof window !== 'undefined' ? DOMPurify(window) : DOMPurify;

/** The only inline style an article may carry: the width of an image, in percent */
const IMAGE_WIDTH = /^\s*width:\s*(\d{1,3}(?:\.\d{1,2})?)%;?\s*$/i;

purify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName !== 'style') return;
  const m = IMAGE_WIDTH.exec(data.attrValue);
  const width = m ? Number(m[1]) : NaN;
  if (width >= 5 && width <= 100) data.attrValue = `width: ${width}%;`;
  else data.keepAttr = false;
});

export function sanitizeHtml(html: string): string {
  return purify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 'b', 'i',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'blockquote', 'pre', 'code', 'aside',
      'a', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span', 'hr', 'sup', 'sub',
      'figure', 'figcaption',
    ],
    // data-youtube-id/-start/-title/-author: video placeholders in articles (see ArticleHtml); the
    // player is built from the id, the HTML never carries an iframe.
    // data-align/-ratio and style (width in percent only, see the hook above): images in articles
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'class', 'target', 'rel', 'id',
      'data-youtube-id', 'data-start', 'data-title', 'data-author',
      'data-align', 'data-ratio', 'style',
    ],
    ALLOW_DATA_ATTR: false,
  });
}

/**
 * Escape user-supplied text before interpolating it into a PostgREST `.or()`
 * filter string. Commas, parentheses and backslashes are structural in the
 * PostgREST filter grammar, so stripping them prevents attackers from injecting
 * additional filter clauses via a crafted search term.
 */
export function escapePostgrestLike(value: string): string {
  return value.replace(/[,()\\]/g, " ");
}

/**
 * Removes query strings from URLs in a message. Stored fetch errors quote the full request URL,
 * and a query string can carry credentials.
 */
export function redactUrls(message: string): string {
  return message.replace(/(https?:\/\/[^\s?#)"']+)[?#][^\s)"']*/g, "$1?…");
}
