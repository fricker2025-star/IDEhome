
import { fileSystemService } from './fileSystem';

export class PreviewService {
  /**
   * Bundles the current project files into a single Blob URL
   * that can be displayed in an iframe.
   * 
   * It looks for index.html, and attempts to inline local CSS/JS/Images
   * referenced within it to ensure they load in the sandboxed blob.
   */
  async generatePreviewUrl(entryPath: string = 'index.html'): Promise<string> {
    try {
      // 1. Read the entry HTML file
      let htmlContent = "";
      try {
          htmlContent = await fileSystemService.readFile(entryPath);
      } catch (e) {
          return `data:text/html;charset=utf-8,<html><body><h2 style="color:red">Error</h2><p>Could not find <b>${entryPath}</b>.</p></body></html>`;
      }

      // 2. Parse HTML to find linked resources
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');

      // 3. Inline CSS (<link rel="stylesheet">)
      const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
      for (const link of links) {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http')) {
          try {
            const cssContent = await fileSystemService.readFile(href);
            const style = doc.createElement('style');
            style.textContent = cssContent;
            link.replaceWith(style);
          } catch (e) {
            console.warn(`Failed to inline CSS: ${href}`);
          }
        }
      }

      // 4. Inline JS (<script src="...">)
      const scripts = Array.from(doc.querySelectorAll('script[src]'));
      for (const script of scripts) {
        const src = script.getAttribute('src');
        if (src && !src.startsWith('http')) {
          try {
            const jsContent = await fileSystemService.readFile(src);
            script.removeAttribute('src');
            script.textContent = jsContent;
          } catch (e) {
             console.warn(`Failed to inline JS: ${src}`);
          }
        }
      }

      // 5. Create Blob
      const blob = new Blob([doc.documentElement.outerHTML], { type: 'text/html' });
      return URL.createObjectURL(blob);
    } catch (e: any) {
       return `data:text/html;charset=utf-8,<html><body><h2>Preview Build Error</h2><pre>${e.message}</pre></body></html>`;
    }
  }
}

export const previewService = new PreviewService();
