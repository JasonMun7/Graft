interface DiagramSummaryProps {
    isSummarizing: boolean;
    summary: string | null;
}

export default function DiagramSummary({ isSummarizing, summary }: DiagramSummaryProps) {
    return (
        <div className="relative p-4 rounded-lg border border-brand-2/50 bg-gradient-to-br from-brand-1/5 via-brand-2/5 to-brand-3/5 overflow-hidden">
            {isSummarizing && (
              <>
                {/* Shimmer animation */}
                <div
                  className="absolute inset-0 -translate-x-full animate-[shimmer_3s_ease-in-out_infinite]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, rgba(84,51,255,0.15) 20%, rgba(67,121,255,0.15) 40%, rgba(28,198,255,0.15) 60%, rgba(151,251,209,0.15) 80%, transparent 100%)",
                    width: "50%",
                  }}
                ></div>
              </>
            )}
            <h3 className="text-sm font-semibold text-brand-2 mb-2 relative">
              Diagram Summary
            </h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed relative">
              {isSummarizing ? "Summarizing..." : summary}
            </div>
          </div>
    );
}
