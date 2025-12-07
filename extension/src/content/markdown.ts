/**
 * Lightweight markdown to HTML renderer for Grok responses.
 * Handles common markdown syntax without external dependencies.
 */

export function renderMarkdown(text: string): string {
  if (!text) return '';
  
  let html = escapeHtml(text);
  
  // Convert code blocks first (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="cognitia-code-block"><code>${code.trim()}</code></pre>`;
  });
  
  // Convert inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="cognitia-inline-code">$1</code>');
  
  // Convert headers (must be at start of line)
  html = html.replace(/^### (.+)$/gm, '<h4 class="cognitia-h4">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="cognitia-h3">$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2 class="cognitia-h2">$1</h2>');
  
  // Convert bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Convert italic (*text* or _text_) - be careful not to match bold
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Convert links [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="cognitia-link">$1</a>');
  
  // Convert unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul class="cognitia-list">${match}</ul>`);
  
  // Convert ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  
  // Convert blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote class="cognitia-blockquote">$1</blockquote>');
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr class="cognitia-hr">');
  
  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p class="cognitia-p">');
  
  // Convert single newlines to line breaks (within paragraphs)
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p class="cognitia-p">${html}</p>`;
  }
  
  // Clean up empty paragraphs
  html = html.replace(/<p class="cognitia-p"><\/p>/g, '');
  html = html.replace(/<p class="cognitia-p">(<h[234])/g, '$1');
  html = html.replace(/(<\/h[234]>)<\/p>/g, '$1');
  html = html.replace(/<p class="cognitia-p">(<ul|<ol|<pre|<blockquote)/g, '$1');
  html = html.replace(/(<\/ul>|<\/ol>|<\/pre>|<\/blockquote>)<\/p>/g, '$1');
  
  return html;
}

function escapeHtml(text: string): string {
  const escapeMap: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => escapeMap[char]);
}

/**
 * Sanitize HTML to prevent XSS - only allow safe tags and attributes
 */
export function sanitizeHtml(html: string): string {
  const allowedTags = [
    'p', 'br', 'strong', 'em', 'code', 'pre', 'a', 
    'ul', 'ol', 'li', 'h2', 'h3', 'h4', 'blockquote', 'hr'
  ];
  
  const allowedAttrs: Record<string, string[]> = {
    'a': ['href', 'target', 'rel', 'class'],
    'pre': ['class'],
    'code': ['class'],
    'p': ['class'],
    'ul': ['class'],
    'ol': ['class'],
    'h2': ['class'],
    'h3': ['class'],
    'h4': ['class'],
    'blockquote': ['class'],
    'hr': ['class']
  };
  
  // Simple sanitization - remove script tags and event handlers
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  html = html.replace(/\son\w+\s*=/gi, ' data-removed=');
  html = html.replace(/javascript:/gi, 'removed:');
  
  return html;
}
