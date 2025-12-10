export class SyntaxService {
  /**
   * Validates code syntax using Babel Standalone.
   * Returns null if valid, or an error message string if invalid.
   */
  validate(code: string, filename: string): string | null {
    // Only validate JS/TS/JSX/TSX files
    if (!/\.(js|jsx|ts|tsx)$/.test(filename)) {
      return null;
    }

    try {
      // @ts-ignore - Babel is loaded via CDN in index.html
      if (!window.Babel) return null;

      // @ts-ignore
      window.Babel.transform(code, {
        presets: ['react', 'typescript'],
        filename: filename, // Helps Babel identify how to parse (e.g. .ts vs .tsx)
      });
      return null;
    } catch (e: any) {
      // Babel error messages are usually descriptive: "SyntaxError: ... (line:column)"
      return e.message;
    }
  }
}

export const syntaxService = new SyntaxService();