import { useState, useEffect } from "react";
import DiagramViewer from "./components/DiagramViewer";
import type { ExtensionMessage } from "./types/messages";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { generateDiagramFromText } from "./utils/diagramGenerator";
import { convertToExcalidrawElements } from "./utils/excalidrawConverter";
import { AIAPI } from "./utils/aiAPI";
import {
  IconArrowForward,
  IconArticle,
  IconSparkles,
  IconChartLine,
  IconHistory,
  IconX,
  IconAlignLeft,
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
} from "@tabler/icons-react";
import BuiltInAITest from "./components/BuiltInAITest";

function App() {
  const [selectedText, setSelectedText] = useState<string>("");
  const [pageTitle, setPageTitle] = useState<string>("");
  const [pageUrl, setPageUrl] = useState<string>("");
  const [diagramElements, setDiagramElements] = useState<
    ExcalidrawElement[] | null
  >(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isTextCollapsed, setIsTextCollapsed] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      elements: ExcalidrawElement[];
      sourceText: string;
      pageTitle: string;
      timestamp: number;
    }>
  >([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [isSummarizing, setIsSummarizing] = useState<boolean>(false);

  // Load history on mount
  useEffect(() => {
    if (chrome?.storage?.local) {
      chrome.storage.local.get(["diagramHistory"], (result) => {
        if (result.diagramHistory) {
          setHistory(result.diagramHistory);
        }
      });
    }
  }, []);

  useEffect(() => {
    const handleMessage = (message: ExtensionMessage) => {
      if (message.type === "TEXT_SELECTED") {
        const data = message.data;
        setSelectedText(data.selectedText);
        setPageTitle(data.pageTitle);
        setPageUrl(data.pageUrl);
        setError(null);
        setSummary(null); // Clear summary when new text is selected
      }
    };

    chrome.runtime.onMessage.addListener(handleMessage);
    chrome.runtime
      .sendMessage({ type: "GET_SELECTED_TEXT" } as any)
      .then((data: any) => {
        if (data) {
          setSelectedText(data.selectedText);
          setPageTitle(data.pageTitle);
          setPageUrl(data.pageUrl);
        }
      })
      .catch(() => { });

    return () => {
      chrome.runtime.onMessage.removeListener(handleMessage);
    };
  }, []);

  const handleSummarizeDiagram = async () => {
    if (!selectedText.trim()) {
      setError("No source text available to summarize");
      return;
    }

    setIsSummarizing(true);
    setError(null);

    try {
      const summaryText = await AIAPI.summarize(selectedText, {
        type: "tldr",
        format: "plain-text",
        length: "short",
        context: pageTitle,
      });
      setSummary(summaryText);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to summarize diagram";
      setError(`Summary failed: ${message}`);
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateDiagram = async (isAuto = false) => {
    if (!selectedText.trim()) {
      if (!isAuto) setError("Please select some text first");
      return;
    }

    // Check for Chrome Built-in AI user activation
    if (!navigator.userActivation?.isActive) {
      setError("User activation required. Please click the button again to activate AI APIs.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setDiagramElements(null);
    setSummary(null);

    try {
      // generate diff versions
      const rewriteOptions = [
        { tone: "more-formal", length: "longer", format: "plain-text", outputLanguage: "en" }, // more detailed text
        { tone: "less-formal", length: "shorter", format: "plain-text", outputLanguage: "en" }, // less detailed test
      ] as const;

      const [formalResult, casualResult] = await Promise.all(
        rewriteOptions.map(async (opts) => {
          try {
            const result = await AIAPI.rewriter(selectedText, opts);
            return result;
          } catch (error) {
            console.log("Rewriter failed for options:", opts, error);
            throw new Error("Rewriter API failed — please ensure built-in AI is available.");
          }
        })
      );

      const versions = [
        { label: "Original", text: selectedText },
        { label: "More Formal", text: formalResult },
        { label: "Less Formal", text: casualResult },
      ];

      // call generate diagram for each version
      const diagramResults = await Promise.all(
        versions.map(async (version) => {
          try {
            const structure = await generateDiagramFromText(
              version.text,
              `${pageTitle || "Untitled"} (${version.label})`,
              pageUrl
            );
            return {
              label: version.label,
              structure,
              elements: convertToExcalidrawElements(structure),
            };
          } catch (error) {
            console.error(`Diagram generation failed for ${version.label}:`, error);
            throw new Error(`Failed to generate diagram for ${version.label}.`);
          }
        })
      );

      // combine outputs
      const combinedElements = diagramResults.flatMap((r) => r.elements);
      setDiagramElements(combinedElements);
      setIsTextCollapsed(true);

      // history
      const historyEntry = {
        id: Date.now().toString(),
        elements: combinedElements,
        sourceText: selectedText,
        pageTitle: pageTitle || "Untitled",
        timestamp: Date.now(),
      };

      if (chrome?.storage?.local) {
        chrome.storage.local.get(["diagramHistory"], (result) => {
          const existingHistory = result.diagramHistory || [];
          const newHistory = [historyEntry, ...existingHistory].slice(0, 20);
          chrome.storage.local.set({ diagramHistory: newHistory }, () => {
            setHistory(newHistory);
          });
        });
      } else {
        setHistory((prev) => [historyEntry, ...prev].slice(0, 20));
      }

      chrome.runtime.sendMessage({
        type: "DIAGRAM_GENERATED",
        data: { elements: combinedElements, sourceText: selectedText },
      } as ExtensionMessage);

    } catch (error) {
      console.error("Error in handleGenerateDiagram:", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate diagrams.";
      setError(isAuto ? `Click Generate to continue: ${message}` : message);

      chrome.runtime.sendMessage({
        type: "DIAGRAM_ERROR",
        data: { error: message, sourceText: selectedText },
      } as ExtensionMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen relative text-gray-900 overflow-x-hidden">
      {/* Ambient gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full blur-3xl opacity-40 bg-gradient-to-br from-brand-1 via-brand-2 to-brand-3"></div>
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full blur-3xl opacity-40 bg-gradient-to-tr from-brand-5 via-brand-3 to-brand-4 transform translate-x-1/4 translate-y-1/4"></div>
      </div>

      {/* Header */}
      <header className="px-6 py-5 backdrop-blur bg-white/70 border-b border-white/60 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/graft_logo.png"
              alt="Graft"
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 bg-clip-text text-transparent">
              Graft
            </h1>
          </div>
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-2 rounded-lg hover:scale-105 duration-500 transition-all cursor-pointer flex items-center gap-2 text-brand-2 hover:text-brand-1"
            aria-label="View diagram history"
          >
            <IconHistory size={20} aria-hidden="true" />
            {history.length > 0 && (
              <span className="text-xs font-medium">{history.length}</span>
            )}
          </button>
        </div>
      </header>

      <BuiltInAITest />
      {/* Content */}
      <main className="p-6 pb-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Selected Text */}
          {selectedText && (
            <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
              <div className="p-6 space-y-4">
                {/* Header with page title and collapse button */}
                <div className="flex items-center justify-between">
                  {pageTitle && (
                    <div className="flex items-center gap-2 text-sm text-brand-2">
                      <IconArticle size={16} aria-hidden="true" />
                      <span>{pageTitle}</span>
                    </div>
                  )}
                  <button
                    onClick={() => setIsTextCollapsed(!isTextCollapsed)}
                    className="p-2 rounded-lg hover:scale-105 duration-500 transition-all cursor-pointer flex items-center justify-center text-brand-2 hover:text-brand-1"
                    aria-label={
                      isTextCollapsed ? "Expand text" : "Collapse text"
                    }
                  >
                    {isTextCollapsed ? (
                      <IconArrowsDiagonal size={18} aria-hidden="true" />
                    ) : (
                      <IconArrowsDiagonalMinimize2
                        size={18}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                </div>

                {/* Collapsible text section */}
                <div className="flex items-start gap-3">
                  <button
                    className="h-9 w-9 shrink-0 rounded-md border-2 border-dashed border-brand-1/70 flex items-center justify-center text-brand-1 bg-white/80"
                    aria-label="Text section"
                    disabled
                  >
                    <IconArrowForward size={18} aria-hidden="true" />
                  </button>

                  <div className="flex-1 rounded-md border-2 border-dashed border-brand-2/70 bg-white/80 px-3 py-2 overflow-hidden">
                    {isTextCollapsed ? (
                      <p className="leading-relaxed text-gray-900 truncate">
                        {selectedText}
                      </p>
                    ) : (
                      <div className="max-h-40 overflow-auto">
                        <p className="leading-relaxed whitespace-pre-wrap text-gray-900">
                          {selectedText}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {!isTextCollapsed && (
                  <button
                    onClick={() => handleGenerateDiagram(false)}
                    disabled={isGenerating || !selectedText.trim()}
                    className="w-full px-6 py-3 rounded-lg shadow-md text-white bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <IconSparkles size={20} aria-hidden="true" />
                    {isGenerating ? "Generating..." : "Generate Diagram"}
                  </button>
                )}
              </div>
            </section>
          )}

          {/* Empty state - only show when no text selected */}
          {!selectedText && (
            <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
              <div className="p-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="h-16 w-16 rounded-xl border-2 border-dashed border-brand-2/70 flex items-center justify-center text-brand-2 bg-white/80 mb-4">
                    <IconChartLine size={32} aria-hidden="true" />
                  </div>
                  <p className="text-lg font-semibold text-gray-800 mb-2">
                    No diagram yet
                  </p>
                  <p className="text-sm text-gray-600 max-w-md">
                    Select text on a webpage and generate a diagram to get
                    started
                  </p>
                </div>
              </div>
            </section>
          )}

          {error && selectedText && (
            <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
              <div className="p-6">
                <div className="p-3 rounded-md border border-brand-5/60 bg-brand-5/15">
                  <p className="text-brand-1 text-sm">{error}</p>
                </div>
              </div>
            </section>
          )}

          {/* Diagram */}
          <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
            <div className="p-4 space-y-4">
              {diagramElements && diagramElements.length > 0 && !summary && (
                <div className="flex justify-end">
                  <button
                    onClick={handleSummarizeDiagram}
                    disabled={isSummarizing || !selectedText.trim()}
                    className="px-4 py-2 rounded-lg shadow-md text-white bg-gradient-to-r from-brand-2 to-brand-3 hover:opacity-95 hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold"
                  >
                    <IconAlignLeft size={18} aria-hidden="true" />
                    {isSummarizing ? "Summarizing..." : "Summarize Diagram"}
                  </button>
                </div>
              )}

              {summary && (
                <div className="p-4 rounded-lg border border-brand-2/50 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5">
                  <h3 className="text-sm font-semibold text-brand-2 mb-2">
                    Diagram Summary
                  </h3>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {summary}
                  </div>
                </div>
              )}

              <div className="h-[600px] rounded-lg bg-white">
                <DiagramViewer
                  elements={diagramElements}
                  isLoading={isGenerating}
                />
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* History Modal */}
      {isHistoryOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconHistory size={24} className="text-brand-2" />
                <h2 className="text-xl font-bold text-gray-900">
                  Diagram History
                </h2>
                {history.length > 0 && (
                  <span className="text-sm text-gray-500">
                    ({history.length}{" "}
                    {history.length === 1 ? "diagram" : "diagrams"})
                  </span>
                )}
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 hover:shadow-lg transition-all cursor-pointer"
                aria-label="Close history"
              >
                <IconX size={20} className="text-gray-600" />
              </button>
            </div>

            {/* History Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <IconChartLine
                    size={48}
                    className="mx-auto text-gray-400 mb-4"
                  />
                  <p className="text-gray-600 font-medium mb-2">
                    No diagrams in history
                  </p>
                  <p className="text-sm text-gray-500">
                    Generate a diagram to see it here
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {history.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => {
                        setDiagramElements(entry.elements);
                        setSelectedText(entry.sourceText);
                        setPageTitle(entry.pageTitle);
                        setIsTextCollapsed(true);
                        setIsHistoryOpen(false);
                      }}
                      className="text-left p-4 rounded-xl border border-gray-200 hover:border-brand-2 hover:shadow-lg transition-all cursor-pointer bg-white"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate mb-1">
                            {entry.pageTitle}
                          </p>
                          <p className="text-xs text-gray-500 mb-2 line-clamp-2">
                            {entry.sourceText.substring(0, 100)}...
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(entry.timestamp).toLocaleString()}
                          </p>
                        </div>
                        <IconArrowForward
                          size={20}
                          className="text-brand-2 shrink-0 mt-1"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
