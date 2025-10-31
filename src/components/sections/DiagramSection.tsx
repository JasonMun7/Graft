import { IconAlignLeft } from "@tabler/icons-react";
import DiagramViewer from "../general/DiagramViewer";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

interface DiagramSectionProps {
  diagramElements: ExcalidrawElement[] | null;
  summary: string | null;
  isGenerating: boolean;
  isSummarizing: boolean;
  selectedText: string;
  onSummarize: () => void;
}

export default function DiagramSection({
  diagramElements,
  summary,
  isGenerating,
  isSummarizing,
  selectedText,
  onSummarize,
}: DiagramSectionProps) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
      <div className="p-4 space-y-4">
        {diagramElements && diagramElements.length > 0 && !summary && (
          <div className="flex justify-end">
            <button
              onClick={onSummarize}
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
          <DiagramViewer elements={diagramElements} isLoading={isGenerating} />
        </div>
      </div>
    </section>
  );
}