import { useState, useEffect } from "react";
import type { ExtensionMessage } from "./types/messages";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { generateDiagramFromText } from "./utils/diagramGenerator";
import { convertToExcalidrawElements } from "./utils/excalidrawConverter";
import { AIAPI } from "./utils/aiAPI";
import { IconHistory, IconCircleDashedPlus } from "@tabler/icons-react";
import PasteTextSection from "./components/sections/PasteTextSection";
import SelectedTextSection from "./components/sections/SelectedTextSection";
import ErrorSection from "./components/sections/ErrorSection";
import DiagramSection from "./components/sections/DiagramSection";
import HistoryModal from "./components/general/HistoryModal";

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
      summary?: string | null;
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
        setSummary(null);
      }
    };

    if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
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
        .catch(() => {});

      return () => {
        chrome.runtime.onMessage.removeListener(handleMessage);
      };
    } else {
      console.log(
        "Chrome extension APIs not available. Running in development mode."
      );
    }
  }, []);

  const handlePastedTextSubmit = (text: string, title: string) => {
    setSelectedText(text);
    setPageTitle(title);
    setPageUrl("");
    setError(null);
    setSummary(null);
  };

  const handleGenerateFromPage = async () => {
    try {
      setIsGenerating(true);
      setError(null);
      setDiagramElements(null);
      setSummary(null);

      // Request page text from background script
      if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage(
          { type: "GET_PAGE_TEXT" } as ExtensionMessage,
          async (response: any) => {
            if (chrome.runtime.lastError) {
              setError(
                `Failed to get page content: ${chrome.runtime.lastError.message}`
              );
              setIsGenerating(false);
              return;
            }

            if (response?.error) {
              setError(`Failed to get page content: ${response.error}`);
              setIsGenerating(false);
              return;
            }

            if (!response?.selectedText?.trim()) {
              setError("Could not extract text from the page");
              setIsGenerating(false);
              return;
            }

            const pageText = response.selectedText;
            const pageTitleText =
              response.pageTitle || document.title || "Current Page";
            const pageUrlText = response.pageUrl || window.location.href;

            // Set the text state
            setSelectedText(pageText);
            setPageTitle(pageTitleText);
            setPageUrl(pageUrlText);

            // Generate diagram directly with the text (don't rely on state)
            try {
              const diagramStructure = await generateDiagramFromText(
                pageText,
                pageTitleText,
                pageUrlText
              );
              const elements = convertToExcalidrawElements(diagramStructure);
              setDiagramElements(elements);
              setIsTextCollapsed(true);

              // Save to history
              const historyEntry = {
                id: Date.now().toString(),
                elements,
                sourceText: pageText,
                pageTitle: pageTitleText,
                timestamp: Date.now(),
                summary: null,
              };

              if (chrome?.storage?.local) {
                chrome.storage.local.get(["diagramHistory"], (result) => {
                  const existingHistory = result.diagramHistory || [];
                  const newHistory = [historyEntry, ...existingHistory].slice(
                    0,
                    20
                  );
                  chrome.storage.local.set(
                    { diagramHistory: newHistory },
                    () => {
                      setHistory(newHistory);
                    }
                  );
                });
              } else {
                setHistory((prev) => [historyEntry, ...prev].slice(0, 20));
              }

              if (
                typeof chrome !== "undefined" &&
                chrome.runtime?.id &&
                chrome.runtime?.sendMessage
              ) {
                chrome.runtime.sendMessage({
                  type: "DIAGRAM_GENERATED",
                  data: { elements, sourceText: pageText },
                } as ExtensionMessage);
              }
            } catch (err) {
              const message =
                err instanceof Error
                  ? err.message
                  : "Failed to generate diagram";
              setError(message);
              if (
                typeof chrome !== "undefined" &&
                chrome.runtime?.id &&
                chrome.runtime?.sendMessage
              ) {
                chrome.runtime.sendMessage({
                  type: "DIAGRAM_ERROR",
                  data: { error: message, sourceText: pageText },
                } as ExtensionMessage);
              }
            } finally {
              setIsGenerating(false);
            }
          }
        );
      } else {
        setError("Chrome extension APIs not available");
        setIsGenerating(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate from page";
      setError(message);
      setIsGenerating(false);
    }
  };

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

      // Update history entry with summary if it exists
      if (
        chrome?.storage?.local &&
        diagramElements &&
        diagramElements.length > 0
      ) {
        chrome.storage.local.get(["diagramHistory"], (result) => {
          const existingHistory = result.diagramHistory || [];
          const updatedHistory = existingHistory.map(
            (entry: (typeof history)[0]) => {
              // Match by sourceText and pageTitle to find the current entry
              if (
                entry.sourceText === selectedText &&
                entry.pageTitle === pageTitle
              ) {
                return { ...entry, summary: summaryText };
              }
              return entry;
            }
          );
          chrome.storage.local.set({ diagramHistory: updatedHistory }, () => {
            setHistory(updatedHistory);
          });
        });
      } else if (diagramElements && diagramElements.length > 0) {
        // Fallback: update in-memory history
        setHistory((prev) =>
          prev.map((entry) => {
            if (
              entry.sourceText === selectedText &&
              entry.pageTitle === pageTitle
            ) {
              return { ...entry, summary: summaryText };
            }
            return entry;
          })
        );
      }
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

    setIsGenerating(true);
    setError(null);
    setDiagramElements(null);
    setSummary(null);

    try {
      const diagramStructure = await generateDiagramFromText(
        selectedText,
        pageTitle,
        pageUrl
      );
      const elements = convertToExcalidrawElements(diagramStructure);
      setDiagramElements(elements);
      setIsTextCollapsed(true);

      const historyEntry = {
        id: Date.now().toString(),
        elements,
        sourceText: selectedText,
        pageTitle: pageTitle || "Untitled",
        timestamp: Date.now(),
        summary: summary || null,
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

      if (
        typeof chrome !== "undefined" &&
        chrome.runtime?.id &&
        chrome.runtime?.sendMessage
      ) {
        chrome.runtime.sendMessage({
          type: "DIAGRAM_GENERATED",
          data: { elements, sourceText: selectedText },
        } as ExtensionMessage);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate diagram";
      setError(isAuto ? `Click Generate to continue: ${message}` : message);
      if (
        typeof chrome !== "undefined" &&
        chrome.runtime?.id &&
        chrome.runtime?.sendMessage
      ) {
        chrome.runtime.sendMessage({
          type: "DIAGRAM_ERROR",
          data: { error: message, sourceText: selectedText },
        } as ExtensionMessage);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleHistoryEntrySelect = (entry: (typeof history)[0]) => {
    setDiagramElements(entry.elements);
    setSelectedText(entry.sourceText);
    setPageTitle(entry.pageTitle);
    setSummary(entry.summary || null);
    setIsTextCollapsed(true);
    setIsHistoryOpen(false);
  };

  const handleNewDiagram = () => {
    setDiagramElements(null);
    setSelectedText("");
    setPageTitle("");
    setPageUrl("");
    setSummary(null);
    setError(null);
    setIsTextCollapsed(false);
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
          <div className="flex items-center gap-2">
            <button
              onClick={handleNewDiagram}
              className="p-2 rounded-lg hover:scale-105 duration-500 transition-all cursor-pointer flex items-center gap-2 text-brand-2 hover:text-brand-1"
              aria-label="Create new diagram"
              title="Create new diagram"
            >
              <IconCircleDashedPlus size={20} aria-hidden="true" />
            </button>
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
        </div>
      </header>

      {/* Content */}
      <main className="p-6 pb-6">
        <div className="mx-auto max-w-5xl space-y-6">
          {/* Selected Text */}
          {selectedText && (
            <SelectedTextSection
              selectedText={selectedText}
              pageTitle={pageTitle}
              isTextCollapsed={isTextCollapsed}
              isGenerating={isGenerating}
              hasDiagram={!!diagramElements && diagramElements.length > 0}
              onToggleCollapse={() => setIsTextCollapsed(!isTextCollapsed)}
              onGenerate={() => handleGenerateDiagram(false)}
            />
          )}

          {/* Paste - only show when no text selected */}
          {!selectedText && (
            <PasteTextSection
              onTextSubmit={handlePastedTextSubmit}
              onGenerateFromPage={handleGenerateFromPage}
              isGenerating={isGenerating}
            />
          )}

          {/* Error */}
          {error && selectedText && <ErrorSection error={error} />}

          {/* Diagram */}
          <DiagramSection
            diagramElements={diagramElements}
            summary={summary}
            isGenerating={isGenerating}
            isSummarizing={isSummarizing}
            selectedText={selectedText}
            onSummarize={handleSummarizeDiagram}
          />
        </div>
      </main>

      {/* History Modal */}
      {isHistoryOpen && (
        <HistoryModal
          history={history}
          onClose={() => setIsHistoryOpen(false)}
          onSelectEntry={handleHistoryEntrySelect}
        />
      )}
    </div>
  );
}

export default App;
