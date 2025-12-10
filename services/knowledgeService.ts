
import { fileSystemService } from './fileSystem';

interface IndexEntry {
  path: string;
  symbols: string[]; // Function names, class names, exported consts
  summary: string;   // Heuristic summary
  contentSnippet: string; // First 200 chars or JSDoc
  lastModified: number;
}

export class KnowledgeService {
  private index: Map<string, IndexEntry> = new Map();

  constructor() {
    // Subscribe to file system changes to keep index fresh (Idea 3: Knowledge Cache)
    fileSystemService.subscribe((type, path, content) => {
      if (type === 'delete') {
        this.removeFile(path);
      } else if (type === 'write' && content) {
        this.indexFile(path, content);
      }
    });
  }

  /**
   * Parses file content to extract symbolic meaning.
   * Acts as a lightweight AST-indexer (Idea 1).
   */
  private parseSymbols(content: string, extension: string): { symbols: string[], summary: string } {
    const symbols: string[] = [];
    const lines = content.split('\n');
    let summary = "File contains logic.";

    if (['ts', 'tsx', 'js', 'jsx'].includes(extension)) {
      // Extract function definitions
      const funcMatches = content.matchAll(/function\s+([a-zA-Z0-9_]+)/g);
      for (const m of funcMatches) symbols.push(`Function: ${m[1]}`);

      // Extract const/let definitions (arrows or vars)
      const varMatches = content.matchAll(/(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/g);
      for (const m of varMatches) symbols.push(`Var: ${m[1]}`);

      // Extract classes
      const classMatches = content.matchAll(/class\s+([a-zA-Z0-9_]+)/g);
      for (const m of classMatches) symbols.push(`Class: ${m[1]}`);
      
      summary = `Contains ${symbols.length} definitions including ${symbols.slice(0, 3).map(s => s.split(':')[1].trim()).join(', ')}...`;
    } 
    else if (extension === 'py') {
      const defMatches = content.matchAll(/def\s+([a-zA-Z0-9_]+)/g);
      for (const m of defMatches) symbols.push(`Function: ${m[1]}`);
      
      const classMatches = content.matchAll(/class\s+([a-zA-Z0-9_]+)/g);
      for (const m of classMatches) symbols.push(`Class: ${m[1]}`);

      summary = `Python module with ${symbols.length} definitions.`;
    }
    else if (extension === 'html') {
      const titleMatch = content.match(/<title>(.*?)<\/title>/);
      if (titleMatch) symbols.push(`Page Title: ${titleMatch[1]}`);
      summary = titleMatch ? `HTML Page: ${titleMatch[1]}` : "HTML Document";
    }

    return { symbols, summary };
  }

  public indexFile(path: string, content: string) {
    if (path.includes('node_modules') || path.startsWith('.')) return;

    const extension = path.split('.').pop() || '';
    const { symbols, summary } = this.parseSymbols(content, extension);

    this.index.set(path, {
      path,
      symbols,
      summary,
      contentSnippet: content.slice(0, 300).replace(/\s+/g, ' '),
      lastModified: Date.now()
    });
    
    // console.log(`[Indexer] Updated ${path}`, symbols);
  }

  public removeFile(path: string) {
    this.index.delete(path);
  }

  /**
   * "Semantic" Search (Weighted Keyword Matching).
   * Used by the AI to find code without knowing the exact path.
   */
  public search(query: string): string[] {
    const terms = query.toLowerCase().split(/\s+/);
    const results: { path: string, score: number, reason: string }[] = [];

    this.index.forEach((entry) => {
      let score = 0;
      const reasons: string[] = [];

      // 1. Path Match (Highest Weight)
      if (entry.path.toLowerCase().includes(query.toLowerCase())) {
        score += 10;
        reasons.push("Filename match");
      }

      // 2. Symbol Match (High Weight)
      entry.symbols.forEach(sym => {
        if (terms.some(t => sym.toLowerCase().includes(t))) {
          score += 5;
          reasons.push(`Symbol match: ${sym}`);
        }
      });

      // 3. Content Snippet Match (Low Weight)
      if (terms.some(t => entry.contentSnippet.toLowerCase().includes(t))) {
        score += 1;
      }

      if (score > 0) {
        results.push({ 
          path: entry.path, 
          score, 
          reason: `[${reasons.slice(0,2).join(', ')}] ${entry.summary}`
        });
      }
    });

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => `FILE: ${r.path} | RELEVANCE: ${r.reason}`);
  }

  public getStats(): string {
    return `Indexed ${this.index.size} files. Memory layer active.`;
  }
}

export const knowledgeService = new KnowledgeService();
