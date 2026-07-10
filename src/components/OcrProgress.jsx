export default function OcrProgress({ progress, onCancel }) {
  const pct = Number.isFinite(progress?.progress) ? Math.max(0, Math.min(100, progress.progress)) : 0;
  return <div className="ocr-progress" role="status" aria-live="polite" aria-label={`OCR progress for ${progress?.photoType || 'image'}`}>
    <b>{progress?.status || 'Loading OCR engine'}</b>
    <progress value={pct} max="100" aria-describedby={`ocr-${progress?.imageId || 'image'}`} />
    <span id={`ocr-${progress?.imageId || 'image'}`}>{pct}%</span>
    <button type="button" className="danger" onClick={onCancel}>Cancel OCR</button>
  </div>;
}
