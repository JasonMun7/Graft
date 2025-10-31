import {
  Excalidraw,
  MainMenu,
  exportToCanvas,
  exportToSvg,
} from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawElement as ExcalidrawElementType } from "@excalidraw/excalidraw/element/types";
import { useMemo, useState } from "react";
import {
  IconGraph,
  IconDownload,
  IconCopy,
  IconFileTypePng,
  IconFileTypeSvg,
  IconX,
} from "@tabler/icons-react";

interface DiagramViewerProps {
  elements: ExcalidrawElementType[] | null;
  isLoading?: boolean;
}

export default function DiagramViewer({
  elements,
  isLoading,
}: DiagramViewerProps) {
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const initialData = useMemo(() => {
    if (!elements || elements.length === 0) {
      return null;
    }
    return {
      elements: elements as readonly ExcalidrawElementType[],
      appState: {
        viewBackgroundColor: "#f0f7ff",
      },
    };
  }, [elements]);

  const appState = {
    viewBackgroundColor: "#f0f7ff",
  };

  const handleCopyToClipboard = async () => {
    if (!elements || elements.length === 0) {
      return;
    }

    try {
      const canvas = await exportToCanvas({
        elements: elements as readonly ExcalidrawElementType[],
        appState,
        files: null,
      });

      canvas.toBlob(async (blob: Blob | null) => {
        if (blob) {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({
                "image/png": blob,
              }),
            ]);
            setIsExportModalOpen(false);
            // You could show a toast notification here
          } catch (error) {
            console.error("Error copying to clipboard:", error);
          }
        }
      });
    } catch (error) {
      console.error("Error copying to clipboard:", error);
    }
  };

  const handleExportPNG = async () => {
    if (!elements || elements.length === 0) {
      return;
    }

    try {
      const canvas = await exportToCanvas({
        elements: elements as readonly ExcalidrawElementType[],
        appState,
        files: null,
      });

      canvas.toBlob((blob: Blob | null) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          link.download = "diagram.png";
          link.click();
          URL.revokeObjectURL(url);
          setIsExportModalOpen(false);
        }
      });
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  const handleExportSVG = async () => {
    if (!elements || elements.length === 0) {
      return;
    }

    try {
      const svg = await exportToSvg({
        elements: elements as readonly ExcalidrawElementType[],
        appState,
        files: null,
      });

      const svgString = new XMLSerializer().serializeToString(svg);
      const blob = new Blob([svgString], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "diagram.svg";
      link.click();
      URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (error) {
      console.error("Error exporting SVG:", error);
    }
  };

  const handleOpenExportModal = () => {
    setIsExportModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="h-full w-full relative overflow-hidden bg-white rounded-lg">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5"></div>
        {/* Smooth shimmer animation */}
        <div
          className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(84,51,255,0.15) 20%, rgba(67,121,255,0.15) 40%, rgba(28,198,255,0.15) 60%, rgba(151,251,209,0.15) 80%, transparent 100%)",
            width: "50%",
          }}
        ></div>
        {/* Content */}
        <div className="relative h-full flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 font-medium">Generating diagram...</p>
            <p className="text-xs text-gray-500 mt-1">Please wait</p>
          </div>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return (
      <div className="h-full w-full relative overflow-hidden rounded-lg border border-brand-2/50">
        {/* Faint gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5"></div>
        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-8">
          <div className="h-20 w-20 rounded-xl border-2 border-dashed border-brand-2/70 flex items-center justify-center text-brand-2 bg-white/80 mb-6">
            <IconGraph size={40} aria-hidden="true" />
          </div>
          <p className="text-xl font-semibold text-gray-800 mb-2">
            No diagram yet
          </p>
          <p className="text-base text-gray-600 max-w-md">
            Select text on a webpage and generate a diagram
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full border border-brand-2 rounded-lg shadow-lg overflow-hidden bg-white graft-excalidraw">
      <Excalidraw
        key={JSON.stringify(elements)} // Force re-render when elements change
        theme="light"
        initialData={initialData}
        UIOptions={{
          canvasActions: {
            loadScene: false,
            saveToActiveFile: false,
            export: false,
            toggleTheme: false,
            changeViewBackgroundColor: false,
            clearCanvas: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.Item onSelect={handleOpenExportModal}>
            <div className="flex items-center gap-2">
              <IconDownload size={18} aria-hidden="true" />
              <span>Export image</span>
            </div>
          </MainMenu.Item>
        </MainMenu>
      </Excalidraw>

      {/* Export Modal */}
      {isExportModalOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6"
          onClick={() => setIsExportModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconDownload size={24} className="text-brand-2" />
                <h2 className="text-xl font-bold text-gray-900">
                  Export Diagram
                </h2>
              </div>
              <button
                onClick={() => setIsExportModalOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 hover:shadow-lg transition-all cursor-pointer"
                aria-label="Close export modal"
              >
                <IconX size={20} className="text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-3">
              <button
                onClick={handleCopyToClipboard}
                className="w-full px-4 py-3 rounded-lg border border-brand-2/50 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3 text-left group"
              >
                <div className="h-10 w-10 rounded-lg border-2 border-dashed border-brand-1/70 flex items-center justify-center text-brand-1 bg-white/80 group-hover:bg-brand-1/10 transition">
                  <IconCopy size={20} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    Copy to Clipboard
                  </p>
                  <p className="text-sm text-gray-600">Copy as PNG image</p>
                </div>
              </button>

              <button
                onClick={handleExportPNG}
                className="w-full px-4 py-3 rounded-lg border border-brand-2/50 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3 text-left group"
              >
                <div className="h-10 w-10 rounded-lg border-2 border-dashed border-brand-2/70 flex items-center justify-center text-brand-2 bg-white/80 group-hover:bg-brand-2/10 transition">
                  <IconFileTypePng size={20} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Export as PNG</p>
                  <p className="text-sm text-gray-600">Download as PNG file</p>
                </div>
              </button>

              <button
                onClick={handleExportSVG}
                className="w-full px-4 py-3 rounded-lg border border-brand-2/50 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5 hover:shadow-lg transition-all cursor-pointer flex items-center gap-3 text-left group"
              >
                <div className="h-10 w-10 rounded-lg border-2 border-dashed border-brand-3/70 flex items-center justify-center text-brand-3 bg-white/80 group-hover:bg-brand-3/10 transition">
                  <IconFileTypeSvg size={20} aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">Export as SVG</p>
                  <p className="text-sm text-gray-600">Download as SVG file</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
