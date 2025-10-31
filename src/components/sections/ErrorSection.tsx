interface ErrorSectionProps {
  error: string;
}

export default function ErrorSection({ error }: ErrorSectionProps) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl">
      <div className="p-6">
        <div className="p-3 rounded-md border border-brand-5/60 bg-brand-5/15">
          <p className="text-brand-1 text-sm">{error}</p>
        </div>
      </div>
    </section>
  );
}