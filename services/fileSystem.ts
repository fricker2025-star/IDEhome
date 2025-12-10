
import { FileNode } from '../types';

// Simple types for In-Memory FS
interface MemoryEntry {
  name: string;
  kind: 'file' | 'directory';
}

interface MemoryFile extends MemoryEntry {
  kind: 'file';
  content: string;
}

interface MemoryDirectory extends MemoryEntry {
  kind: 'directory';
  children: Record<string, MemoryEntry>;
}

type FileChangeListener = (type: 'write' | 'delete', path: string, content?: string) => void;

export class FileSystemService {
  private rootHandle: FileSystemDirectoryHandle | null = null;
  private memoryRoot: MemoryDirectory | null = null;
  private provider: 'native' | 'memory' = 'native';
  private listeners: FileChangeListener[] = [];
  
  // Terminal State (Cloud Shell CWD)
  private cwd: string = '~'; // Default to home directory in Linux/Puter

  constructor() {
    // Initialize empty memory root
    this.memoryRoot = { name: 'root', kind: 'directory', children: {} };
  }

  // --- Event System ---
  subscribe(listener: FileChangeListener) {
      this.listeners.push(listener);
      return () => {
          this.listeners = this.listeners.filter(l => l !== listener);
      };
  }

  private notify(type: 'write' | 'delete', path: string, content?: string) {
      this.listeners.forEach(l => l(type, path, content));
  }

  getProvider() {
    return this.provider;
  }

  async setRoot(): Promise<void> {
    try {
      if ('showDirectoryPicker' in window) {
          this.rootHandle = await (window as any).showDirectoryPicker();
          this.provider = 'native';
      } else {
          throw new Error("Native FS not supported");
      }
    } catch (e) {
      console.log('Native Access blocked or cancelled. Falling back to In-Memory FS.', e);
      // Fallback to In-Memory
      this.provider = 'memory';
      this.memoryRoot = { name: 'root', kind: 'directory', children: {} };
      // Pre-populate a README
      this.memoryWriteFile('README.md', '# In-Memory Workspace\n\nFile access was blocked by the browser/iframe.\nYou are working in a temporary sandboxed environment.');
    }
  }

  getRootHandle() {
    return this.provider === 'native' ? this.rootHandle : this.memoryRoot;
  }

  // --- Tree Traversal ---

  async readDirectory(dirHandle: any, path: string = ''): Promise<FileNode[]> {
    const entries: FileNode[] = [];
    
    if (this.provider === 'memory') {
        const dir = dirHandle as MemoryDirectory;
        if (!dir || !dir.children) return [];
        for (const [name, entry] of Object.entries(dir.children)) {
            const currentPath = path ? `${path}/${name}` : name;
            entries.push({
                name: entry.name,
                kind: entry.kind,
                path: currentPath,
                handle: entry as any,
                children: entry.kind === 'directory' ? [] : undefined
            });
        }
        return entries.sort((a, b) => {
            if (a.kind === b.kind) return a.name.localeCompare(b.name);
            return a.kind === 'directory' ? -1 : 1;
        });
    }

    // Native
    try {
      // @ts-ignore
      for await (const [name, handle] of dirHandle.entries()) {
        const currentPath = path ? `${path}/${name}` : name;
        if (handle.kind === 'file') {
          entries.push({
            name,
            kind: 'file',
            path: currentPath,
            handle: handle as FileSystemFileHandle,
          });
        } else if (handle.kind === 'directory') {
          const subHandle = handle as FileSystemDirectoryHandle;
          entries.push({
            name,
            kind: 'directory',
            path: currentPath,
            handle: subHandle,
            children: [], 
          });
        }
      }
    } catch(e) {
        console.warn(`Failed to read directory at ${path}`, e);
        return [];
    }
    
    return entries.sort((a, b) => {
      if (a.kind === b.kind) return a.name.localeCompare(b.name);
      return a.kind === 'directory' ? -1 : 1;
    });
  }

