
import { GoogleGenAI, FunctionDeclaration, Type, Tool } from "@google/genai";
import { fileSystemService } from "./fileSystem";
import { syntaxService } from "./syntaxService";
import { previewService } from "./previewService";
import { knowledgeService } from "./knowledgeService";
import { AIProvider, AgentConfig } from "../types";

// --- Tool Definitions (Google Format) ---

const listFilesTool: FunctionDeclaration = {
  name: "listFiles",
  description: "List all files and directories in a specific directory path relative to the project root.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The directory path to list. Use '' or '.' for root." },
    },
    required: ["path"],
  },
};

const readFileTool: FunctionDeclaration = {
  name: "readFile",
  description: "Read the text content of a single file.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The path of the file to read." },
    },
    required: ["path"],
  },
};

const readMultipleFilesTool: FunctionDeclaration = {
  name: "readMultipleFiles",
  description: "Read multiple files at once. Efficient for analyzing dependencies.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      paths: { 
          type: Type.ARRAY, 
          items: { type: Type.STRING },
          description: "Array of file paths to read." 
      },
    },
    required: ["paths"],
  },
};

const writeFileTool: FunctionDeclaration = {
  name: "writeFile",
  description: "Create or overwrite a file. RETURNS SYNTAX ERRORS if code is invalid. Intermediate directories are created automatically.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The path where the file should be written." },
      content: { type: Type.STRING, description: "The full content to write. MUST use \\n for newlines." },
    },
    required: ["path", "content"],
  },
};

const createDirectoryTool: FunctionDeclaration = {
  name: "createDirectory",
  description: "Create a new directory recursively.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The path of the directory to create." },
    },
    required: ["path"],
  },
};

const deleteFileTool: FunctionDeclaration = {
  name: "deleteFile",
  description: "Delete a file or directory recursively.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The path to delete." },
    },
    required: ["path"],
  },
};

const searchFilesTool: FunctionDeclaration = {
  name: "searchFiles",
  description: "Simple filename search. Finds files by matching the name.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "Text to search for." },
    },
    required: ["query"],
  },
};

const searchCodebaseTool: FunctionDeclaration = {
  name: "searchCodebase",
  description: "SEMANTIC SEARCH. Use this to find definitions, functions, classes, or logic across the entire project based on a concept or name. Returns relevant file paths and summaries.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: "The concept, function name, or logic you are looking for." },
    },
    required: ["query"],
  },
};

const runTerminalTool: FunctionDeclaration = {
  name: "runTerminal",
  description: "Execute ANY BASH COMMAND in the terminal. Supports git, npm, python, pip, ls, etc. Use this for all shell operations.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      command: { type: Type.STRING, description: "The full shell command string to execute." },
    },
    required: ["command"],
  },
};

const deployToPreviewTool: FunctionDeclaration = {
  name: "deployToPreview",
  description: "Compile and run the current web project (HTML/CSS/JS) in the Live Preview pane. Call this after writing code.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      entryPoint: { type: Type.STRING, description: "The main HTML file to load (default: index.html)." },
    },
    required: [],
  },
};

const fetchUrlTool: FunctionDeclaration = {
  name: "fetchUrl",
  description: "Fetch external text content from a URL (e.g. documentation, raw code). Limited by CORS.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      url: { type: Type.STRING, description: "The URL to fetch." },
    },
    required: ["url"],
  },
};

const googleTools: Tool[] = [{
  functionDeclarations: [
      listFilesTool, readFileTool, readMultipleFilesTool, 
      writeFileTool, createDirectoryTool, deleteFileTool,
      searchFilesTool, searchCodebaseTool, runTerminalTool, deployToPreviewTool, fetchUrlTool
  ]
}];

