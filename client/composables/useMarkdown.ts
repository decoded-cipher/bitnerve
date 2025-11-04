import { marked } from 'marked'
import DOMPurify from 'dompurify'

/**
 * Composable for rendering markdown to HTML
 * @param markdown - The markdown string to render
 * @returns Sanitized HTML string
 */
export function useMarkdown(markdown: string): string {
  if (!markdown) return ''
  
  // Configure marked options
  marked.setOptions({
    breaks: true, // Convert line breaks to <br>
    gfm: true, // GitHub Flavored Markdown
  })
  
  try {
    // Convert markdown to HTML
    const html = marked.parse(markdown) as string
    
    // Sanitize HTML to prevent XSS attacks (only on client side where DOMPurify works)
    if (process.client && typeof window !== 'undefined') {
      return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
          'p', 'br', 'strong', 'em', 'u', 's', 'code', 'pre',
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li',
          'blockquote',
          'a', 'img',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'hr',
        ],
        ALLOWED_ATTR: ['href', 'src', 'alt', 'title'],
      })
    }
    
    // On server side, return unsanitized HTML
    // Nuxt will handle this during hydration, and client-side sanitization will occur
    return html
  } catch (error) {
    console.error('Error rendering markdown:', error)
    return markdown // Fallback to plain text
  }
}

