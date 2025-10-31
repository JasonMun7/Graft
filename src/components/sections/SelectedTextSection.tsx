import {
  IconArticle,
  IconSparkles,
  IconArrowForward,
  IconArrowsDiagonal,
  IconArrowsDiagonalMinimize2,
} from "@tabler/icons-react";

interface SelectedTextSectionProps {
  selectedText: string;
  pageTitle: string;
  isTextCollapsed: boolean;
  isGenerating: boolean;
  onToggleCollapse: () => void;
  onGenerate: () => void;
}

export default function SelectedTextSection({
  selectedText,
  pageTitle,
  isTextCollapsed,
  isGenerating,
  onToggleCollapse,
  onGenerate,
}: SelectedTextSectionProps) {
  return (
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
            onClick={onToggleCollapse}
            className="p-2 rounded-lg hover:scale-105 duration-500 transition-all cursor-pointer flex items-center justify-center text-brand-2 hover:text-brand-1"
            aria-label={isTextCollapsed ? "Expand text" : "Collapse text"}
          >
            {isTextCollapsed ? (
              <IconArrowsDiagonal size={18} aria-hidden="true" />
            ) : (
              <IconArrowsDiagonalMinimize2 size={18} aria-hidden="true" />
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
            onClick={onGenerate}
            disabled={isGenerating || !selectedText.trim()}
            className="w-full px-6 py-3 rounded-lg shadow-md text-white bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <IconSparkles size={20} aria-hidden="true" />
            {isGenerating ? "Generating..." : "Generate Diagram"}
          </button>
        )}
      </div>
    </section>
  );
}