#!/usr/bin/env python3
"""
Grokipedia Crawler - Extracts raw text from Grokipedia.com article pages.

Usage:
    python grokipedia-crawler.py <url>
    
Example:
    python grokipedia-crawler.py "https://grokipedia.com/page/Elon_Musk"
"""

import argparse
import json
import re
import sys
import requests


def fetch_page(url: str) -> str:
    """Fetch the HTML content of a page."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
    }
    
    response = requests.get(url, headers=headers, timeout=30)
    response.raise_for_status()
    return response.text


def extract_internal_links(html: str) -> list:
    """
    Extract all internal Grokipedia page links from the HTML.
    Returns a list of topic names (e.g., ['Elon_Musk', 'Tesla', ...])
    """
    # Find all grokipedia.com/page/ links with more restrictive pattern
    pattern = r'https://grokipedia\.com/page/([A-Za-z0-9_\-\(\)]+)'
    matches = re.findall(pattern, html)
    
    # Clean and deduplicate
    cleaned = []
    for match in matches:
        # Remove trailing backslashes
        slug = match.rstrip('\\').strip()
        # Remove unmatched trailing parentheses (but keep balanced ones like in "XAI_(company)")
        while slug.endswith(')') and slug.count('(') < slug.count(')'):
            slug = slug[:-1]
        if slug and slug not in cleaned:
            cleaned.append(slug)
    
    return cleaned


def extract_markdown_content(html: str) -> str:
    """
    Extract markdown content from Grokipedia's Next.js RSC payload.
    
    Grokipedia uses Next.js Server Components which stream content via
    self.__next_f.push() calls. The article markdown is in one of these chunks.
    """
    # Find all __next_f.push chunks
    pattern = r'self\.__next_f\.push\(\[1,"(.+?)"\]\)</script>'
    matches = re.findall(pattern, html)
    
    if not matches:
        return ""
    
    # Find the chunk containing the article (starts with # Title)
    markdown = ""
    for chunk in matches:
        if chunk.startswith("# ") or "\\n# " in chunk[:100]:
            markdown = chunk
            break
    
    if not markdown:
        return ""
    
    # Unescape the string
    markdown = markdown.replace("\\n", "\n")
    markdown = markdown.replace("\\t", "\t")
    markdown = markdown.replace('\\"', '"')
    markdown = markdown.replace("\\'", "'")
    markdown = markdown.replace("\\\\", "\\")
    
    # Clean up the markdown:
    # 1. Remove image references: ![alt](url) - handle escaped parentheses in URLs
    markdown = re.sub(r'!\[[^\]]*\]\([^)]*(?:\\\)[^)]*)*\)', '', markdown)
    
    # 2. Remove inline reference links: [](url) - empty link text with just refs
    markdown = re.sub(r'\[\]\([^)]+\)', '', markdown)
    
    # 3. Clean up stray parentheses/brackets left from image removal
    markdown = re.sub(r'^\s*\)*\s*$', '', markdown, flags=re.MULTILINE)
    
    # 4. Convert Grokipedia internal links to just text: [Text](https://grokipedia.com/...)
    markdown = re.sub(r'\[([^\]]+)\]\(https://grokipedia\.com/[^)]*\)', r'\1', markdown)
    
    # 5. Remove external reference links but keep the text
    markdown = re.sub(r'\[([^\]]+)\]\(https?://[^)]+\)', r'\1', markdown)
    
    # 6. Clean up excessive whitespace
    markdown = re.sub(r'\n{3,}', '\n\n', markdown)
    
    return markdown.strip()


def markdown_to_plaintext(markdown: str) -> str:
    """Convert markdown to clean plaintext while preserving structure."""
    text = markdown
    
    # Convert headers to plain text with spacing
    text = re.sub(r'^(#{1,6})\s+(.+)$', r'\2', text, flags=re.MULTILINE)
    
    # Remove bold/italic markers
    text = re.sub(r'\*\*([^*]+)\*\*', r'\1', text)
    text = re.sub(r'\*([^*]+)\*', r'\1', text)
    text = re.sub(r'__([^_]+)__', r'\1', text)
    text = re.sub(r'_([^_]+)_', r'\1', text)
    
    # Remove any remaining link syntax
    text = re.sub(r'\[([^\]]*)\]\([^)]+\)', r'\1', text)
    
    # Clean up empty brackets
    text = re.sub(r'\[\]', '', text)
    
    return text.strip()


def main():
    parser = argparse.ArgumentParser(
        description="Crawl a Grokipedia.com page and extract the article text."
    )
    parser.add_argument("url", help="URL of the Grokipedia page (e.g., https://grokipedia.com/page/Elon_Musk)")
    parser.add_argument(
        "-o", "--output",
        help="Output file path (defaults to stdout)",
        default=None
    )
    parser.add_argument(
        "--markdown",
        help="Keep markdown formatting (default: convert to plaintext)",
        action="store_true"
    )
    parser.add_argument(
        "--json",
        help="Output as JSON with content and discovered links",
        action="store_true"
    )
    
    args = parser.parse_args()
    
    # Validate URL
    if "grokipedia.com" not in args.url:
        print("Warning: URL does not appear to be from grokipedia.com", file=sys.stderr)
    
    try:
        print(f"Fetching: {args.url}", file=sys.stderr)
        html = fetch_page(args.url)
        
        print("Extracting article content...", file=sys.stderr)
        content = extract_markdown_content(html)
        links = extract_internal_links(html)
        
        if not content:
            print("Error: Could not extract article content.", file=sys.stderr)
            sys.exit(1)
        
        if not args.markdown:
            content = markdown_to_plaintext(content)
        
        if args.json:
            output = json.dumps({
                "content": content,
                "links": links
            })
        else:
            output = content
        
        if args.output:
            with open(args.output, "w", encoding="utf-8") as f:
                f.write(output)
            print(f"Saved to: {args.output}", file=sys.stderr)
        else:
            print(output)
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching page: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
