import DiagramViewer from "../general/DiagramViewer";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import DiagramEditor from "../general/DiagramEditor";
import DiagramSummary from "../general/DiagramSummary";

interface DiagramSectionProps {
  diagramElements: ExcalidrawElement[] | null;
  summary: string | null;
  isGenerating: boolean;
  isSummarizing: boolean;
  selectedText: string;
  onSummarize: () => void;
  isEditing?: boolean;
  onEditDiagram?: (prompt: string) => void;
}

export default function DiagramSection({
  diagramElements,
  summary,
  isGenerating,
  isSummarizing,
  selectedText,
  onSummarize,
  isEditing = false,
  onEditDiagram,
}: DiagramSectionProps) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
      <div className="p-4 space-y-4">
        {/* Summary Section */}
        {(isSummarizing || summary) && (
          <DiagramSummary isSummarizing={isSummarizing} summary={summary} />
        )}

        {/* Diagram Viewer */}
        <div className="h-[600px] rounded-lg bg-white">
          <DiagramViewer
            elements={diagramElements}
            isLoading={isGenerating}
            summary={summary}
            isSummarizing={isSummarizing}
            selectedText={selectedText}
            onSummarize={onSummarize}
          />
        </div>

        {/* Diagram Editor - Show when diagram exists */}
        {diagramElements && diagramElements.length > 0 && onEditDiagram && (
          <DiagramEditor isEditing={isEditing} onEditDiagram={onEditDiagram} />
        )}
      </div>
    </section>
  );
}
