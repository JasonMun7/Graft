import { useState } from "react";
import { IconClipboard, IconSparkles, IconWorld } from "@tabler/icons-react";

interface PasteTextSectionProps {
  onTextSubmit: (text: string, title: string) => void;
  onGenerateFromPage: () => void;
  isGenerating: boolean;
}

export default function PasteTextSection({
  onTextSubmit,
  onGenerateFromPage,
  isGenerating,
}: PasteTextSectionProps) {
  const [pastedText, setPastedText] = useState<string>("");

  const handleSubmit = () => {
    if (pastedText.trim()) {
      onTextSubmit(pastedText.trim(), "Pasted Text");
      setPastedText("");
    }
  };

  return (
    <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
      <div className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-brand-2 mb-2">
          <IconClipboard size={16} aria-hidden="true" />
          <span className="font-semibold">Paste Text</span>
        </div>

        <div className="flex items-start gap-3">
          <button
            className="h-9 w-9 shrink-0 rounded-md border-2 border-dashed border-brand-1/70 flex items-center justify-center text-brand-1 bg-white/80"
            aria-label="Paste section"
            disabled
          >
            <IconClipboard size={18} aria-hidden="true" />
          </button>

          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            placeholder="Paste your text here to generate a diagram..."
            className="flex-1 rounded-md border-2 border-dashed border-brand-2/70 bg-white/80 px-3 py-2 resize-none focus:outline-none focus:border-brand-2 focus:ring-2 focus:ring-brand-2/20 transition-all text-gray-900 leading-relaxed"
            rows={6}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSubmit}
            disabled={!pastedText.trim()}
            className="flex-1 px-6 py-3 rounded-lg shadow-md text-white bg-gradient-to-r from-brand-1 via-brand-2 to-brand-3 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold"
          >
            <IconSparkles size={20} aria-hidden="true" />
            Next
          </button>
          <button
            onClick={onGenerateFromPage}
            disabled={isGenerating}
            className="px-6 py-3 rounded-lg shadow-md text-white bg-gradient-to-r from-brand-2 to-brand-3 hover:opacity-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 text-sm font-semibold"
            title="Generate diagram from entire page"
          >
            <IconWorld size={20} aria-hidden="true" />
            {isGenerating ? "Generating..." : "Page"}
          </button>
        </div>
      </div>
    </section>
  );
}