// --- Tool Definitions (OpenAI/Groq/Mistral Format) ---
const openAITools = [
  {
    type: "function",
    function: {
      name: "listFiles",
      description: "List files in a directory.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
    }
  },
  {
    type: "function",
    function: {
      name: "readFile",
      description: "Read a file.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
    }
  },
  {
    type: "function",
    function: {
      name: "readMultipleFiles",
      description: "Read multiple files.",
      parameters: { type: "object", properties: { paths: { type: "array", items: { type: "string" } } }, required: ["paths"] }
    }
  },
  {
    type: "function",
    function: {
      name: "writeFile",
      description: "Write content to a file. Reports syntax errors.",
      parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] }
    }
  },
  {
    type: "function",
    function: {
      name: "createDirectory",
      description: "Create a directory.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
    }
  },
  {
    type: "function",
    function: {
      name: "deleteFile",
      description: "Delete file/folder.",
      parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }
    }
  },
  {
    type: "function",
    function: {
      name: "searchFiles",
      description: "Search files by name.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    }
  },
  {
    type: "function",
    function: {
      name: "searchCodebase",
      description: "Semantic search across project. Finds definitions and logic.",
      parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
    }
  },
  {
    type: "function",
    function: {
      name: "runTerminal",
      description: "Execute shell command (git, npm, ls, etc).",
      parameters: { type: "object", properties: { command: { type: "string" } }, required: ["command"] }
    }
  },
  {
    type: "function",
    function: {
      name: "deployToPreview",
      description: "Run web project in preview.",
      parameters: { type: "object", properties: { entryPoint: { type: "string" } }, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "fetchUrl",
      description: "Fetch external URL text.",
      parameters: { type: "object", properties: { url: { type: "string" } }, required: ["url"] }
    }
  }
];

// --- Helper: Robust JSON Extractor ---
function extractJsonCandidates(text: string): any[] {
    const candidates: any[] = [];
    let stack: string[] = [];
    let startIndex = -1;
    let inString = false;
    let isEscaped = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (inString) {
            if (char === '\\' && !isEscaped) {
                isEscaped = true;
            } else if (char === '"' && !isEscaped) {
                inString = false;
            } else {
                isEscaped = false;
            }
            continue;
        }

        if (char === '"') {
            inString = true;
            continue;
        }

        if (char === '{' || char === '[') {
            if (stack.length === 0) startIndex = i;
            stack.push(char === '{' ? '}' : ']');
        } else if (char === '}' || char === ']') {
            if (stack.length > 0 && char === stack[stack.length - 1]) {
                stack.pop();
                if (stack.length === 0 && startIndex !== -1) {
                    const jsonStr = text.substring(startIndex, i + 1);
                    try {
                        const parsed = JSON.parse(jsonStr);
                        candidates.push(parsed);
                    } catch (e) {
                        try {
                             const strictSanitized = jsonStr.replace(/(?:\r\n|\r|\n)/g, '\\n');
                             const parsed = JSON.parse(strictSanitized);
                             candidates.push(parsed);
                        } catch(e2) {}
                    }
                    startIndex = -1;
                }
            }
        }
    }
    return candidates;
}

// --- Helper: History Pruning ---
function pruneMessages(messages: any[], maxChars: number): any[] {
    if (messages.length <= 2) return messages;

    const systemMsg = messages[0];
    const lastMsg = messages[messages.length - 1];
    let currentChars = JSON.stringify(systemMsg).length + JSON.stringify(lastMsg).length;
    
    const middleMessages = messages.slice(1, -1);
    const keptMiddle: any[] = [];

    for (let i = middleMessages.length - 1; i >= 0; i--) {
        const msg = middleMessages[i];
        const len = JSON.stringify(msg).length;
        if (currentChars + len > maxChars) {
            break; 
        }
        currentChars += len;
        keptMiddle.unshift(msg);
    }

    return [systemMsg, ...keptMiddle, lastMsg];
}


// --- Service Class ---

export class AIService {

