
export interface FileNode {
  name: string;
  kind: 'file' | 'directory';
  path: string;
  handle: FileSystemFileHandle | FileSystemDirectoryHandle;
  children?: FileNode[];
}

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
  isToolOutput?: boolean;
  toolName?: string;
  timestamp?: number;
  // Multimodal support
  images?: string[]; // Base64 strings
}

export type AIProvider = 'google' | 'groq' | 'huggingface' | 'mistral' | 'openrouter' | 'puter' | 'sambanova' | 'cerebras' | 'deepseek' | 'pollinations';

export interface StoredKey {
  id: string;
  alias: string;
  key: string;
  provider: AIProvider; 
}

export interface AgentConfig {
  id: string;
  name: string;
  keyId: string; // References StoredKey.id
  model: string;
  rootPath: string; // Directory scope, e.g., "src/components" or "."
  systemPrompt: string;
  // Advanced Control
  temperature?: number; // 0.0 - 2.0 (Default 1.0 or 0.7)
  maxContextHistory?: number; // How many messages to keep
}

export interface AppSettings {
  editorFontSize: number;
  terminalFontSize: number;
  autoScrollTerminal: boolean;
}

export interface FileOperation { 
  type: 'read' | 'write' | 'delete' | 'list'; 
  path: string;
  content?: string; 
}

// Fallback models in case API fetching fails
// UPDATED to match latest API availability and guidelines
export const FALLBACK_MODELS: Record<AIProvider, string[]> = {
  google: [
    'gemini-2.5-flash',
    'gemini-3-pro-preview',
    'gemini-2.5-flash-image', // For image capabilities if needed
    'gemini-2.0-flash-exp' // Backup experimental
  ],
  groq: [
    'llama-3.3-70b-versatile',
    'llama-3.1-70b-versatile',
    'llama-3.1-8b-instant',
    'gemma2-9b-it'
  ],
  huggingface: [
    'meta-llama/Meta-Llama-3-8B-Instruct',
    'mistralai/Mistral-7B-Instruct-v0.2',
    'microsoft/Phi-3-mini-4k-instruct'
  ],
  mistral: [
    'open-mistral-7b',
    'open-mixtral-8x7b',
    'mistral-small-latest',
    'mistral-large-latest'
  ],
  openrouter: [
    'google/gemini-2.0-flash-exp:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'mistralai/mistral-7b-instruct:free',
    'nousresearch/hermes-3-llama-3.1-405b:free'
  ],
  puter: [
    'gpt-4o',
    'claude-3-5-sonnet',
    'gemini-1.5-pro',
    'llama-3-70b'
  ],
  sambanova: [
    'Meta-Llama-3.1-405B-Instruct',
    'Meta-Llama-3.1-70B-Instruct',
    'Meta-Llama-3.1-8B-Instruct'
  ],
  cerebras: [
    'llama3.1-70b',
    'llama3.1-8b'
  ],
  deepseek: [
    'deepseek-chat',
    'deepseek-coder'
  ],
  pollinations: [
    'openai', // Usually maps to GPT-4o
    'claude', // Claude 3.5 Sonnet
    'mistral',
    'llama',
    'searchgpt'
  ]
};