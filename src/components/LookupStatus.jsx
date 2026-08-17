/**
 * Mobile-friendly lookup status strip.
 * Always shows current barcode + state so users can see whether
 * Open Food Facts was contacted and what happened.
 */
export default function LookupStatus({
  status = 'idle',
  barcode = '',
  notice = '',
  onRetry,
  onManual,
}) {
  if (status === 'idle' && !notice && !barcode) return null;

  const label =
    status === 'loading'
      ? 'Looking up…'
      : status === 'found'
        ? 'Found'
        : status === 'notfound'
          ? 'Not found / error'
          : status === 'idle'
            ? 'Ready'
            : String(status);

  const tone =
    status === 'loading'
      ? 'lookup-status--loading'
      : status === 'found'
        ? 'lookup-status--ok'
        : status === 'notfound'
          ? 'lookup-status--error'
          : 'lookup-status--idle';

  return (
    <div className={`lookup-status card ${tone}`} role="status" aria-live="polite">
      <div className="lookup-status__row">
        <strong>UPC lookup</strong>
        <span className="lookup-status__badge">{label}</span>
      </div>
      {barcode ? (
        <p className="lookup-status__barcode">
          Barcode: <code>{barcode}</code>
        </p>
      ) : null}
      {notice ? <p className="lookup-status__notice">{notice}</p> : null}
      {status === 'loading' ? (
        <p className="muted">Contacting Open Food Facts (barcode number only — no images).</p>
      ) : null}
      {(status === 'notfound' || status === 'found') && (onRetry || onManual) ? (
        <div className="actions lookup-status__actions">
          {onRetry ? (
            <button type="button" onClick={onRetry}>
              Retry lookup
            </button>
          ) : null}
          {onManual ? (
            <button type="button" onClick={onManual}>
              Manual entry
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