  async fetchModels(provider: AIProvider, apiKey: string): Promise<string[]> {
    try {
        if (provider === 'google') {
            const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error("Failed to fetch Google models");
            const data = await res.json();
            return data.models
                .filter((m: any) => m.supportedGenerationMethods.includes('generateContent'))
                .map((m: any) => m.name.replace('models/', ''));
        }

        if (provider === 'groq') {
            const res = await fetch('https://api.groq.com/openai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) throw new Error("Failed to fetch Groq models");
            const data = await res.json();
            return data.data.map((m: any) => m.id);
        }

        if (provider === 'mistral') {
            const res = await fetch('https://api.mistral.ai/v1/models', {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            if (!res.ok) throw new Error("Failed to fetch Mistral models");
            const data = await res.json();
            return data.data.map((m: any) => m.id);
        }

        if (provider === 'openrouter') {
             const res = await fetch('https://openrouter.ai/api/v1/models');
             if (!res.ok) throw new Error("Failed to fetch OpenRouter models");
             const data = await res.json();
             return data.data.map((m: any) => m.id);
        }
        
        if (provider === 'sambanova') {
             try {
                const res = await fetch('https://api.sambanova.ai/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.data.map((m: any) => m.id);
                }
             } catch(e) { /* ignore, use fallback */ }
        }

        if (provider === 'cerebras') {
             try {
                const res = await fetch('https://api.cerebras.ai/v1/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.data.map((m: any) => m.id);
                }
             } catch(e) { /* ignore */ }
        }

        if (provider === 'deepseek') {
             try {
                const res = await fetch('https://api.deepseek.com/models', {
                    headers: { 'Authorization': `Bearer ${apiKey}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    return data.data.map((m: any) => m.id);
                }
             } catch(e) { /* ignore */ }
        }

        if (provider === 'pollinations') {
             return ['openai', 'claude', 'mistral', 'llama', 'searchgpt'];
        }

        return [];
    } catch (e) {
        console.warn(`Failed to fetch models for ${provider}:`, e);
        return [];
    }
  }
  
  async generatePlan(
    apiKey: string,
    provider: AIProvider,
    modelName: string,
    agents: AgentConfig[],
    userMessage: string
  ): Promise<Record<string, string> | null> {
    const agentsList = agents.map(a => `- ID: ${a.id}\n  Name: ${a.name}\n  Role: ${a.systemPrompt}`).join('\n');
    const prompt = `
You are a lead architect and project manager. 
User Request: "${userMessage}"

Available Agents:
${agentsList}

Your goal is to break down the User Request and assign specific tasks to the agents above.
Return a valid JSON object where keys are the Agent IDs and values are the specific instructions for them.
Example:
{
  "agent_id_1": "Create the generic components...",
  "agent_id_2": "Write the unit tests for..."
}
Do not output markdown, only the raw JSON.
    `;

    try {
        if (provider === 'google') {
            const ai = new GoogleGenAI({ apiKey });
            const response = await ai.models.generateContent({
                model: modelName,
                contents: prompt,
                config: {
                    responseMimeType: "application/json"
                }
            });
            const text = response.text;
            if (!text) return null;
            return JSON.parse(text);
        }

        if (['groq', 'mistral', 'openrouter', 'sambanova', 'cerebras', 'deepseek', 'pollinations'].includes(provider)) {
            let endpoint = '';
            let finalApiKey = apiKey;
            
            if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
            if (provider === 'mistral') endpoint = 'https://api.mistral.ai/v1/chat/completions';
            if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
            if (provider === 'sambanova') endpoint = 'https://api.sambanova.ai/v1/chat/completions';
            if (provider === 'cerebras') endpoint = 'https://api.cerebras.ai/v1/chat/completions';
            if (provider === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
            if (provider === 'pollinations') {
                endpoint = 'https://text.pollinations.ai/openai/chat/completions';
                finalApiKey = apiKey || 'dummy'; 
            }

            const extraHeaders: Record<string, string> = provider === 'openrouter' ? 
                { 'HTTP-Referer': window.location.href, 'X-Title': 'Gemini Code Studio' } : {};

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${finalApiKey}`,
                    'Content-Type': 'application/json',
                    ...extraHeaders
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [{ role: 'system', content: "You are a project manager. Output JSON only." }, { role: 'user', content: prompt }],
                    response_format: { type: "json_object" }
                })
            });

            if (!res.ok) return null;
            const data = await res.json();
            const content = data.choices?.[0]?.message?.content;
            if (content) {
                const candidates = extractJsonCandidates(content);
                return candidates.length > 0 ? candidates[0] : null;
            }
        }
        
        return null;
    } catch (e) {
        console.error("Plan generation failed:", e);
        return null;
    }
  }

  // --- Creative / Image Generation Mode ---
  async sendCreativeMessage(
    apiKey: string,
    provider: AIProvider,
    modelName: string,
    history: any[],
    userMessage: string,
    images: string[],
    signal?: AbortSignal
  ): Promise<{ text: string, generatedImages: string[] }> {
      
      const systemInstruction = "You are a creative AI assistant. You can generate text, answer questions, or generate images if requested. If the user asks for an image, the model will output it directly. Do not act as a coding agent.";
      
      if (provider === 'google') {
          const ai = new GoogleGenAI({ apiKey });
          
          const geminiHistory = history.map(h => ({
              role: h.role,
              parts: h.parts 
          }));

          const chat = ai.chats.create({
              model: modelName, 
              history: geminiHistory,
              config: { systemInstruction }
          });

          const userParts: any[] = [{ text: userMessage }];
          if (images.length > 0) {
              images.forEach(img => {
                  const base64Data = img.split(',')[1]; 
                  const mimeType = img.split(';')[0].split(':')[1] || 'image/png';
                  userParts.push({ inlineData: { mimeType, data: base64Data } });
              });
          }

          const response = await chat.sendMessage({ message: userParts });
          
          let text = "";
          const generatedImages: string[] = [];

          if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
              for (const part of response.candidates[0].content.parts) {
                  if (part.text) {
                      text += part.text;
                  }
                  if (part.inlineData) {
                      const mime = part.inlineData.mimeType;
                      const data = part.inlineData.data;
                      generatedImages.push(`data:${mime};base64,${data}`);
                  }
              }
          }

          return { text: text || response.text || "", generatedImages };
      }

      const textResponse = await this.sendMessage(apiKey, provider, modelName, systemInstruction, history, userMessage, images, () => {}, undefined, signal);
      return { text: textResponse, generatedImages: [] };
  }

  // --- Main Coding Mode ---

  async sendMessage(
    apiKey: string,
    provider: AIProvider,
    modelName: string,
    systemInstruction: string,
    history: any[], 
    newMessage: string,
    images: string[], // Base64 images from user
    onToolStart: (name: string, args: any) => void,
    onToolEnd?: (name: string, args: any, result: any) => void,
    signal?: AbortSignal,
    parameters?: { temperature?: number, maxTokens?: number }
  ): Promise<string> {
    
    // Inject Context - reduce depth for providers with low limits
    const maxHistory = ['google', 'anthropic'].includes(provider) ? 20 : 10;
    const prunedHistory = pruneMessages(history, 20000); 

    // -- GOOGLE GEMINI --
    if (provider === 'google') {
        const ai = new GoogleGenAI({ apiKey });
        
        const chat = ai.chats.create({
            model: modelName,
            history: prunedHistory,
            config: {
                systemInstruction: systemInstruction,
                temperature: parameters?.temperature,
                maxOutputTokens: parameters?.maxTokens,
                tools: googleTools
            }
        });

        const parts: any[] = [{ text: newMessage }];
        if (images.length > 0) {
              images.forEach(img => {
                  const base64Data = img.split(',')[1]; 
                  const mimeType = img.split(';')[0].split(':')[1] || 'image/png';
                  parts.push({ inlineData: { mimeType, data: base64Data } });
              });
        }

        let response = await chat.sendMessage({ message: parts });
        
        // Loop for Tool Calls
        const maxTurns = 5;
        let turn = 0;

        while (response.functionCalls && response.functionCalls.length > 0 && turn < maxTurns) {
            turn++;
            const functionResponses: any[] = [];
            
            for (const call of response.functionCalls) {
                const name = call.name;
                const args = call.args;
                
                onToolStart(name, args);
                
                let result: any;
                try {
                    result = await this.executeTool(name, args);
                } catch (e: any) {
                    result = { error: e.message };
                }

                if (onToolEnd) onToolEnd(name, args, result);

                functionResponses.push({
                    functionResponse: {
                        name: name,
                        response: { result: result },
                        id: call.id 
                    }
                });
            }

            response = await chat.sendMessage({ message: functionResponses });
        }

        return response.text || "";
    }
    
    // -- OTHER PROVIDERS (OpenAI Compatible) --
    if (['groq', 'mistral', 'openrouter', 'sambanova', 'cerebras', 'deepseek', 'pollinations'].includes(provider)) {
        let endpoint = '';
        let finalApiKey = apiKey;
        
        if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
        if (provider === 'mistral') endpoint = 'https://api.mistral.ai/v1/chat/completions';
        if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';
        if (provider === 'sambanova') endpoint = 'https://api.sambanova.ai/v1/chat/completions';
        if (provider === 'cerebras') endpoint = 'https://api.cerebras.ai/v1/chat/completions';
        if (provider === 'deepseek') endpoint = 'https://api.deepseek.com/chat/completions';
        if (provider === 'pollinations') {
            endpoint = 'https://text.pollinations.ai/openai/chat/completions';
            finalApiKey = apiKey || 'dummy'; 
        }

        const messages = [
            { role: 'system', content: systemInstruction },
            ...prunedHistory.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.parts[0].text })),
            { role: 'user', content: newMessage }
        ];

        const extraHeaders: Record<string, string> = provider === 'openrouter' ? 
            { 'HTTP-Referer': window.location.href, 'X-Title': 'Gemini Code Studio' } : {};

        let turn = 0;
        const maxTurns = 5;
        
        while (turn < maxTurns) {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${finalApiKey}`,
                    'Content-Type': 'application/json',
                    ...extraHeaders
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: messages,
                    tools: openAITools,
                    temperature: parameters?.temperature,
                    max_tokens: parameters?.maxTokens
                }),
                signal
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Provider Error: ${errText}`);
            }