  async readDirectoryRecursive(dirHandle: any, path: string = ''): Promise<FileNode[]> {
    const entries = await this.readDirectory(dirHandle, path);
    
    for (const entry of entries) {
      // Skip heavy directories
      if (['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) continue;

      if (entry.kind === 'directory') {
        try {
          entry.children = await this.readDirectoryRecursive(entry.handle, entry.path);
        } catch (e) {
          console.warn(`Skipping recursion for ${entry.path}`);
        }
      }
    }
    return entries;
  }

  async getDirectoryStructure(depthLimit = 4): Promise<string> {
    const root = this.getRootHandle();
    if (!root) return "No directory open.";
    
    let structure = "";
    
    const traverse = async (dir: any, indent: string, depth: number) => {
      if (depth > depthLimit) return;
      
      let items: { name: string, kind: string, handle: any }[] = [];
      
      try {
        if (this.provider === 'memory') {
            const mDir = dir as MemoryDirectory;
            items = Object.values(mDir.children).map(c => ({ name: c.name, kind: c.kind, handle: c }));
        } else {
            // @ts-ignore
            for await (const [name, handle] of dir.entries()) {
                items.push({ name, kind: handle.kind, handle });
            }
        }
      } catch (e) { return; }

      for (const item of items) {
        if (item.name.startsWith('.') && item.name !== '.env') continue;
        if (item.name === 'node_modules') {
            structure += `${indent}- node_modules/\n`;
            continue;
        }

        structure += `${indent}- ${item.name}${item.kind === 'directory' ? '/' : ''}\n`;
        if (item.kind === 'directory') {
           await traverse(item.handle, indent + "  ", depth + 1);
        }
      }
    };

    await traverse(root, "", 0);
    return structure;
  }

  // --- In-Memory Helpers ---

  private getMemoryEntry(path: string): MemoryEntry | null {
      if (!this.memoryRoot) return null;
      const parts = path.split('/').filter(p => p !== '.' && p !== '');
      let current: MemoryEntry = this.memoryRoot;
      
      for (const part of parts) {
          if (current.kind !== 'directory') return null;
          const dir = current as MemoryDirectory;
          if (!dir.children[part]) return null;
          current = dir.children[part];
      }
      return current;
  }

  private ensureMemoryDir(path: string): MemoryDirectory {
      const parts = path.split('/').filter(p => p !== '.' && p !== '');
      let current: MemoryDirectory = this.memoryRoot!;
      
      for (const part of parts) {
          if (!current.children[part]) {
              current.children[part] = { name: part, kind: 'directory', children: {} } as MemoryDirectory;
          }
          const next = current.children[part];
          if (next.kind !== 'directory') throw new Error(`Path collision: ${part} is a file.`);
          current = next as MemoryDirectory;
      }
      return current;
    }

  private memoryWriteFile(path: string, content: string) {
      const parts = path.split('/').filter(p => p !== '.' && p !== '');
      const fileName = parts.pop();
      if (!fileName) return;
      
      const dirPath = parts.join('/');
      const dir = this.ensureMemoryDir(dirPath);
      dir.children[fileName] = { name: fileName, kind: 'file', content } as MemoryFile;
      
      // Notify
      this.notify('write', path, content);
  }

  // --- File Operations ---

  async readFile(path: string): Promise<string> {
    if (this.provider === 'memory') {
        const entry = this.getMemoryEntry(path);
        if (!entry || entry.kind !== 'file') throw new Error(`File not found: ${path}`);
        return (entry as MemoryFile).content;
    }

    // Native
    const handle = await this.getFileHandleNative(path);
    const file = await handle.getFile();
    return await file.text();
  }

  async readMultipleFiles(paths: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    await Promise.all(paths.map(async (p) => {
       try {
         results[p] = await this.readFile(p);
       } catch (e: any) {
         results[p] = `Error: ${e.message}`;
       }
    }));
    return results;
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (this.provider === 'memory') {
        this.memoryWriteFile(path, content);
        return;
    }

    // Native
    const parts = path.split('/').filter(p => p !== '.' && p !== '');
    const fileName = parts.pop()!;
    let currentDir = this.rootHandle!;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }

    const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    
    // Notify
    this.notify('write', path, content);
  }

  async createDirectory(path: string): Promise<void> {
    if (this.provider === 'memory') {
        this.ensureMemoryDir(path);
        return;
    }

    const parts = path.split('/').filter(p => p !== '.' && p !== '');
    let currentDir = this.rootHandle!;
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }
  }

