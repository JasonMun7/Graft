import React, { useState, useEffect, useCallback } from "react";
import { AIAPI, AIUtils } from "../utils/aiAPI";
import ErrorHandler from "./ErrorHandler";

// API names for type safety
export type APIName =
  | "summarizer"
  | "translator"
  | "languageDetector"
  | "prompt"
  | "rewriter";

// Sample texts for APIs
const SAMPLE_TEXTS = {
  summarizer: `Artificial intelligence (AI) is intelligence demonstrated by machines, in contrast to the natural intelligence displayed by humans and animals. Leading AI textbooks define the field as the study of "intelligent agents": any device that perceives its environment and takes actions that maximize its chance of successfully achieving its goals.`,

  translator: `Hello, how are you today? I hope you're having a wonderful day!`,

  languageDetector: `Bonjour, comment allez-vous? Je suis très content de vous rencontrer.`,

  prompt: `Explain quantum computing in simple terms that a high school student could understand.`,

  rewriter: `The weather is nice today and I'm feeling good. I think I'll go for a walk in the park and maybe get some ice cream.`,
};

// Utility function to format API names for display
const formatAPIName = (apiName: APIName): string => {
  return apiName
    .split(/(?=[A-Z])/)
    .join(" ")
    .replace(/^./, (str) => str.toUpperCase());
};

interface TestResult {
  apiName: APIName;
  input: string;
  output: string;
  error?: string;
  timestamp: Date;
}