            const data = await res.json();
            const choice = data.choices[0];
            const msg = choice.message;

            if (msg.tool_calls && msg.tool_calls.length > 0) {
                messages.push(msg);
                
                for (const toolCall of msg.tool_calls) {
                    const fnName = toolCall.function.name;
                    let args;
                    try { args = JSON.parse(toolCall.function.arguments); } catch { args = {}; }

                    onToolStart(fnName, args);
                    const result = await this.executeTool(fnName, args);
                    if (onToolEnd) onToolEnd(fnName, args, result);

                    messages.push({
                        role: "tool",
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result)
                    } as any);
                }
                turn++;
            } else {
                return msg.content || "";
            }
        }
        return "Max turns reached";
    }

    return "Provider not implemented yet.";
  }

  // --- Helper: Tool Execution ---
  private async executeTool(name: string, args: any): Promise<any> {
      try {
        switch (name) {
            case 'listFiles': return await fileSystemService.readDirectoryRecursive(fileSystemService.getRootHandle(), args.path);
            case 'readFile': return await fileSystemService.readFile(args.path);
            case 'readMultipleFiles': return await fileSystemService.readMultipleFiles(args.paths);
            case 'writeFile': 
                const syntaxError = syntaxService.validate(args.content, args.path);
                if (syntaxError) return { error: `Syntax Error: ${syntaxError}` };
                await fileSystemService.writeFile(args.path, args.content);
                return { success: true };
            case 'createDirectory': await fileSystemService.createDirectory(args.path); return { success: true };
            case 'deleteFile': await fileSystemService.deleteEntry(args.path); return { success: true };
            case 'searchFiles': return await fileSystemService.searchFiles(args.query);
            case 'searchCodebase': return knowledgeService.search(args.query);
            case 'runTerminal': return await fileSystemService.runTerminalCommand(args.command);
            case 'deployToPreview': 
                const url = await previewService.generatePreviewUrl(args.entryPoint || 'index.html');
                return { previewUrl: url };
            case 'fetchUrl':
                const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(args.url)}`);
                const data = await res.json();
                return { content: data.contents };
            default: return { error: `Unknown tool: ${name}` };
        }
      } catch (e: any) {
          return { error: e.message };
      }
  }
}

export const geminiService = new AIService();
