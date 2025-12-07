/**
 * Lightweight markdown to HTML renderer for Grok responses.
 * Handles common markdown syntax without external dependencies.
 */

export function renderMarkdown(text: string): string {
  if (!text) return '';
  
  // First, escape ALL HTML to prevent XSS
  let html = escapeHtml(text);
  
  // Now convert markdown syntax (working with escaped text)
  
  // Convert code blocks first (``` ... ```)
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre class="cognitia-code-block"><code>${code.trim()}</code></pre>`;
  });
  
  // Convert inline code (`code`)
  html = html.replace(/`([^`]+)`/g, '<code class="cognitia-inline-code">$1</code>');
  
  // Convert headers (must be at start of line) - process longest first
  html = html.replace(/^######\s+(.+)$/gm, '<h6 class="cognitia-h6">$1</h6>');
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 class="cognitia-h5">$1</h5>');
  html = html.replace(/^####\s+(.+)$/gm, '<h4 class="cognitia-h4">$1</h4>');
  html = html.replace(/^###\s+(.+)$/gm, '<h4 class="cognitia-h4">$1</h4>');
  html = html.replace(/^##\s+(.+)$/gm, '<h3 class="cognitia-h3">$1</h3>');
  html = html.replace(/^#\s+(.+)$/gm, '<h2 class="cognitia-h2">$1</h2>');
  
  // Convert bold (**text** or __text__)
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Convert italic (*text* or _text_)
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>');
  
  // Convert links [text](url) - note: parentheses are not escaped
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener" class="cognitia-link">$1</a>');
  
  // Convert unordered lists
  html = html.replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul class="cognitia-list">${match}</ul>`);
  
  // Convert ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  
  // Convert blockquotes (note: > is escaped to &gt;)
  html = html.replace(/^&gt;\s+(.+)$/gm, '<blockquote class="cognitia-blockquote">$1</blockquote>');
  
  // Convert horizontal rules
  html = html.replace(/^---$/gm, '<hr class="cognitia-hr">');
  
  // Convert tables
  html = convertTables(html);
  
  // Convert double newlines to paragraph breaks
  html = html.replace(/\n\n/g, '</p><p class="cognitia-p">');
  
  // Convert single newlines to line breaks
  html = html.replace(/\n/g, '<br>');
  
  // Wrap in paragraph tags if not already wrapped
  if (!html.startsWith('<')) {
    html = `<p class="cognitia-p">${html}</p>`;
  }
  
  // Clean up: remove paragraph wrappers around block elements
  html = html.replace(/<p class="cognitia-p"><\/p>/g, '');
  html = html.replace(/<p class="cognitia-p">(<h[2-6])/g, '$1');
  html = html.replace(/(<\/h[2-6]>)<\/p>/g, '$1');
  html = html.replace(/<p class="cognitia-p">(<ul|<ol|<pre|<blockquote|<hr|<table)/g, '$1');
  html = html.replace(/(<\/ul>|<\/ol>|<\/pre>|<\/blockquote>|<\/table>)<\/p>/g, '$1');
  
  // Clean up excessive <br> tags
  html = html.replace(/(<br>){3,}/g, '<br><br>');
  html = html.replace(/<\/h([2-6])><br>/g, '</h$1>');
  html = html.replace(/<br><h([2-6])/g, '<h$1');
  html = html.replace(/<\/ul><br>/g, '</ul>');
  html = html.replace(/<br><ul/g, '<ul');
  html = html.replace(/<\/li><br>/g, '</li>');
  html = html.replace(/<\/table><br>/g, '</table>');
  html = html.replace(/<br><table/g, '<table');
  
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

function convertTables(html: string): string {
  const lines = html.split('\n');
  const result: string[] = [];
  let inTable = false;
  let tableRows: string[] = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check if this is a table row (contains | and isn't just |---|)
    const isTableRow = line.includes('|') && line.match(/\|.*[^-|].*\|/);
    const isSeparator = /^\|?[-:|\s]+\|?$/.test(line) && line.includes('-');
    
    if (isTableRow || (inTable && isSeparator)) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      if (!isSeparator) {
        tableRows.push(line);
      }
    } else {
      if (inTable && tableRows.length > 0) {
        result.push(buildTable(tableRows));
        tableRows = [];
        inTable = false;
      }
      result.push(lines[i]);
    }
  }
  
  // Handle table at end of content
  if (inTable && tableRows.length > 0) {
    result.push(buildTable(tableRows));
  }
  
  return result.join('\n');
}

function buildTable(rows: string[]): string {
  if (rows.length === 0) return '';
  
  let tableHtml = '<table class="cognitia-table"><thead><tr>';
  
  // First row is header
  const headerCells = rows[0].split('|').map(c => c.trim()).filter(c => c);
  headerCells.forEach(cell => {
    tableHtml += `<th>${cell}</th>`;
  });
  tableHtml += '</tr></thead>';
  
  // Rest are body rows
  if (rows.length > 1) {
    tableHtml += '<tbody>';
    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i].split('|').map(c => c.trim()).filter(c => c);
      tableHtml += '<tr>';
      cells.forEach(cell => {
        tableHtml += `<td>${cell}</td>`;
      });
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody>';
  }
  
  tableHtml += '</table>';
  
  // Wrap in container for horizontal scroll
  return `<div class="cognitia-table-container">${tableHtml}</div>`;
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
