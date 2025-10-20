// TypeScript declarations for Chrome's built-in AI APIs
// These are experimental APIs and may change

declare global {
  interface Navigator {
    userActivation: {
      isActive: boolean;
    };
  }

  // Common types
  type AIAvailabilityStatus =
    | "unavailable"
    | "downloadable"
    | "downloading"
    | "available";

  interface BaseAIOptions {
    maxOutputTokens?: number;
    temperature?: number;
  }

  interface BaseAISession {
    close(): void;
  }

  // Summarizer API
  namespace Summarizer {
    interface SummarizerOptions {
      sharedContext?: string;
      type?: "key-points" | "tldr" | "teaser" | "headline";
      format?: "markdown" | "plain-text";
      length?: "short" | "medium" | "long";
      monitor?: (monitor: {
        addEventListener: (
          event: "downloadprogress",
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }

    interface SummarizerSession extends BaseAISession {
      summarize(input: string, options?: { context?: string }): Promise<string>;
      summarizeStreaming(
        input: string,
        options?: { context?: string }
      ): ReadableStream<string>;
    }

    function availability(): Promise<AIAvailabilityStatus>;
    function create(options?: SummarizerOptions): Promise<SummarizerSession>;
  }

  // Language Model API (Prompt API)
  namespace LanguageModel {
    interface LanguageModelOptions {
      temperature?: number;
      topK?: number;
      signal?: AbortSignal;
      initialPrompts?: Array<{
        role: "system" | "user" | "assistant";
        content:
          | string
          | Array<{
              type: "text" | "image" | "audio";
              value: string | File;
            }>;
        prefix?: boolean;
      }>;
      expectedInputs?: Array<{
        type: "text" | "image" | "audio";
        languages: string[];
      }>;
      expectedOutputs?: Array<{
        type: "text";
        languages: string[];
      }>;
      monitor?: (monitor: {
        addEventListener: (
          event: "downloadprogress",
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }

    interface LanguageModelParams {
      defaultTopK: number;
      maxTopK: number;
      defaultTemperature: number;
      maxTemperature: number;
    }

    interface LanguageModelSession {
      prompt(
        input: string,
        options?: {
          responseConstraint?: any;
          omitResponseConstraintInput?: boolean;
          signal?: AbortSignal;
        }
      ): Promise<string>;
      promptStreaming(
        input: string,
        options?: {
          responseConstraint?: any;
          omitResponseConstraintInput?: boolean;
          signal?: AbortSignal;
        }
      ): ReadableStream<string>;
      append(
        prompts: Array<{
          role: "user" | "assistant";
          content:
            | string
            | Array<{
                type: "text" | "image" | "audio";
                value: string | File;
              }>;
          prefix?: boolean;
        }>
      ): Promise<void>;
      clone(options?: { signal?: AbortSignal }): Promise<LanguageModelSession>;
      destroy(): void;
      inputUsage: number;
      inputQuota: number;
    }

    function availability(): Promise<AIAvailabilityStatus>;
    function params(): Promise<LanguageModelParams>;
    function create(
      options?: LanguageModelOptions
    ): Promise<LanguageModelSession>;
  }

  // Translator API
  namespace Translator {
    interface TranslatorOptions {
      sourceLanguage: string;
      targetLanguage: string;
      monitor?: (monitor: {
        addEventListener: (
          event: "downloadprogress",
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }

    interface TranslatorSession extends BaseAISession {
      translate(input: string): Promise<string>;
      translateStreaming(input: string): ReadableStream<string>;
    }

    function availability(options: {
      sourceLanguage: string;
      targetLanguage: string;
    }): Promise<AIAvailabilityStatus>;
    function create(options: TranslatorOptions): Promise<TranslatorSession>;
  }

  // Language Detector API
  namespace LanguageDetector {
    interface LanguageDetectionResult {
      confidence: number;
      detectedLanguage: string;
    }

    interface LanguageDetectorOptions {
      monitor?: (monitor: {
        addEventListener: (
          event: "downloadprogress",
          callback: (e: { loaded: number }) => void
        ) => void;
      }) => void;
    }

    interface LanguageDetectorSession extends BaseAISession {
      detect(input: string): Promise<LanguageDetectionResult[]>;
    }

    function availability(): Promise<AIAvailabilityStatus>;
    function create(
      options?: LanguageDetectorOptions
    ): Promise<LanguageDetectorSession>;
  }

  // Writer API
  namespace Writer {
    interface WriterOptions extends BaseAIOptions {}

    interface WriterSession extends BaseAISession {
      write(input: string, options?: WriterOptions): Promise<string>;
    }

    function availability(): Promise<AIAvailabilityStatus>;
    function create(options?: WriterOptions): Promise<WriterSession>;
  }

  // Rewriter API
  namespace Rewriter {
    interface RewriterOptions extends BaseAIOptions {}

    interface RewriterSession extends BaseAISession {
      rewrite(input: string, options?: RewriterOptions): Promise<string>;
    }

    function availability(): Promise<AIAvailabilityStatus>;
    function create(options?: RewriterOptions): Promise<RewriterSession>;
  }

  // Proofreader API
  namespace Proofreader {
    interface ProofreaderOptions extends BaseAIOptions {}

    interface ProofreaderSession extends BaseAISession {
      proofread(input: string, options?: ProofreaderOptions): Promise<string>;
    }

    function availability(): Promise<AIAvailabilityStatus>;
    function create(options?: ProofreaderOptions): Promise<ProofreaderSession>;
  }
}

// Export types for use in other files
export type { AIAvailabilityStatus };
