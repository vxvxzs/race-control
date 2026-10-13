export default function Loading() {
  return (
    <div className="page-width page-content navigation-loading" role="status" aria-live="polite">
      <span className="navigation-loading-mark" aria-hidden="true" />
      <p>Wczytywanie strony…</p>
    </div>
  )
}
