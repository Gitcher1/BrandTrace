export default function BarcodeResult({ result, onLookup, onScanAgain, onEdit, onCancel }) {
  if (!result) return null;
  return <div className="barcode-result" aria-live="polite">
    <h4>Barcode detected</h4>
    <p className="notice">Barcode detected. Review the number before lookup.</p>
    <dl><dt>Value</dt><dd>{result.value}</dd><dt>Format</dt><dd>{result.format}</dd><dt>Source</dt><dd>{result.label}</dd></dl>
    <div className="actions"><button className="button primary" type="button" onClick={onLookup}>Look Up Product</button><button type="button" onClick={onScanAgain}>Scan Again</button><button type="button" onClick={onEdit}>Edit Number</button><button type="button" onClick={onCancel}>Cancel</button></div>
  </div>;
}