const BuiltInAITest: React.FC = () => {
  // Direct state management instead of hooks
  const [status, setStatus] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUserActivated, setIsUserActivated] = useState(false);

  // Check user activation status
  const checkUserActivation = useCallback(() => {
    const activated = navigator.userActivation?.isActive || false;
    setIsUserActivated(activated);
    return activated;
  }, []);

  // Check availability of all APIs
  const checkAvailability = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const apiChecks = [
        { name: "summarizer", check: () => Summarizer.availability() },
        {
          name: "translator",
          check: () =>
            Translator.availability({
              sourceLanguage: "en",
              targetLanguage: "es",
            }),
        },
        {
          name: "languageDetector",
          check: () => LanguageDetector.availability(),
        },
        {
          name: "prompt",
          check: () => LanguageModel.availability(),
        },
        {
          name: "rewriter",
          check: () => Rewriter.availability(),
        },
      ];

      const results: Record<string, any> = {};

      // Check all APIs in parallel
      const promises = apiChecks.map(async ({ name, check }) => {
        try {
          const result = await check();
          results[name] = result;
        } catch (err) {
          console.warn(`Failed to check ${name} availability:`, err);
          results[name] = "unavailable";
        }
      });

      await Promise.all(promises);
      setStatus(results);
    } catch (err) {
      console.error("Error checking API availability:", err);
      setError(
        "Failed to check API availability. Make sure you're using Chrome with built-in AI support."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh status (alias for checkAvailability)
  const refreshStatus = useCallback(async () => {
    await checkAvailability();
  }, [checkAvailability]);

  // Initial load
  useEffect(() => {
    checkAvailability();
    checkUserActivation();
  }, [checkAvailability, checkUserActivation]);

  // Monitor user activation changes
  useEffect(() => {
    const interval = setInterval(checkUserActivation, 1000);
    return () => clearInterval(interval);
  }, [checkUserActivation]);

  const [selectedAPI, setSelectedAPI] = useState<APIName>("summarizer");
  const [inputText, setInputText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [currentError, setCurrentError] = useState("");
  const [reactError, setReactError] = useState<Error | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<string | null>(null);
  const [options, setOptions] = useState({
    maxOutputTokens: 200,
    temperature: 1.0, // Default for Prompt API
    topK: 3, // Default for Prompt API
    // Summarizer options
    summaryType: "key-points" as "key-points" | "tldr" | "teaser" | "headline",
    summaryFormat: "markdown" as "markdown" | "plain-text",
    summaryLength: "medium" as "short" | "medium" | "long",
    // Translator options
    targetLanguage: "es",
    sourceLanguage: "en",
    // Language Detector options
    showConfidence: false,
    // Rewriter options
    tone: "more-formal" as "more-formal" | "less-formal",
    format: "plain-text" as "plain-text" | "markdown",
    length: "shorter" as "shorter" | "longer",
  });

  // API-specific configurations (including Prompt API in origin trial)
  const apiConfigs = {
    summarizer: {
      label: "Summarizer",
      description: "Summarize long text into shorter, concise versions",
      hasOptions: true,
      sampleText: SAMPLE_TEXTS.summarizer,
    },
    translator: {
      label: "Translator",
      description: "Translate text between different languages",
      hasOptions: true,
      sampleText: SAMPLE_TEXTS.translator,
      extraFields: ["targetLanguage", "sourceLanguage"],
    },
    languageDetector: {
      label: "Language Detector",
      description: "Detect the language of input text with confidence scores",
      hasOptions: true,
      sampleText: SAMPLE_TEXTS.languageDetector,
    },
    prompt: {
      label: "Prompt API",
      description: "General AI interactions with custom prompts (Origin Trial)",
      hasOptions: true,
      sampleText: SAMPLE_TEXTS.prompt,
    },
    rewriter: {
      label: "Rewriter",
      description: "Rewrite text with different tones and styles",
      hasOptions: true,
      sampleText: SAMPLE_TEXTS.rewriter,
    },
  };

  const currentConfig = apiConfigs[selectedAPI];

  const handleAPISelection = async (apiName: APIName) => {
    setSelectedAPI(apiName);
    setInputText("");
    setCurrentError("");
    setDownloadStatus(null);
    setInputText(apiConfigs[apiName].sampleText);

    // Automatically download model if needed
    await downloadModelIfNeeded(apiName);
  };

  const downloadModelIfNeeded = async (apiName: APIName) => {
    try {
      let currentStatus = status[apiName];

      if (apiName === "translator") {
        currentStatus = await Translator.availability({
          sourceLanguage: options.sourceLanguage,
          targetLanguage: options.targetLanguage,
        });
      } else if (apiName === "summarizer") {
        currentStatus = await Summarizer.availability();
      } else if (apiName === "languageDetector") {
        currentStatus = await LanguageDetector.availability();
      } else if (apiName === "prompt") {
        currentStatus = await LanguageModel.availability();
      }

      if (currentStatus === "downloadable") {
        setIsDownloading(true);
        setDownloadStatus(`Downloading ${apiConfigs[apiName].label} model...`);

        if (apiName === "translator") {
          await AIAPI.downloadTranslatorModel(
            options.sourceLanguage,
            options.targetLanguage
          );
        } else {
          // For other APIs, try to create a session to trigger download
          try {
            if (apiName === "summarizer") {
              const session = await Summarizer.create({
                type: "key-points",
                format: "markdown",
                length: "medium",
              });
              if (typeof session.close === "function") session.close();
            } else if (apiName === "languageDetector") {
              const session = await LanguageDetector.create();
              if (typeof session.close === "function") session.close();
            } else if (apiName === "prompt") {
              const session = await LanguageModel.create();
              if (typeof session.destroy === "function") session.destroy();
            } else if (apiName === "rewriter") {
              const session = await Rewriter.create();
              if (typeof session.destroy === "function") session.destroy();
            }
          } catch (error) {
            console.log("Model download triggered:", error);
          }
        }

        setDownloadStatus(
          `${apiConfigs[apiName].label} model download initiated!`
        );

        // Refresh status after a short delay
        setTimeout(() => {
          refreshStatus();
          setIsDownloading(false);
          setDownloadStatus(null);
        }, 2000);
      } else if (currentStatus === "downloading") {
        setDownloadStatus(
          `${apiConfigs[apiName].label} model is downloading...`
        );
        setIsDownloading(true);

        // Check status periodically while downloading
        const checkDownloadProgress = setInterval(async () => {
          try {
            let newStatus = status[apiName];

            if (apiName === "translator") {
              newStatus = await Translator.availability({
                sourceLanguage: options.sourceLanguage,
                targetLanguage: options.targetLanguage,
              });
            } else if (apiName === "summarizer") {
              newStatus = await Summarizer.availability();
            } else if (apiName === "languageDetector") {
              newStatus = await LanguageDetector.availability();
            } else if (apiName === "prompt") {
              newStatus = await LanguageModel.availability();
            } else if (apiName === "rewriter") {
              newStatus = await Rewriter.availability();
            }

            if (newStatus === "available") {
              clearInterval(checkDownloadProgress);
              setIsDownloading(false);
              setDownloadStatus(`${apiConfigs[apiName].label} model is ready!`);
              setTimeout(() => setDownloadStatus(null), 3000);
              refreshStatus();
            }
          } catch (error) {
            console.error("Error checking download progress:", error);
          }
        }, 3000);

        // Clear interval after 5 minutes to avoid infinite checking
        setTimeout(() => {
          clearInterval(checkDownloadProgress);
          setIsDownloading(false);
          setDownloadStatus(null);
        }, 300000);
      }
    } catch (error) {
      console.error("Error downloading model:", error);
      setDownloadStatus(`Error downloading ${apiConfigs[apiName].label} model`);
      setIsDownloading(false);
    }
  };

  const handleProcess = async () => {
    if (!inputText.trim()) {
      setCurrentError("Please enter some text to process");
      return;
    }

    // Check user activation before processing
    if (!isUserActivated) {
      setCurrentError(
        "User activation required. Please click the button again to activate the API."
      );
      return;
    }

    setIsProcessing(true);
    setCurrentError("");

    try {
      let result: string;

      switch (selectedAPI) {
        case "summarizer":
          result = await AIAPI.summarize(inputText, {
            type: options.summaryType,
            format: options.summaryFormat,
            length: options.summaryLength,
          });
          break;
        case "translator":
          result = await AIAPI.translate(
            inputText,
            options.targetLanguage,
            options.sourceLanguage
          );
          break;
        case "languageDetector":
          if (options.showConfidence) {
            const detections = await AIAPI.detectLanguageWithConfidence(
              inputText
            );
            result = detections
              .slice(0, 5) // Show top 5 results
              .map(
                (d, i) =>
                  `${i + 1}. ${d.detectedLanguage} (${(
                    d.confidence * 100
                  ).toFixed(1)}%)`
              )
              .join("\n");
          } else {
            const detection = await AIAPI.detectLanguage(inputText);
            result = detection;
          }
          break;
        case "prompt":
          result = await AIAPI.prompt(inputText, {
            temperature: options.temperature,
            topK: options.topK,
          });
          break;
        case "rewriter":
          result = await AIAPI.rewriter(inputText, {
            tone: "more-formal",
            format: "plain-text",
          });
          break;
        default:
          throw new Error(`Unknown API: ${selectedAPI}`);
      }

      const testResult: TestResult = {
        apiName: selectedAPI,
        input: inputText,
        output: result,
        timestamp: new Date(),
      };

      setResults((prev) => [testResult, ...prev]);
    } catch (err) {
      const error = err as Error;
      const errorMessage = AIUtils.formatError(error);
      setCurrentError(errorMessage);

      // Check if it's a React rendering error
      if (error.message.includes("Minified React error")) {
        setReactError(error);
      }

      const testResult: TestResult = {
        apiName: selectedAPI,
        input: inputText,
        output: "",
        error: errorMessage,
        timestamp: new Date(),
      };

      setResults((prev) => [testResult, ...prev]);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setResults([]);
    setCurrentError("");
  };

  const getStatusColor = (apiName: APIName) => {
    const apiStatus = status[apiName];
    if (apiStatus === "available") return "bg-green-100 text-green-800";
    if (apiStatus === "unavailable") return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-gray-800 mb-6">
        Chrome Built-in AI APIs Test Suite
      </h2>

      {/* React Error Handler */}
      {reactError && (
        <ErrorHandler error={reactError} onClear={() => setReactError(null)} />
      )}

      {/* Status Overview */}
      <div className="mb-8 p-6 bg-gray-50 rounded-lg">
        <h3 className="text-xl font-semibold mb-4">API Status Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          {Object.entries(status).map(([apiName, apiStatus]) => (
            <div key={apiName} className="flex items-center justify-between">
              <span className="font-medium">
                {formatAPIName(apiName as APIName)}:
              </span>
              <span
                className={`px-2 py-1 rounded text-sm ${getStatusColor(
                  apiName as APIName
                )}`}
              >
                {AIUtils.getStatusMessage(apiStatus)}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={refreshStatus}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {isLoading ? "Checking..." : "Refresh Status"}
          </button>
          <span
            className={`text-sm ${isUserActivated ? "text-green-600" : "text-red-600"
              }`}
          >
            User Activation: {isUserActivated ? "Active" : "Required"}
          </span>
        </div>
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-red-800">{error}</p>
          </div>
        )}
      </div>

      {/* API Selection */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Select API to Test</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(apiConfigs).map(([apiName, config]) => (
            <button
              key={apiName}
              onClick={() => handleAPISelection(apiName as APIName)}
              className={`p-4 rounded-lg border-2 transition-all ${selectedAPI === apiName
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
                }`}
            >
              <div className="text-left">
                <h4 className="font-semibold text-gray-800">{config.label}</h4>
                <p className="text-sm text-gray-600 mt-1">
                  {config.description}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded text-xs ${getStatusColor(
                    apiName as APIName
                  )}`}
                >
                  {AIUtils.getStatusMessage(status[apiName as APIName])}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Input Section */}
      <div className="mb-8">
        <h3 className="text-xl font-semibold mb-4">
          Test {currentConfig.label}
        </h3>
        <div className="mb-4">
          <label
            htmlFor="input-text"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Input Text
          </label>
          <textarea
            id="input-text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Enter text to ${currentConfig.label.toLowerCase()}...`}
            className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-vertical focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => setInputText(currentConfig.sampleText)}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
            >
              Load Sample Text
            </button>
            <button
              onClick={() => setInputText("")}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Options */}
        {currentConfig.hasOptions && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-semibold mb-3">Options</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Output Tokens
                </label>
                <input
                  type="number"
                  value={options.maxOutputTokens}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      maxOutputTokens: parseInt(e.target.value),
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  min="1"
                  max="1000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temperature
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={options.temperature}
                  onChange={(e) =>
                    setOptions((prev) => ({
                      ...prev,
                      temperature: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  min="0"
                  max="2"
                />
              </div>
              {selectedAPI === "summarizer" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Summary Type
                    </label>
                    <select
                      value={options.summaryType}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          summaryType: e.target.value as
                            | "key-points"
                            | "tldr"
                            | "teaser"
                            | "headline",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="key-points">Key Points</option>
                      <option value="tldr">TL;DR</option>
                      <option value="teaser">Teaser</option>
                      <option value="headline">Headline</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      value={options.summaryFormat}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          summaryFormat: e.target.value as
                            | "markdown"
                            | "plain-text",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="markdown">Markdown</option>
                      <option value="plain-text">Plain Text</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length
                    </label>
                    <select
                      value={options.summaryLength}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          summaryLength: e.target.value as
                            | "short"
                            | "medium"
                            | "long",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="long">Long</option>
                    </select>
                  </div>
                </>
              )}
              {selectedAPI === "translator" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Source Language
                    </label>
                    <input
                      type="text"
                      value={options.sourceLanguage}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          sourceLanguage: e.target.value,
                        }))
                      }
                      placeholder="en"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target Language
                    </label>
                    <input
                      type="text"
                      value={options.targetLanguage}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          targetLanguage: e.target.value,
                        }))
                      }
                      placeholder="es"
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </>
              )}
              {selectedAPI === "prompt" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Top-K
                  </label>
                  <input
                    type="number"
                    value={options.topK}
                    onChange={(e) =>
                      setOptions((prev) => ({
                        ...prev,
                        topK: parseInt(e.target.value),
                      }))
                    }
                    className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="128"
                  />
                </div>
              )}
              {selectedAPI === "languageDetector" && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={options.showConfidence}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          showConfidence: e.target.checked,
                        }))
                      }
                      className="mr-2"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Show confidence scores
                    </span>
                  </label>
                </div>
              )}
              {selectedAPI === "rewriter" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tone
                    </label>
                    <select
                      value={options.tone}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          tone: e.target.value as "more-formal" | "less-formal",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="more-formal">More Formal</option>
                      <option value="less-formal">Less Formal</option>
                      <option value="more-casual">More Casual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Format
                    </label>
                    <select
                      value={options.format}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          format: e.target.value as "plain-text" | "markdown",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="plain-text">Plain Text</option>
                      <option value="markdown">Markdown</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Length
                    </label>
                    <select
                      value={options.length}
                      onChange={(e) =>
                        setOptions((prev) => ({
                          ...prev,
                          length: e.target.value as "shorter" | "longer",
                        }))
                      }
                      className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="shorter">Shorter</option>
                      <option value="longer">Longer</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleProcess}
          disabled={
            isProcessing ||
            !inputText.trim() ||
            status[selectedAPI] !== "available"
          }
          className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isProcessing
            ? "Processing..."
            : !isUserActivated
              ? `Click to Activate & Test ${currentConfig.label}`
              : `Test ${currentConfig.label}`}
        </button>
      </div>

      {/* Error Display */}
      {currentError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800">{currentError}</p>
        </div>
      )}

      {downloadStatus && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center">
            {isDownloading && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
            )}
            <p className="text-blue-800">{downloadStatus}</p>
          </div>
        </div>
      )}

      {/* Results History */}
      {results.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Test Results</h3>
            <button
              onClick={clearResults}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Results
            </button>
          </div>
          <div className="space-y-4">
            {results.map((result, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-semibold text-gray-800">
                    {formatAPIName(result.apiName)} Result
                  </h4>
                  <span className="text-sm text-gray-500">
                    {result.timestamp.toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Input:</h5>
                    <div className="p-3 bg-gray-50 rounded border">
                      <p className="text-gray-800 text-sm">{result.input}</p>
                    </div>
                  </div>

                  <div>
                    <h5 className="font-medium text-gray-700 mb-2">Output:</h5>
                    <div
                      className={`p-3 rounded border ${result.error
                        ? "bg-red-50 border-red-200"
                        : "bg-green-50 border-green-200"
                        }`}
                    >
                      {result.error ? (
                        <p className="text-red-800 text-sm">{result.error}</p>
                      ) : (
                        <p className="text-gray-800 text-sm">{result.output}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">
          Instructions
        </h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• Make sure you're using Chrome 140+ with built-in AI support</li>
          <li>• Ensure you have at least 22GB of free storage space</li>
          <li>
            • The first time you use an API, Chrome will download the model
          </li>
          <li>
            • <strong>User activation required:</strong> Click buttons to
            activate APIs (this is normal!)
          </li>
          <li>
            • If you see "user activation required", just click the button again
          </li>
          <li>• Check chrome://on-device-internals to see model status</li>
          <li>• Each API has different capabilities and use cases</li>
        </ul>
      </div>
    </div>
  );
};

export default BuiltInAITest;