  async deleteEntry(path: string): Promise<void> {
    if (this.provider === 'memory') {
        const parts = path.split('/').filter(p => p !== '.' && p !== '');
        const name = parts.pop();
        if (!name) return;
        const dirEntry = this.getMemoryEntry(parts.join('/'));
        if (dirEntry && dirEntry.kind === 'directory') {
            delete (dirEntry as MemoryDirectory).children[name];
            // Notify
            this.notify('delete', path);
        }
        return;
    }

    const parts = path.split('/').filter(p => p !== '.' && p !== '');
    const name = parts.pop()!;
    let currentDir = this.rootHandle!;

    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part);
    }
    
    await currentDir.removeEntry(name, { recursive: true });
    
    // Notify
    this.notify('delete', path);
  }

  // --- Native Helper ---
  
  private async getFileHandleNative(path: string): Promise<FileSystemFileHandle> {
      const parts = path.split('/').filter(p => p !== '.' && p !== '');
      const fileName = parts.pop();
      if (!fileName) throw new Error("Invalid path");

      let currentDir = this.rootHandle!;
      for (const part of parts) {
        currentDir = await currentDir.getDirectoryHandle(part);
      }
      return await currentDir.getFileHandle(fileName);
  }

  // --- Advanced Tools ---

  async searchFiles(query: string, rootPath: string = ''): Promise<string[]> {
    const results: string[] = [];
    const lowerQuery = query.toLowerCase();

    const traverse = async (dir: any, path: string) => {
      let items: {name: string, kind: string, handle: any}[] = [];
      
      try {
        if (this.provider === 'memory') {
            items = Object.values((dir as MemoryDirectory).children).map(c => ({ name: c.name, kind: c.kind, handle: c }));
        } else {
            // @ts-ignore
            for await (const [name, handle] of dir.entries()) { items.push({name, kind: handle.kind, handle}); }
        }
      } catch (e) { return; }

      for (const item of items) {
        if (item.name === 'node_modules' || item.name.startsWith('.')) continue;

        const currentPath = path ? `${path}/${item.name}` : item.name;
        
        if (item.kind === 'file') {
            if (item.name.toLowerCase().includes(lowerQuery)) {
                results.push(`[NAME] ${currentPath}`);
            }
        } else if (item.kind === 'directory') {
            await traverse(item.handle, currentPath);
        }
      }
    };

    const root = this.getRootHandle();
    if (root) await traverse(root, rootPath);
    return results;
  }

  /**
   * REAL Terminal Execution using Puter.js Cloud Shell.
   * This is NOT a simulation. It runs actual commands in a Linux container.
   */
  async runTerminalCommand(command: string): Promise<string> {
      // @ts-ignore
      if (!window.puter) {
          return "Error: Puter.js system not loaded. Cannot execute real commands.";
      }

      // 1. Ensure Authentication
      // @ts-ignore
      if (!window.puter.auth.isSignedIn()) {
           try {
               // @ts-ignore
               await window.puter.auth.signIn();
           } catch (e) {
               return "Error: Authentication failed. Real terminal access requires a Puter account (Free).";
           }
      }

      // 2. Handle 'cd' locally to maintain state for the stateless exec
      // Puter's exec is stateless, so we must chaining directory changes or track state.
      // We track `this.cwd` and prepend it to commands or handle navigation logic.
      const parts = command.trim().split(/\s+/);
      if (parts[0] === 'cd') {
          const target = parts[1] || '~';
          
          // Construct command to verify path exists in the cloud instance
          const verifyCmd = `cd "${this.cwd}" && cd "${target}" && pwd`;
          
          try {
              // @ts-ignore
              const check = await window.puter.exec(verifyCmd);
              if (check.exitCode === 0) {
                  this.cwd = check.stdout.trim();
                  return `Changed directory to ${this.cwd}`;
              } else {
                  return `cd: ${target}: No such file or directory (in Cloud Shell)`;
              }
          } catch(e: any) {
              return `Error executing cd: ${e.message || e}`;
          }
      }

      // 3. Execute arbitrary command
      try {
          // We run the command relative to the current tracked CWD
          // @ts-ignore
          const result = await window.puter.exec(command, { cwd: this.cwd });
          
          if (result.exitCode !== 0) {
              // Command failed at system level
              return result.stderr || `Error: Exit code ${result.exitCode}\n${result.stdout}`;
          }
          
          // Command succeeded
          return result.stdout || (result.stderr ? `(Stderr): ${result.stderr}` : "Command executed successfully (No output).");
          
      } catch (e: any) {
          return `System Execution Error: ${e.message || e}`;
      }
  }
}

export const fileSystemService = new FileSystemService();
