// Squelette affiché dès le clic, pendant que la page se charge : l'écran
// répond tout de suite au lieu de rester figé.
export function PageSkeleton() {
  const block = "animate-shimmer rounded-2xl bg-surface-2";
  return (
    <div aria-busy="true" aria-live="polite">
      <div className={`${block} h-10 w-56`} />
      <div className={`${block} mt-3 h-4 w-72 max-w-full`} />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div key={item} className={`${block} h-28`} />
        ))}
      </div>
      <div className={`${block} mt-4 h-64`} />
    </div>
  );
}
