import { IconChartLine } from "@tabler/icons-react";

export default function EmptyState() {
  return (
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
            Select text on a webpage or paste text below to generate a diagram
          </p>
        </div>
      </div>
    </section>
  );
}