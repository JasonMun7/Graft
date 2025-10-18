interface LanguageModelCreateOptions {
  systemPrompt?: string;
  initialPrompts?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  temperature?: number;
  topK?: number;
}

interface LanguageModelPromptOptions {
  responseConstraint?: object; // JSON Schema
}

interface LanguageModelSession {
  prompt(input: string, options?: LanguageModelPromptOptions): Promise<string>;
  promptStreaming(input: string, options?: LanguageModelPromptOptions): ReadableStream;
  destroy(): void;
  temperature: number;
  topK: number;
  inputQuota?: number;
  maxTokens?: number;
  inputUsage?: number;
  tokensSoFar?: number;
  countPromptTokens?(input: string): Promise<number>;
  measureInputUsage?(input: string): Promise<number>;
}

interface LanguageModelFactory {
  create(options?: LanguageModelCreateOptions): Promise<LanguageModelSession>;
  params(): Promise<{
    defaultTopK: number;
    maxTopK: number;
    defaultTemperature: number;
    maxTemperature: number;
  }>;
}

declare global {
  interface Window {
    LanguageModel: LanguageModelFactory;
  }
  
  const LanguageModel: LanguageModelFactory;
}

export {};