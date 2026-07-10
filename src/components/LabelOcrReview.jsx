import { useMemo, useState } from 'react';
import { buildOcrSuggestions } from '../utils/labelTextParser.js';
export default function LabelOcrReview({ image, record, suggestions: initialSuggestions, parserWarnings=[], phraseDetections=[], comparisons=[], product={}, onClose, onUpdateRecord, onApply, onSaveEvidence, onRetry, onDiscard }) {
  const [correctedText, setCorrectedText] = useState(record.correctedText || record.rawText || '');
  const [suggestions, setSuggestions] = useState(initialSuggestions || []);
  const [enhancement, setEnhancement] = useState({});
  const rebuilt = useMemo(()=>buildOcrSuggestions(record.photoType, correctedText, product), [correctedText, record.photoType, product]);
  function refreshSuggestions(){ setSuggestions(rebuilt.suggestions); onUpdateRecord({ ...record, correctedText, parserWarnings: rebuilt.parserWarnings, updatedAt: new Date().toISOString() }); }
  function setSuggestion(i, patch){ setSuggestions((prev)=>prev.map((s,idx)=>idx===i ? { ...s, ...patch } : s)); }
  return <div className="ocr-review-backdrop" role="dialog" aria-modal="true" aria-labelledby="ocr-review-title">
    <div className="ocr-review-panel">
      <h3 id="ocr-review-title">Review OCR Text Before Applying</h3>
      <p className="notice">OCR results are draft information. Nothing is applied, verified, or linked until you choose an action.</p>
      {image?.dataUrl && <img className="ocr-review-image" src={image.dataUrl} alt={`${record.photoType} preview`} />}
      <p><b>Photo type:</b> {record.photoType} · <b>Confidence:</b> {record.confidence ?? 'unknown'} · <b>Status:</b> {record.processingStatus}</p>
      <details open><summary>Raw extracted text</summary><pre className="ocr-raw">{record.rawText || '(raw text not retained)'}</pre></details>
      <label>Editable corrected text<textarea value={correctedText} onChange={(e)=>setCorrectedText(e.target.value)} /></label>
      <button type="button" onClick={refreshSuggestions}>Update suggestions from corrected text</button>
      <div className="ocr-tools" aria-label="Image preparation options">
        {[['rotateLeft','Rotate left'],['rotateRight','Rotate right'],['grayscale','Grayscale'],['contrast','Increase contrast'],['threshold','Basic thresholding']].map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={!!enhancement[key]} onChange={(e)=>setEnhancement({...enhancement,[key]:e.target.checked})}/><span>{label}</span></label>)}
        <button type="button" onClick={()=>onRetry(image, {})}>Retry using original image</button><button type="button" onClick={()=>onRetry(image, { grayscale:enhancement.grayscale, contrast:enhancement.contrast, threshold:enhancement.threshold, rotate: enhancement.rotateLeft ? -90 : enhancement.rotateRight ? 90 : 0 })}>Retry using enhanced image</button>
      </div>
      <p className="muted">For better OCR: fill the frame with the label, keep it flat, avoid glare, use brighter even lighting, hold steady, and retake separate photos for ingredients and nutrition information. Crop/select label area by retaking a closer photo; saved originals are not replaced.</p>
      {parserWarnings.length > 0 && <div className="notice"><b>Parser warnings:</b><ul>{parserWarnings.map((w)=><li key={w}>{w}</li>)}</ul></div>}
      {phraseDetections.length > 0 && <div className="notice"><b>Detected label phrases for review:</b><ul>{phraseDetections.map((p)=><li key={p.phrase}>{p.phrase}: {p.notice}</li>)}</ul></div>}
      <h4>Suggested product fields</h4>
      {suggestions.length ? suggestions.map((s,i)=><div className="ocr-suggestion" key={`${s.field}-${i}`}><label className="check"><input type="checkbox" checked={!!s.selected} onChange={(e)=>setSuggestion(i,{selected:e.target.checked})}/><span>{s.label} → {s.field}</span></label><p><b>Existing value:</b> {s.existingValue || '(blank)'}</p><label>Proposed value<textarea value={s.value} onChange={(e)=>setSuggestion(i,{value:e.target.value, action:'manual'})}/></label>{s.existingValue&&<label>Conflict action<select value={s.action || 'keep'} onChange={(e)=>setSuggestion(i,{action:e.target.value, selected:e.target.value!=='keep'})}><option value="keep">Keep existing</option><option value="replace">Replace</option><option value="append">Append</option><option value="manual">Merge manually</option></select></label>}</div>) : <p className="muted">No product-field suggestions. You can save the text as evidence or keep it without applying.</p>}
      {comparisons.length > 0 && <details><summary>Compare public lookup data with captured label</summary>{comparisons.map((c)=><p key={c.field}><b>{c.field}:</b> {c.status}</p>)}</details>}
      <div className="actions"><button className="button primary" type="button" onClick={()=>onApply({ ...record, correctedText }, suggestions)}>Apply Selected Fields</button><button type="button" onClick={()=>onSaveEvidence({ ...record, correctedText })}>Save OCR as Evidence Draft</button><button type="button" onClick={()=>{onUpdateRecord({ ...record, correctedText, userReviewed:true, updatedAt:new Date().toISOString() }); onClose();}}>Keep Text Without Applying</button><button type="button" onClick={()=>onRetry(image, {})}>Retry OCR</button><button className="danger" type="button" onClick={()=>onDiscard(record)}>Discard OCR Result</button><button type="button" onClick={onClose}>Cancel</button></div>
    </div>
  </div>;
}
