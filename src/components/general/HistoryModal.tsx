import { IconHistory, IconX, IconChartLine, IconArrowForward } from "@tabler/icons-react";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";

interface HistoryEntry {
  id: string;
  elements: ExcalidrawElement[];
  sourceText: string;
  pageTitle: string;
  timestamp: number;
}

interface HistoryModalProps {
  history: HistoryEntry[];
  onClose: () => void;
  onSelectEntry: (entry: HistoryEntry) => void;
}

export default function HistoryModal({
  history,
  onClose,
  onSelectEntry,
}: HistoryModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconHistory size={24} className="text-brand-2" />
            <h2 className="text-xl font-bold text-gray-900">Diagram History</h2>
            {history.length > 0 && (
              <span className="text-sm text-gray-500">
                ({history.length} {history.length === 1 ? "diagram" : "diagrams"})
              </span>
            )}
          </div>
          <button
            onClick={onClose}
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
              <IconChartLine size={48} className="mx-auto text-gray-400 mb-4" />
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
                  onClick={() => onSelectEntry(entry)}
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
  );
}