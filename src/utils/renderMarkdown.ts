import { marked } from "marked";
import DOMPurify from "dompurify";

/**
 * Convierte texto Markdown a HTML sanitizado.
 * Usa `marked` para parsear y `DOMPurify` para prevenir XSS.
 */
export function renderMarkdown(text: string): string {
  if (!text) return "";

  const raw = marked.parse(text, { async: false }) as string;
  return DOMPurify.sanitize(raw);
}
