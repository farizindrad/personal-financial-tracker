type PageShellProps = {
  title: string;
  description: string;
};

export function PageShell({ title, description }: PageShellProps) {
  return (
    <section className="space-y-6">
      <div className="max-w-4xl">
        <h1 className="page-h1">{title}</h1>
        <p className="mt-3 max-w-2xl text-sm text-mist">{description}</p>
      </div>
      <div className="card border-dashed px-6 py-16 text-center">
        <p className="text-xs font-medium tracking-wide text-mist uppercase">
          UI modul ini menyusul di checklist berikutnya.
        </p>
      </div>
    </section>
  );
}
