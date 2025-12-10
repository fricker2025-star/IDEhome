
import { StoredKey, AgentConfig, AppSettings } from '../types';

const KEYS_STORAGE_KEY = 'gemini-ide-keys';
const AGENTS_STORAGE_KEY = 'gemini-ide-agents';
const SETTINGS_STORAGE_KEY = 'gemini-ide-settings';

const DEFAULT_SETTINGS: AppSettings = {
  editorFontSize: 14,
  terminalFontSize: 12,
  autoScrollTerminal: true,
};

export const storageService = {
  getKeys(): StoredKey[] {
    try {
      const data = localStorage.getItem(KEYS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load keys', e);
      return [];
    }
  },

  saveKeys(keys: StoredKey[]) {
    localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
  },

  getAgents(): AgentConfig[] {
    try {
      const data = localStorage.getItem(AGENTS_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to load agents', e);
      return [];
    }
  },

  saveAgents(agents: AgentConfig[]) {
    localStorage.setItem(AGENTS_STORAGE_KEY, JSON.stringify(agents));
  },

  getSettings(): AppSettings {
    try {
      const data = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch (e) {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: AppSettings) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
};