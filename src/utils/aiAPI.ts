import type { AIAvailabilityStatus } from "../types/built-in-ai";

// API names for type safety
export type APIName =
  | "summarizer"
  | "translator"
  | "languageDetector"
  | "prompt";

//Common error types
export class AIAPIError extends Error {
  apiName: APIName;
  originalError?: Error;

  constructor(message: string, apiName: APIName, originalError?: Error) {
    super(message);
    this.name = "AIAPIError";
    this.apiName = apiName;
    this.originalError = originalError;
  }
}

export class UserActivationError extends AIAPIError {
  constructor(apiName: APIName) {
    super(
      "User activation required. Please interact with the page first.",
      apiName
    );
    this.name = "UserActivationError";
  }
}

export class APINotAvailableError extends AIAPIError {
  constructor(apiName: APIName, status: AIAvailabilityStatus) {
    super(`${apiName} is not available. Status: ${status}`, apiName);
    this.name = "APINotAvailableError";
  }
}

// Simple session management utilities
export class SessionManager {
  private sessions: Map<string, any> = new Map();

  async createSession<T>(
    apiName: APIName,
    createFn: () => Promise<T>,
    sessionId?: string
  ): Promise<string> {
    const id = sessionId || `${apiName}_${Date.now()}`;

    // Check if session already exists
    if (this.sessions.has(id)) {
      return id;
    }

    // Check user activation
    if (!navigator.userActivation?.isActive) {
      throw new UserActivationError(apiName);
    }

    try {
      const session = await createFn();
      this.sessions.set(id, session);
      return id;
    } catch (error) {
      throw new AIAPIError(
        `Failed to create ${apiName} session`,
        apiName,
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  getSession(sessionId: string): any {
    return this.sessions.get(sessionId);
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Handle different session types
      if (typeof session.close === "function") {
        session.close();
      } else if (typeof session.destroy === "function") {
        session.destroy();
      }
    }
    this.sessions.delete(sessionId);
  }

  closeAllSessions(): void {
    this.sessions.forEach((session) => {
      if (session) {
        // Handle different session types
        if (typeof session.close === "function") {
          session.close();
        } else if (typeof session.destroy === "function") {
          session.destroy();
        }
      }
    });
    this.sessions.clear();
  }

  getActiveSessions(): string[] {
    return Array.from(this.sessions.keys());
  }
}

// Global session manager instance
export const sessionManager = new SessionManager();

// API wrapper functions (only stable APIs)
export const AIAPI = {
  /**
   * Summarize text using the Summarizer API
   */
  async summarize(
    text: string,
    options?: {
      type?: "key-points" | "tldr" | "teaser" | "headline";
      format?: "markdown" | "plain-text";
      length?: "short" | "medium" | "long";
      context?: string;
    }
  ): Promise<string> {
    // Default options for summarizer
    const defaultOptions = {
      type: "key-points" as const,
      format: "markdown" as const,
      length: "medium" as const,
      ...options,
    };

    const sessionId = await sessionManager.createSession("summarizer", () =>
      Summarizer.create(defaultOptions)
    );

    try {
      const session = sessionManager.getSession(sessionId);
      const result = await session.summarize(text, {
        context: options?.context,
      });
      return result;
    } catch (error) {
      sessionManager.closeSession(sessionId);
      throw new AIAPIError(
        "Failed to summarize text",
        "summarizer",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },

  /**
   * Translate text using the Translator API
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = "en"
  ): Promise<string> {
    const sessionId = await sessionManager.createSession("translator", () =>
      Translator.create({ sourceLanguage, targetLanguage })
    );

    try {
      const session = sessionManager.getSession(sessionId);
      const result = await session.translate(text);
      return result;
    } catch (error) {
      sessionManager.closeSession(sessionId);
      throw new AIAPIError(
        "Failed to translate text",
        "translator",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },

  /**
   * Download Translator model if needed
   */
  async downloadTranslatorModel(
    sourceLanguage: string = "en",
    targetLanguage: string = "es"
  ): Promise<void> {
    try {
      console.log(
        `Downloading Translator model: ${sourceLanguage} -> ${targetLanguage}`
      );

      // Create a session to trigger the download
      const sessionId = await sessionManager.createSession("translator", () =>
        Translator.create({ sourceLanguage, targetLanguage })
      );

      // Close the session immediately after creation to trigger download
      sessionManager.closeSession(sessionId);

      console.log("Translator model download initiated");
    } catch (error) {
      throw new AIAPIError(
        "Failed to download Translator model",
        "translator",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },

  /**
   * Detect language using the LanguageDetector API
   */
  async detectLanguage(text: string): Promise<string> {
    const sessionId = await sessionManager.createSession(
      "languageDetector",
      () => LanguageDetector.create()
    );

    try {
      const session = sessionManager.getSession(sessionId);
      const result = await session.detect(text);

      // LanguageDetector returns an array of detection results
      // Get the first (most confident) result
      if (Array.isArray(result) && result.length > 0) {
        return result[0].detectedLanguage || "";
      } else if (typeof result === "string") {
        return result;
      } else if (result?.detectedLanguage) {
        return result.detectedLanguage;
      }

      return "";
    } catch (error) {
      sessionManager.closeSession(sessionId);
      throw new AIAPIError(
        "Failed to detect language",
        "languageDetector",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },

  /**
   * Detect language with full results using the LanguageDetector API
   */
  async detectLanguageWithConfidence(
    text: string
  ): Promise<LanguageDetector.LanguageDetectionResult[]> {
    const sessionId = await sessionManager.createSession(
      "languageDetector",
      () => LanguageDetector.create()
    );

    try {
      const session = sessionManager.getSession(sessionId);
      const result = await session.detect(text);

      // Return the full array of results with confidence scores
      if (Array.isArray(result)) {
        return result;
      }

      return [];
    } catch (error) {
      sessionManager.closeSession(sessionId);
      throw new AIAPIError(
        "Failed to detect language with confidence",
        "languageDetector",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },

  /**
   * Process prompts using the Prompt API (LanguageModel)
   */
  async prompt(
    text: string,
    options?: {
      maxOutputTokens?: number;
      temperature?: number;
      topK?: number;
    }
  ): Promise<string> {
    const defaultOptions = {
      temperature: 1.0,
      topK: 3,
      ...options,
    };

    const sessionId = await sessionManager.createSession("prompt", () =>
      LanguageModel.create(defaultOptions)
    );

    try {
      const session = sessionManager.getSession(sessionId);
      const result = await session.prompt(text);
      return result;
    } catch (error) {
      sessionManager.closeSession(sessionId);
      throw new AIAPIError(
        "Failed to process prompt",
        "prompt",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  },
};

// Utility functions for common operations
export const AIUtils = {
  /**
   * Check if user activation is required and throw error if not available
   */
  requireUserActivation(apiName: APIName): void {
    if (!navigator.userActivation?.isActive) {
      throw new UserActivationError(apiName);
    }
  },

  /**
   * Check API availability and throw error if not available
   */
  async requireAPIAvailability(
    apiName: APIName | "languageModel"
  ): Promise<void> {
    let status: AIAvailabilityStatus;

    switch (apiName) {
      case "summarizer":
        status = await Summarizer.availability();
        break;
      case "languageModel":
        status = await LanguageModel.availability();
        break;
      case "translator":
        status = await Translator.availability({
          sourceLanguage: "en",
          targetLanguage: "es",
        });
        break;
      case "languageDetector":
        status = await LanguageDetector.availability();
        break;
      case "prompt":
        status = await LanguageModel.availability();
        break;
      default:
        throw new AIAPIError(`Unknown API: ${apiName}`, apiName as APIName);
    }

    if (status !== "available") {
      throw new APINotAvailableError(apiName as APIName, status);
    }
  },

  /**
   * Get human-readable status message
   */
  getStatusMessage(status: AIAvailabilityStatus): string {
    switch (status) {
      case "available":
        return "Ready to use";
      case "downloadable":
        return "Available for download";
      case "downloading":
        return "Downloading...";
      case "unavailable":
        return "Not available";
      default:
        return "Unknown status";
    }
  },

  /**
   * Format error message for display
   */
  formatError(error: Error): string {
    if (error instanceof AIAPIError) {
      return `${error.apiName}: ${error.message}`;
    }
    return error.message || "An unknown error occurred";
  },
};
