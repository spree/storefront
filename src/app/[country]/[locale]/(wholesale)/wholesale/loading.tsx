/**
 * Every wholesale page resolves the buyer's session before choosing between
 * the sign-in wall and the portal, so the placeholder stays neutral rather
 * than guessing which one will render.
 */
export default function WholesaleLoading(): React.JSX.Element {
  return (
    <div
      aria-hidden="true"
      className="container mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-pulse motion-reduce:animate-none"
    >
      <div className="mb-8 h-9 w-64 rounded bg-slate-200" />
      <div className="h-64 rounded-lg bg-slate-100" />
    </div>
  );
}
