import { useEffect, useMemo, useRef, useState } from 'react';
import BarcodeScanner from './components/BarcodeScanner.jsx';
import BarcodeResult from './components/BarcodeResult.jsx';
import { detectBarcodeFromFile, isLookupBarcode, normalizeBarcodeValue, scannerErrorMessage } from './utils/barcodeDecoder.js';
import LabelOcrReview from './components/LabelOcrReview.jsx';
import OcrProgress from './components/OcrProgress.jsx';
import { cancelActiveOcr, recognizeLabelImage, terminateOcrWorker } from './utils/labelOcr.js';
import { buildOcrSuggestions, compareLookupToLabel, createOcrEvidenceDraft, maskSensitiveReceiptText, ocrSourceForPhotoType } from './utils/labelTextParser.js';

const STORAGE_KEYS = {
  companies: 'brandtraceCompanies',
  products: 'brandtraceProducts',
  evidence: 'brandtraceEvidence',
  scans: 'brandtraceScans',
  uploads: 'brandtraceUploads',
  settings: 'brandtraceSettings',
  lookupCache: 'brandtraceLookupCache',
  ocrResults: 'brandtraceOcrResults',
  intakeDrafts: 'brandtraceIntakeDrafts',
};

const TECHNOLOGY_CATEGORIES = [
  'Conventional food production',
  '3D printed food',
  'Factory 3D printing / tooling only',
  'Cultivated-cell ingredient',
  'Fermentation-derived ingredient',
  'Bioengineered ingredient',
  'Synthetic additive / color / flavor',
  'Packaging concern',
  'Labor / ethics concern',
  'Ownership / monopoly concern',
  'Unknown / needs research',
];

const EVIDENCE_STATUSES = ['Verified', 'Likely', 'Unclear', 'Watchlist', 'Unverified viral claim', 'Disputed', 'Not found', 'Needs review'];
const CONFIDENCE_LEVELS = ['High', 'Medium', 'Low', 'Unknown'];
const EVIDENCE_TYPES = [
  'Company statement',
  'Regulatory source',
  'News report',
  'Academic/research source',
  'Retail listing',
  'Product label',
  'User upload',
  'Receipt/photo evidence',
  'Fact check',
  'Public product database',
  'Unverified social media claim',
  'Other',
];
const PHOTO_TYPES = [
  'Product Photo',
  'Front Label',
  'Ingredient Label',
  'Nutrition Label',
  'Barcode Photo',
  'Company / Contact Label',
  'Receipt Photo',
  'Other Evidence Photo',
];
const OWNERSHIP_TYPES = ['Owned', 'Licensed', 'Distributed', 'Acquired', 'Unclear'];

const emptyProduct = {
  productName: '',
  brand: '',
  parentCompany: '',
  companyId: '',
  companyStatus: '',
  upc: '',
  category: '',
  storeLocation: '',
  countryMarket: '',
  ingredientsNotes: '',
  nutritionNotes: '',
  technologyCategory: 'Unknown / needs research',
  evidenceStatus: 'Needs review',
  confidenceLevel: 'Unknown',
  uploadedImages: [],
  linkedEvidenceIds: [],
  dataSources: ['Manual entry'],
  productImageUrl: '',
  sourceName: '',
  sourceUrl: '',
  lookupDate: '',
  userNotes: '',
  dateFound: '',
  packagingLabels: '',
  rawLookupSourceName: '',
};
const emptyCompany = { companyName: '', parentCompany: '', headquarters: '', website: '', contactPage: '', knownBrands: '', subsidiaries: '', productCategories: '', publicClaims: '', technologyCategories: ['Unknown / needs research'], evidenceStatus: 'Needs review', confidenceLevel: 'Unknown', lastReviewedDate: '', notes: '', brandOwnership: [] };
const emptyIntakeDraft = { draftStatus: 'Intake Draft', uploadedImages: [], upc: '', productName: '', brand: '', parentCompany: '', category: '', storeLocation: '', dateFound: '', lookupStatus: 'Not looked up', lookupSource: '', linkedEvidenceIds: [], notes: '', dataSources: ['Local photo intake'], sourceWarnings: [] };
const emptyEvidence = { evidenceTitle: '', evidenceType: 'User upload', sourceName: '', sourceUrl: '', date: '', relatedCompany: '', relatedProduct: '', claim: '', summary: '', quote: '', evidenceStatus: 'Needs review', confidenceLevel: 'Unknown', notes: '', lastReviewedDate: '' };

function id() { return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `bt_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
function now() { return new Date().toISOString(); }
function withMeta(record) { const stamp = now(); return { id: id(), createdAt: stamp, updatedAt: stamp, ...record }; }
function readKey(key, fallback) { try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; } }
function saveKey(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function asCsv(rows) {
  if (!rows.length) return '';
  const headers = [...new Set(rows.flatMap((r) => Object.keys(r).filter((k) => !['uploadedImages'].includes(k))))];
  return [headers.join(','), ...rows.map((row) => headers.map((h) => `"${String(Array.isArray(row[h]) ? row[h].join('; ') : row[h] ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
}
function download(filename, content, type = 'application/json') { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content], { type })); a.download = filename; a.click(); URL.revokeObjectURL(a.href); }

const demoCompanies = [withMeta({ ...emptyCompany, companyName: 'Cargill', parentCompany: 'Cargill, Incorporated', headquarters: 'United States / Minnesota', website: 'https://www.cargill.com', knownBrands: 'Foody’s partnership research/demo', publicClaims: 'Demo record: Cargill, Cocuus, and Foody’s 3D printed plant-based bacon activity in Spain should be reviewed against current sources before use.', technologyCategories: ['3D printed food'], evidenceStatus: 'Needs review', confidenceLevel: 'Low', notes: 'Research/demo record only; no U.S. store verification claimed.', brandOwnership: [{ id: id(), brand: 'Foody’s', relationship: 'Unclear', notes: 'Demo partnership/watch item; confirm ownership and distribution before drawing conclusions.', productIds: [] }] }),
withMeta({ ...emptyCompany, companyName: 'PepsiCo', parentCompany: 'PepsiCo', headquarters: 'United States / New York', knownBrands: 'Frito-Lay', publicClaims: 'Demo record separates factory tooling/R&D from edible product claims.', technologyCategories: ['Factory 3D printing / tooling only'], evidenceStatus: 'Likely', confidenceLevel: 'Medium', notes: 'Factory 3D printing tooling only; not an edible 3D printed food claim.', brandOwnership: [{ id: id(), brand: 'Frito-Lay', relationship: 'Owned', notes: 'Demo ownership mapping.', productIds: [] }] }),
withMeta({ ...emptyCompany, companyName: 'Steakholder Foods', parentCompany: 'Steakholder Foods', headquarters: 'Israel', publicClaims: 'Perfecta U.S. watchlist demo item; verify current market status before any claim.', technologyCategories: ['3D printed food'], evidenceStatus: 'Watchlist', confidenceLevel: 'Low', notes: 'Research/demo watchlist record; no U.S. store verification claimed.' }),
withMeta({ ...emptyCompany, companyName: 'Mission Barns', parentCompany: 'Mission Barns', headquarters: 'United States / California', publicClaims: 'Cultivated pork fat demo record, clearly not categorized as 3D printed food.', technologyCategories: ['Cultivated-cell ingredient'], evidenceStatus: 'Needs review', confidenceLevel: 'Low', notes: 'Demo record distinguishes cultivated ingredient from 3D printing.' })];
const demoProducts = [
withMeta({ ...emptyProduct, productName: 'Foody’s 3D printed plant-based bacon demo', brand: 'Foody’s', parentCompany: 'Cargill / Cocuus relationship to review', category: 'Plant-based bacon', countryMarket: 'Spain', technologyCategory: '3D printed food', evidenceStatus: 'Needs review', confidenceLevel: 'Low', userNotes: 'Research/demo record only.' }),
withMeta({ ...emptyProduct, productName: 'Frito-Lay factory tooling demo', brand: 'Frito-Lay', parentCompany: 'PepsiCo', category: 'Factory process example', technologyCategory: 'Factory 3D printing / tooling only', evidenceStatus: 'Likely', confidenceLevel: 'Medium', userNotes: 'Appears to be tooling/R&D only, not edible product claim.' }),
withMeta({ ...emptyProduct, productName: 'Perfecta U.S. watchlist demo', brand: 'Perfecta', parentCompany: 'Steakholder Foods', technologyCategory: '3D printed food', evidenceStatus: 'Watchlist', confidenceLevel: 'Low', userNotes: 'Watchlist only; no U.S. store verification claimed.' }),
withMeta({ ...emptyProduct, productName: 'Cultivated pork fat demo', brand: 'Mission Barns', parentCompany: 'Mission Barns', category: 'Cultivated ingredient', technologyCategory: 'Cultivated-cell ingredient', evidenceStatus: 'Needs review', confidenceLevel: 'Low', userNotes: 'Cultivated-cell ingredient; not 3D printed.' })];

function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [scanStep, setScanStep] = useState('idle');
  const [companies, setCompanies] = useState(() => readKey(STORAGE_KEYS.companies, []));
  const [products, setProducts] = useState(() => readKey(STORAGE_KEYS.products, []));
  const [evidence, setEvidence] = useState(() => readKey(STORAGE_KEYS.evidence, []));
  const [scans, setScans] = useState(() => readKey(STORAGE_KEYS.scans, []));
  const [uploads, setUploads] = useState(() => readKey(STORAGE_KEYS.uploads, []));
  const [ocrResults, setOcrResults] = useState(() => readKey(STORAGE_KEYS.ocrResults, []));
  const [intakeDrafts, setIntakeDrafts] = useState(() => readKey(STORAGE_KEYS.intakeDrafts, []));
  const [activeDraftId, setActiveDraftId] = useState(() => readKey(STORAGE_KEYS.intakeDrafts, []).find((d) => d.draftStatus !== 'Saved Product')?.id || '');
  const defaultSettings = { demoSeeded: false, enablePublicLookup: true, preferLocalRecords: true, cacheLookupResults: true, autoCreateEvidence: true, autoCreateCompanyDrafts: false, enableLocalLabelOcr: true, offerOcrAfterPhoto: true, keepRawOcrText: true, warnBeforeReplacingFields: true, enableIngredientParsing: true, enableLabelPhraseHighlighting: true };
  const [settings, setSettings] = useState(() => ({ ...defaultSettings, ...readKey(STORAGE_KEYS.settings, {}) }));
  const [productForm, setProductForm] = useState(emptyProduct);
  const [companyForm, setCompanyForm] = useState(emptyCompany);
  const [evidenceForm, setEvidenceForm] = useState(emptyEvidence);
  const [scanForm, setScanForm] = useState({ ...emptyProduct, qrCode: '', notes: '' });
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [lookupStatus, setLookupStatus] = useState('idle');
  const [lookupDraft, setLookupDraft] = useState(null);
  const [lookupNotice, setLookupNotice] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [detectedBarcode, setDetectedBarcode] = useState(null);
  const [photoDecodeNotice, setPhotoDecodeNotice] = useState('');
  const [ocrProgress, setOcrProgress] = useState(null);
  const [ocrReview, setOcrReview] = useState(null);
  const ocrButtonRef = useRef(null);
  const openScannerButtonRef = useRef(null);
  const [docForm, setDocForm] = useState({ fileName: '', evidenceType: 'User upload', sourceOrganization: '', date: '', relatedCompany: '', relatedProduct: '', summaryNotes: '', confidenceLevel: 'Unknown' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [query, setQuery] = useState(''); const [companyFilter, setCompanyFilter] = useState(''); const [techFilter, setTechFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const [result, setResult] = useState(null); const [message, setMessage] = useState(''); const [activeProduct, setActiveProduct] = useState(null);
  const barcodeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => saveKey(STORAGE_KEYS.companies, companies), [companies]); useEffect(() => saveKey(STORAGE_KEYS.products, products), [products]); useEffect(() => saveKey(STORAGE_KEYS.evidence, evidence), [evidence]); useEffect(() => saveKey(STORAGE_KEYS.scans, scans), [scans]); useEffect(() => saveKey(STORAGE_KEYS.uploads, uploads), [uploads]); useEffect(() => saveKey(STORAGE_KEYS.ocrResults, ocrResults), [ocrResults]); useEffect(() => saveKey(STORAGE_KEYS.settings, settings), [settings]); useEffect(() => { if (!saveKey(STORAGE_KEYS.intakeDrafts, intakeDrafts)) setMessage('Local storage may be full. Export your BrandTrace backup before adding more photos. Consider deleting old image drafts.'); }, [intakeDrafts]);
  useEffect(() => () => { terminateOcrWorker(); }, []);
  const stats = useMemo(() => ({ companies: companies.length, products: products.length, evidence: evidence.length, watchlist: [...products, ...companies].filter((r) => r.evidenceStatus === 'Watchlist').length, unverified: [...products, ...companies, ...evidence].filter((r) => r.evidenceStatus === 'Unverified viral claim').length, verified: [...products, ...companies, ...evidence].filter((r) => r.evidenceStatus === 'Verified').length }), [companies, products, evidence]);
  const filteredProducts = products.filter((p) => [p.productName, p.brand, p.parentCompany, p.upc].join(' ').toLowerCase().includes(query.toLowerCase()) && (!companyFilter || p.parentCompany === companyFilter) && (!techFilter || p.technologyCategory === techFilter) && (!statusFilter || p.evidenceStatus === statusFilter));
  const activeDraft = intakeDrafts.find((d) => d.id === activeDraftId) || null;
  const brandMatches = companies.flatMap((c) => (c.brandOwnership || []).map((b) => ({ ...b, companyName: c.companyName }))).filter((b) => b.brand?.toLowerCase().includes(query.toLowerCase()));

  function createIntakeDraft(seed = {}) {
    const stamp = now();
    const draft = { id: id(), createdAt: stamp, updatedAt: stamp, ...emptyIntakeDraft, ...seed, draftStatus: seed.draftStatus || 'Intake Draft', uploadedImages: seed.uploadedImages || [], dataSources: [...new Set([...(seed.dataSources || []), 'Local intake draft'])], sourceWarnings: seed.sourceWarnings || [] };
    setIntakeDrafts((prev) => [draft, ...prev]);
    setActiveDraftId(draft.id);
    return draft;
  }
  function updateActiveDraft(updater) {
    const existing = activeDraft?.draftStatus !== 'Saved Product' ? activeDraft : null;
    const base = existing || { id: id(), createdAt: now(), ...emptyIntakeDraft };
    const nextDraft = { ...base, ...(typeof updater === 'function' ? updater(base) : updater), updatedAt: now() };
    setActiveDraftId(nextDraft.id);
    setIntakeDrafts((prev) => existing ? prev.map((d) => d.id === existing.id ? nextDraft : d) : [nextDraft, ...prev]);
    return nextDraft;
  }
  function clearActiveDraft() { if (!activeDraft || !confirm('Clear current intake draft? Photos already saved in uploads remain in local upload history.')) return; setIntakeDrafts((prev) => prev.filter((d) => d.id !== activeDraft.id)); setActiveDraftId(''); setProductForm(emptyProduct); setLookupDraft(null); setMessage('Current intake draft cleared.'); }
  function exportActiveDraft() { if (activeDraft) download(`brandtrace-intake-draft-${activeDraft.id}.json`, JSON.stringify(activeDraft, null, 2)); }
  function reviewActiveDraft() { if (!activeDraft) return; setProductForm((p) => ({ ...p, ...activeDraft, userNotes: activeDraft.notes || p.userNotes, uploadedImages: activeDraft.uploadedImages || [] })); setActiveTab('scanner'); setScanStep('review-draft'); }


  function sourceLabelFor(type) { return type === 'live-camera' ? 'Live camera scan' : type === 'camera-photo' ? 'Camera barcode photo' : type === 'uploaded-photo' ? 'Uploaded barcode photo' : 'Manual entry'; }
  function recordScanHistory({ value, format = 'unknown', sourceType = 'manual', lookupStatus = 'pending-review', imageId = '', notes = '' }) {
    const normalized = normalizeBarcodeValue(value, format);
    const stamp = now();
    setScans((prev) => {
      const recentDuplicate = prev.find((s) => s.detectedValue === normalized && s.format === format && s.sourceType === sourceType && Math.abs(new Date(stamp) - new Date(s.detectedAt || s.createdAt || 0)) < 3000);
      if (recentDuplicate) return prev;
      return [withMeta({ detectedValue: normalized, format, sourceType, detectedAt: stamp, lookupStatus, productId: '', notes, imageId, associatedImageId: imageId }), ...prev];
    });
  }
  async function applyDetectedBarcode(result, sourceType) {
    const normalized = normalizeBarcodeValue(result.value || result.rawValue, result.format);
    const label = sourceLabelFor(sourceType);
    const next = { value: normalized, rawValue: result.rawValue || result.value, format: result.format || 'unknown', sourceType, label, detectedAt: now(), decoder: result.decoder || '' };
    setDetectedBarcode(next);
    setScanForm((p) => ({ ...p, upc: normalized, dataSources: [...new Set([...(p.dataSources || []), label])] }));
    updateActiveDraft((d) => ({ ...d, upc: normalized, lookupStatus: 'Barcode detected / needs review', draftStatus: d.uploadedImages?.length ? 'Ready for Review' : 'Intake Draft', dataSources: [...new Set([...(d.dataSources || []), label])] }));
    if (isLookupBarcode(normalized, result.format)) setLookupBarcode(normalized);
    setLookupNotice('Barcode detected. Looking up product information automatically…');
    setScanStep('barcode-detected');
    recordScanHistory({ value: normalized, format: next.format, sourceType, notes: label });
    if (isLookupBarcode(normalized, result.format)) {
      setScanStep('lookup-loading');
      await lookupUpc(false, normalized);
    }
  }
  function closeScanner(reason = '') { setScannerOpen(false); setTimeout(() => openScannerButtonRef.current?.focus(), 0); if (reason) setMessage(reason); }

  function saveProduct(source = 'Manual entry', form = productForm) { const mergedDraft = activeDraft && !editingProductId ? { ...activeDraft, userNotes: activeDraft.notes, ...form, uploadedImages: form.uploadedImages?.length ? form.uploadedImages : activeDraft.uploadedImages } : form; const cleanForm = { ...mergedDraft }; delete cleanForm.nextPhotoType; delete cleanForm.draftStatus; delete cleanForm.lookupStatus; delete cleanForm.lookupSource; delete cleanForm.sourceWarnings; const record = editingProductId ? { ...products.find((p) => p.id === editingProductId), ...cleanForm, updatedAt: now() } : withMeta(cleanForm); setProducts((prev) => editingProductId ? prev.map((p) => p.id === editingProductId ? record : p) : [record, ...prev]); if (activeDraft && !editingProductId) setIntakeDrafts((prev)=>prev.map((d)=>d.id===activeDraft.id ? { ...d, draftStatus: 'Saved Product', productId: record.id, updatedAt: now() } : d)); setResult(record); setEditingProductId(null); setActiveDraftId(''); setProductForm(emptyProduct); setScans((prev)=>prev.map((s)=>String(s.detectedValue||s.upc||'').replace(/\D/g,'') === String(record.upc||'').replace(/\D/g,'') ? { ...s, productId: record.id, lookupStatus: 'saved-product', updatedAt: now() } : s)); setActiveProduct(record); setActiveTab('products'); setScanStep('saved'); setMessage('Product saved locally.'); return record; }
  function saveScan() { const product = saveProduct('Scan record', { ...emptyProduct, ...scanForm, userNotes: scanForm.notes }); setScans((prev) => [withMeta({ ...scanForm, productId: product.id }), ...prev]); setScanForm({ ...emptyProduct, qrCode: '', notes: '' }); }
  function saveCompany() { setCompanies((prev) => [withMeta(companyForm), ...prev]); setCompanyForm(emptyCompany); setMessage('Company saved locally.'); }
  function saveEvidence() { setEvidence((prev) => [withMeta(evidenceForm), ...prev]); setEvidenceForm(emptyEvidence); setMessage('Evidence item saved locally.'); }
  function saveDocEvidence() { const ev = withMeta({ ...emptyEvidence, evidenceTitle: docForm.fileName || 'Local evidence document', evidenceType: docForm.evidenceType, sourceName: docForm.sourceOrganization, date: docForm.date, relatedCompany: docForm.relatedCompany, relatedProduct: docForm.relatedProduct, summary: docForm.summaryNotes, confidenceLevel: docForm.confidenceLevel }); setEvidence((p) => [ev, ...p]); setUploads((p) => [withMeta({ ...docForm, evidenceId: ev.id }), ...p]); setDocForm({ fileName: '', evidenceType: 'User upload', sourceOrganization: '', date: '', relatedCompany: '', relatedProduct: '', summaryNotes: '', confidenceLevel: 'Unknown' }); setMessage('Document metadata saved locally.'); }
  function readFileAsDataUrl(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = reject; reader.readAsDataURL(file); }); }
  async function imageToLocalDataUrl(file) {
    const original = await readFileAsDataUrl(file);
    if (!file.type?.startsWith('image/')) return original;
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1200;
        const scale = Math.min(1, maxWidth / img.width);
        if (scale === 1 && file.size < 900000) return resolve(original);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.onerror = () => resolve(original);
      img.src = original;
    });
  }
  async function handleImages(files, photoType = productForm.nextPhotoType || 'Other Evidence Photo', sourceType = 'uploaded') {
    const selected = Array.from(files || []);
    if (!selected.length) { setMessage(sourceType === 'camera' ? 'Camera capture was canceled.' : 'No photo was selected.'); return; }
    try {
      setPhotoDecodeNotice('');
      const images = await Promise.all(selected.map(async (file) => {
        const image = { id: id(), name: file.name || photoType, type: photoType, sourceType, createdAt: now(), dataUrl: await imageToLocalDataUrl(file) };
        if (photoType === 'Barcode Photo' && file.type?.startsWith('image/')) {
          try {
            const decoded = await detectBarcodeFromFile(file);
            if (decoded?.rawValue) {
              const barcodeSource = sourceType === 'camera' ? 'camera-photo' : 'uploaded-photo';
              await applyDetectedBarcode({ value: decoded.rawValue, rawValue: decoded.rawValue, format: decoded.format, decoder: decoded.decoder }, barcodeSource);
              recordScanHistory({ value: decoded.rawValue, format: decoded.format, sourceType: barcodeSource, imageId: image.id, notes: `Decoded from ${sourceType === 'camera' ? 'camera' : 'uploaded'} barcode photo` });
              setPhotoDecodeNotice('Barcode detected from photo. Review the number before lookup.');
            } else setPhotoDecodeNotice('No readable barcode was found in this photo. Try moving closer, improving lighting, keeping the barcode flat, or enter the UPC manually.');
          } catch (e) { setPhotoDecodeNotice(scannerErrorMessage(e)); }
        }
        return image;
      }));
      const nextForm = { ...productForm, uploadedImages: [...(productForm.uploadedImages || []), ...images] };
      const draft = updateActiveDraft((d) => ({ ...d, draftStatus: 'Ready for Review', uploadedImages: [...(d.uploadedImages || []), ...images], upc: nextForm.upc || scanForm.upc || d.upc, productName: nextForm.productName || d.productName, brand: nextForm.brand || d.brand, linkedEvidenceIds: d.linkedEvidenceIds || [], dataSources: [...new Set([...(d.dataSources || []), sourceType === 'camera' ? 'Local camera photo' : 'Local uploaded photo'])] }));
      const serialized = JSON.stringify(nextForm.uploadedImages || []);
      if (serialized.length > 4200000) setMessage('This image may be too large for local storage. Try a smaller image or export your data first.');
      setProductForm(nextForm);
      setUploads((prev) => [...images.map((image) => withMeta({ uploadType: 'product-photo', photoType: image.type, sourceType: image.sourceType, fileName: image.name, productId: editingProductId || '', draftId: editingProductId ? '' : draft?.id || activeDraftId, productName: productForm.productName || '', upc: productForm.upc || scanForm.upc || '', imageId: image.id })), ...prev]);
      if (editingProductId) setProducts((prev) => prev.map((p) => p.id === editingProductId ? { ...p, uploadedImages: nextForm.uploadedImages, updatedAt: now() } : p));
      setMessage(`${images.length} ${sourceType === 'camera' ? 'camera' : 'uploaded'} photo${images.length === 1 ? '' : 's'} added locally and saved to the current intake draft.`);
    } catch {
      setMessage(sourceType === 'camera' ? 'Camera capture failed or was canceled. No data was lost. You can retry, upload a photo, or enter the product manually.' : 'Local storage may be full. Export your BrandTrace backup before adding more photos. Consider deleting old image drafts.');
    }
  }

  async function runOcrForImage(image, enhancement = {}) {
    if (!settings.enableLocalLabelOcr) { setMessage('Local label OCR is disabled in settings. Manual entry remains available.'); return; }
    ocrButtonRef.current = document.activeElement;
    try {
      setOcrProgress({ imageId: image.id, photoType: image.type, status: 'Loading OCR engine', progress: 0 });
      const recognized = await recognizeLabelImage(image.dataUrl, { enhancement, onProgress: (m) => setOcrProgress({ imageId: image.id, photoType: image.type, status: m.status || 'Recognizing text', progress: Math.round((m.progress || 0) * 100) }) });
      const rawText = image.type === 'Receipt Photo' ? maskSensitiveReceiptText(recognized.rawText) : recognized.rawText;
      const parsed = buildOcrSuggestions(image.type, rawText, productForm);
      const stamp = now();
      const record = { id: id(), imageId: image.id, photoType: image.type, rawText: settings.keepRawOcrText ? rawText : '', correctedText: parsed.sanitizedText || rawText, confidence: recognized.confidence, language: recognized.language, processingStatus: recognized.confidence < 45 ? 'Low-confidence result' : 'recognized', createdAt: stamp, updatedAt: stamp, appliedFields: [], sourceType: ocrSourceForPhotoType(image.type), parserWarnings: parsed.parserWarnings, userReviewed: false, imageEnhancementUsed: recognized.imageEnhancementUsed };
      setOcrResults((prev) => [record, ...prev.filter((r) => !(r.imageId === image.id && r.processingStatus === 'draft-render'))]);
      setOcrReview({ image, record, suggestions: parsed.suggestions, parserWarnings: parsed.parserWarnings, phraseDetections: parsed.phraseDetections, comparisons: compareLookupToLabel(productForm, parsed.suggestions) });
      setMessage('OCR complete. Review the extracted text before applying anything.');
    } catch (error) {
      const canceled = error?.name === 'AbortError';
      const stamp = now();
      setOcrResults((prev) => [{ id: id(), imageId: image.id, photoType: image.type, rawText: '', correctedText: '', confidence: null, language: 'eng', processingStatus: canceled ? 'OCR canceled' : (error?.message || 'Image processing failed'), createdAt: stamp, updatedAt: stamp, appliedFields: [], sourceType: ocrSourceForPhotoType(image.type), parserWarnings: [], userReviewed: false, imageEnhancementUsed: Object.keys(enhancement).join(', ') || 'original' }, ...prev]);
      setMessage(canceled ? 'OCR canceled. The photo and manual entry remain available.' : `${error?.message || 'OCR failed'}. The photo and manual entry remain available.`);
    } finally { setOcrProgress(null); }
  }
  function closeOcrReview() { setOcrReview(null); setTimeout(() => ocrButtonRef.current?.focus?.(), 0); }
  function updateOcrResult(record) { setOcrResults((prev)=>prev.map((r)=>r.id===record.id ? record : r)); }
  function applyOcrFields(record, suggestions) {
    const selected = suggestions.filter((s)=>s.selected && s.action !== 'keep');
    const next = { ...productForm };
    selected.forEach((s)=>{ const current = next[s.field] || ''; next[s.field] = s.action === 'append' && current ? `${current}\n${s.value}` : s.action === 'manual' ? s.value : s.value; });
    next.dataSources = [...new Set([...(next.dataSources || []), record.sourceType, 'User corrected'])];
    setProductForm(next); updateActiveDraft((d)=>({ ...d, ...next, draftStatus: 'Ready for Review', dataSources: [...new Set([...(d.dataSources || []), record.sourceType, 'User corrected OCR'])] })); if (editingProductId) setProducts((prev)=>prev.map((p)=>p.id===editingProductId ? { ...p, ...next, updatedAt: now() } : p));
    updateOcrResult({ ...record, appliedFields: selected.map((s)=>s.field), userReviewed: true, updatedAt: now(), correctedText: record.correctedText });
    setMessage('Selected OCR fields were applied after review. Existing values were only changed where you chose replace, append, or manual merge.'); closeOcrReview();
  }
  function saveOcrEvidence(record) {
    const ev = withMeta(createOcrEvidenceDraft({ ocrResult: { ...record, userReviewed: true }, photoType: record.photoType, product: productForm }));
    setEvidence((prev)=>[ev, ...prev]); updateOcrResult({ ...record, userReviewed: true, updatedAt: now() }); setMessage('OCR saved as an evidence draft with Needs review status. Link it to the product only after review.'); closeOcrReview();
  }

  function removeImage(imageId) {
    const nextImages = (productForm.uploadedImages || []).filter((img) => img.id !== imageId);
    setProductForm((p) => ({ ...p, uploadedImages: nextImages }));
    updateActiveDraft((d)=>({ ...d, uploadedImages: (d.uploadedImages || []).filter((img)=>img.id !== imageId) }));
    if (editingProductId) setProducts((prev) => prev.map((p) => p.id === editingProductId ? { ...p, uploadedImages: nextImages, updatedAt: now() } : p));
    setMessage('Photo removed from the local record.');
  }

  function normalizeMatch(value) { return String(value || '').toLowerCase().replace(/[\p{P}$+<=>^`|~]/gu, '').replace(/\s+/g, ' ').trim(); }
  function companyForBrand(brand) {
    const target = normalizeMatch(brand);
    if (!target) return null;
    return companies.find((c) => normalizeMatch(c.companyName) === target || String(c.knownBrands || '').split(/[,;\n]/).some((b) => normalizeMatch(b) === target) || (c.brandOwnership || []).some((b) => normalizeMatch(b.brand) === target));
  }
  function normalizeOffProduct(product, barcode) {
    const brands = String(product.brands || product.brands_tags?.join(', ') || '').split(',').map((b) => b.trim()).filter(Boolean);
    const categories = product.categories || product.categories_tags?.join(', ') || '';
    const labels = [product.packaging, product.labels].filter(Boolean).join(' | ');
    const countries = product.countries || product.countries_tags?.join(', ') || '';
    const name = product.product_name || product.generic_name || '';
    const sourceUrl = product.url || `https://world.openfoodfacts.org/product/${barcode}`;
    const nutriments = product.nutriments || {};
    const nutritionNotes = [product.nutrition_grade_fr && `Nutrition grade: ${product.nutrition_grade_fr}`, nutriments.energy_kcal_100g && `Energy: ${nutriments.energy_kcal_100g} kcal/100g`, nutriments.fat_100g && `Fat: ${nutriments.fat_100g}g/100g`, nutriments.sugars_100g && `Sugars: ${nutriments.sugars_100g}g/100g`, nutriments.salt_100g && `Salt: ${nutriments.salt_100g}g/100g`].filter(Boolean).join('; ');
    return { productName: name, brand: brands[0] || '', upc: barcode, category: categories, ingredientsNotes: product.ingredients_text || '', nutritionNotes, productImageUrl: product.image_url || product.image_front_url || '', packagingLabels: labels, countryMarket: countries, sourceName: 'Open Food Facts', sourceUrl, lookupDate: new Date().toISOString().slice(0,10), rawLookupSourceName: 'Open Food Facts API v2' };
  }
  function buildDraft(normalized) {
    const match = companyForBrand(normalized.brand);
    return { ...emptyProduct, ...normalized, parentCompany: match ? (match.parentCompany || match.companyName) : 'Unknown', companyId: match?.id || '', companyStatus: match ? 'Matched to company database' : 'Needs Research', dataSources: ['Open Food Facts lookup', ...(match ? ['Company database match'] : [])], evidenceStatus: 'Needs review', confidenceLevel: 'Medium', userNotes: `${match ? 'Matched to company database. Company match is based on BrandTrace local database.' : 'Parent company not verified yet.'}\nPublic product database result. Verify against label.${normalized.productName ? '' : '\nMissing or incomplete lookup data.'}` };
  }
  function addEvidenceForLookup(product) { return { ...emptyEvidence, evidenceTitle: `UPC lookup: ${product.productName || product.upc}`, evidenceType: 'Public product database', sourceName: 'Open Food Facts', sourceUrl: product.sourceUrl, date: new Date().toISOString().slice(0,10), relatedProduct: product.productName || product.upc, relatedCompany: product.companyId ? product.parentCompany : '', claim: 'Product identity and label data', summary: `Open Food Facts lookup returned ${product.productName || 'an unnamed product'} for barcode ${product.upc}.`, evidenceStatus: 'Needs review', confidenceLevel: product.companyId ? 'Medium' : 'Low', notes: 'Public product data may be user-contributed and should be verified against the physical label.' }; }
  function cacheLookup(entry) { if (!settings.cacheLookupResults) return; const cache = readKey(STORAGE_KEYS.lookupCache, {}); saveKey(STORAGE_KEYS.lookupCache, { ...cache, [entry.barcode]: entry }); }
  async function lookupUpc(refresh = false, barcodeOverride = '') {
    const barcode = String(barcodeOverride || lookupBarcode || scanForm.upc || '').replace(/\D/g, '');
    if (!barcode) { setLookupNotice('Enter or scan a UPC/barcode first.'); return; }
    setLookupBarcode(barcode);
    if (!settings.enablePublicLookup) { setLookupNotice('Public UPC lookup is disabled in settings. Manual entry is still available.'); return; }
    const existing = settings.preferLocalRecords && products.find((p) => String(p.upc || '').replace(/\D/g, '') === barcode);
    if (existing && !refresh) { setLookupDraft(existing); setLookupStatus('found'); setScanStep('lookup-found'); setLookupNotice('Using saved lookup data. You can refresh this lookup.'); return; }
    const cache = readKey(STORAGE_KEYS.lookupCache, {});
    if (cache[barcode] && !refresh) { setLookupStatus(cache[barcode].found ? 'found' : 'notfound'); setScanStep(cache[barcode].found ? 'lookup-found' : 'lookup-not-found'); setLookupDraft(cache[barcode].found ? buildDraft(cache[barcode].normalizedProductData) : null); setLookupNotice('Using saved lookup data. You can refresh this lookup.'); return; }
    setLookupStatus('loading'); setScanStep('lookup-loading'); setLookupNotice('Looking up product information…');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
      const data = await res.json();
      if (!res.ok || data.status !== 1 || !data.product) { updateActiveDraft((d)=>({ ...d, upc: barcode, lookupStatus: 'Not found', lookupSource: 'Open Food Facts' })); cacheLookup({ barcode, source: 'Open Food Facts', found: false, fetchedAt: now(), normalizedProductData: null, rawSummary: data.status_verbose || 'Not found' }); setLookupStatus('notfound'); setScanStep('lookup-not-found'); setLookupDraft(null); setLookupNotice('Lookup failed or no public record was found. The scan/photo is still saved locally. Continue with manual entry or upload label photos.'); return; }
      const normalized = normalizeOffProduct(data.product, barcode); cacheLookup({ barcode, source: 'Open Food Facts', found: true, fetchedAt: now(), normalizedProductData: normalized, rawSummary: `${normalized.productName || 'Unnamed'} / ${normalized.brand || 'Unknown brand'}` });
      const reviewedDraft = buildDraft(normalized);
      const lookupEvidence = settings.autoCreateEvidence ? withMeta(addEvidenceForLookup(reviewedDraft)) : null;
      if (lookupEvidence) setEvidence((prev)=>[lookupEvidence, ...prev]);
      setLookupDraft(reviewedDraft); updateActiveDraft((d)=>({ ...d, upc: barcode, lookupStatus: 'Found / pending user review', lookupSource: 'Open Food Facts', linkedEvidenceIds: lookupEvidence ? [...new Set([...(d.linkedEvidenceIds || []), lookupEvidence.id])] : (d.linkedEvidenceIds || []), sourceWarnings: [...new Set([...(d.sourceWarnings || []), 'Open Food Facts is public/crowdsourced. Verify against the physical label.'])] })); setLookupStatus('found'); setScanStep('lookup-found'); setLookupNotice('Open Food Facts is public/crowdsourced. Verify against the physical label. Select fields to apply; BrandTrace will not overwrite user-entered fields without review.');
    } catch { setLookupStatus('notfound'); setScanStep('lookup-not-found'); setLookupNotice('Lookup failed or no public record was found. The scan/photo is still saved locally. Continue with manual entry or upload label photos.'); }
  }
  function applyLookupToDraft() { if (!lookupDraft) return; const fields = ['productName','brand','category','ingredientsNotes','nutritionNotes','productImageUrl','packagingLabels','countryMarket','sourceUrl','upc','parentCompany']; const conflicts = fields.filter((f)=>activeDraft?.[f] && lookupDraft[f] && activeDraft[f] !== lookupDraft[f]); if (conflicts.length && !confirm(`Open Food Facts data differs from your draft for: ${conflicts.join(', ')}. Apply selected reviewed lookup fields?`)) return; updateActiveDraft((d)=>({ ...d, ...Object.fromEntries(fields.map((f)=>[f, lookupDraft[f] || d[f] || ''])), draftStatus: 'Ready for Review', lookupStatus: 'Applied after review', lookupSource: 'Open Food Facts', dataSources: [...new Set([...(d.dataSources || []), 'Open Food Facts lookup reviewed'])], sourceWarnings: [...new Set([...(d.sourceWarnings || []), 'Open Food Facts is public/crowdsourced. Verify against the physical label.'])] })); setProductForm((p)=>({ ...p, ...Object.fromEntries(fields.map((f)=>[f, lookupDraft[f] || p[f] || ''])), dataSources: [...new Set([...(p.dataSources||[]), 'Open Food Facts lookup reviewed'])] })); setMessage('Reviewed Open Food Facts fields were applied to the current intake draft.'); }
  function saveLookupDraft() { applyLookupToDraft(); const product = saveProduct('UPC lookup draft', { ...lookupDraft, dataSources: [...new Set([...(lookupDraft.dataSources || []), 'Open Food Facts lookup', 'User corrected'])] }); if (settings.autoCreateEvidence) { const ev = withMeta({ ...addEvidenceForLookup(product), relatedProduct: product.productName || product.upc }); setEvidence((prev) => [ev, ...prev]); if (settings.autoCreateCompanyDrafts && !product.companyId) createCompanyDraftFromLookup(product); setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, linkedEvidenceIds: [...(p.linkedEvidenceIds || []), ev.id], dataSources: [...new Set([...(p.dataSources || []), 'Evidence attached'])] } : p)); } setLookupDraft(null); setLookupStatus('idle'); return product; }
  function saveUnknownProduct() { setLookupDraft(buildDraft({ upc: lookupBarcode || scanForm.upc, productName: '', brand: '', category: '', sourceName: 'Manual entry', sourceUrl: '', lookupDate: new Date().toISOString().slice(0,10), rawLookupSourceName: 'Not found' })); setLookupStatus('found'); }
  function createCompanyDraftRecord(product = lookupDraft) { const brand = product?.brand || product?.parentCompany || 'Unknown company'; return withMeta({ ...emptyCompany, companyName: brand, parentCompany: 'Unknown', knownBrands: product?.brand || '', productCategories: product?.category || '', evidenceStatus: 'Needs review', confidenceLevel: 'Low', notes: 'Created from UPC lookup. Parent company needs verification.', publicClaims: `Source: Open Food Facts product lookup${product?.sourceUrl ? ` (${product.sourceUrl})` : ''}`, lastReviewedDate: new Date().toISOString().slice(0,10), brandOwnership: product?.brand ? [{ id: id(), brand: product.brand, relationship: 'Unclear', notes: 'Created from UPC lookup; verify ownership.', productIds: [] }] : [] }); }
  function createCompanyDraftFromLookup(product = lookupDraft) { const company = createCompanyDraftRecord(product); setCompanies((prev) => [company, ...prev]); setLookupDraft(product ? { ...product, companyId: company.id, parentCompany: company.parentCompany || company.companyName, companyStatus: 'Needs Research', dataSources: [...new Set([...(product.dataSources || []), 'Company database match'])] } : product); setMessage('Company draft created locally from UPC lookup.'); return company; }

  function seedDemo() { if (settings.demoSeeded) return; setCompanies((p) => [...demoCompanies, ...p]); setProducts((p) => [...demoProducts, ...p]); setSettings({ ...settings, demoSeeded: true }); }
  function clearDemo() { if (!confirm('Clear demo/sample BrandTrace records?')) return; const isDemo = (r) => JSON.stringify(r).toLowerCase().includes('demo'); setCompanies((p) => p.filter((r) => !isDemo(r))); setProducts((p) => p.filter((r) => !isDemo(r))); setSettings({ ...settings, demoSeeded: false }); }
  function resetAll() { if (!confirm('Reset all local BrandTrace data on this device? This cannot be undone.')) return; Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k)); setCompanies([]); setProducts([]); setEvidence([]); setScans([]); setUploads([]); setIntakeDrafts([]); setActiveDraftId(''); setSettings({ ...defaultSettings, demoSeeded: false }); }
  function importBackup(file, merge) { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!merge && !confirm('Overwrite local BrandTrace data with this backup?')) return; setCompanies(merge ? [...(data.companies || []), ...companies] : data.companies || []); setProducts(merge ? [...(data.products || []), ...products] : data.products || []); setEvidence(merge ? [...(data.evidence || []), ...evidence] : data.evidence || []); setScans(merge ? [...(data.scans || []), ...scans] : data.scans || []); setUploads(merge ? [...(data.uploads || []), ...uploads] : data.uploads || []); setOcrResults(merge ? [...(data.ocrResults || []), ...ocrResults] : data.ocrResults || []); setIntakeDrafts(merge ? [...(data.intakeDrafts || []), ...intakeDrafts] : data.intakeDrafts || []); setSettings({ ...settings, ...(data.settings || {}) }); setMessage('Backup imported.'); } catch { setMessage('Import failed: invalid BrandTrace JSON file.'); } }; reader.readAsText(file); }
  const input = (label, value, onChange, props = {}) => <label>{label}<input value={value || ''} onChange={(e) => onChange(e.target.value)} {...props} /></label>;
  const select = (label, value, onChange, options) => <label>{label}<select value={value || ''} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
  const statusText = (r) => r.evidenceStatus === 'Verified' ? 'Verified evidence exists. Review sources before drawing conclusions.' : r.evidenceStatus === 'Watchlist' ? 'This item is on your watchlist.' : r.evidenceStatus?.includes('Unverified') || r.evidenceStatus === 'Needs review' ? 'This claim needs more evidence.' : r.technologyCategory === 'Factory 3D printing / tooling only' ? 'This appears to be factory tooling/R&D only, not an edible product claim.' : 'No verified concern found yet.';

  const tabs = ['scanner', 'products', 'companies', 'evidence', 'data', 'settings'];
  const tabLabel = (tab) => tab[0].toUpperCase() + tab.slice(1);
  const recentScans = scans.slice(0, 5);
  const switchTab = (tab) => { setActiveTab(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <><header className="site-header"><nav className="nav container"><button className="brand brand-button" type="button" onClick={()=>switchTab('scanner')}><span className="brand-mark">BT</span><span>BrandTrace</span></button><div className="nav-links" role="tablist" aria-label="BrandTrace app tabs">{tabs.map((tab)=><button key={tab} type="button" role="tab" aria-selected={activeTab===tab} className={activeTab===tab?'active-tab':''} onClick={()=>switchTab(tab)}>{tabLabel(tab)}</button>)}</div></nav></header><main>
    {message && <div className="toast container">{message}</div>}
    {activeTab === 'scanner' && <section className="section scanner-home"><div className="container"><Section title="Scan Product" eyebrow="Mobile scanner workflow" text="Scan Product → Detect barcode or capture label → Lookup product → Review result → Save to local database. Everything stays local except optional Open Food Facts UPC lookup." />
      <div className="scanner-cta card"><button ref={openScannerButtonRef} className="button primary big-action" type="button" onClick={()=>{setScanStep('camera-open'); setScannerOpen(true);}}>Scan Product Barcode / Scan live barcode</button><PhotoButton label="Take Label Photo" photoType="Front Label" sourceType="camera" handleImages={handleImages}/><button type="button" onClick={()=>setScanStep('review-draft')}>Manual Entry</button><p className="muted">Current step: {scanStep.replaceAll('-', ' ')}</p></div>
      {scannerOpen&&<BarcodeScanner onDetected={async (result)=>{setScannerOpen(false); await applyDetectedBarcode(result, 'live-camera');}} onClosed={closeScanner}/>}<BarcodeResult result={detectedBarcode} onLookup={()=>lookupUpc(false)} onScanAgain={()=>{setScanStep('camera-open');setScannerOpen(true);}} onEdit={()=>setScanStep('review-draft')} onCancel={()=>setDetectedBarcode(null)}/>
      {lookupNotice&&<p className={lookupStatus==='notfound'?'notice':'pill'}>{lookupNotice}</p>}{lookupStatus==='loading'&&<div className="card"><h3>Looking up barcode…</h3><p>BrandTrace is checking Open Food Facts using barcode {lookupBarcode}.</p></div>}{lookupStatus==='notfound'&&<div className="card"><h3>Lookup not found</h3><p className="notice">No public Open Food Facts record was found. The UPC and photos remain saved locally in your intake draft.</p><div className="actions"><button type="button" onClick={saveUnknownProduct}>Save as unknown product</button><PhotoButton label="Take label photo" photoType="Front Label" sourceType="camera" handleImages={handleImages}/><button type="button" onClick={()=>setScanStep('review-draft')}>Manual entry</button><button onClick={()=>lookupUpc(true)}>Retry lookup</button></div></div>}{lookupDraft&&<LookupReview draft={lookupDraft} setDraft={setLookupDraft} saveDraft={saveLookupDraft} applyToDraft={applyLookupToDraft} createCompanyDraft={createCompanyDraftFromLookup} input={input}/>}
      <CurrentIntakeDraftPanel draft={activeDraft} onReview={reviewActiveDraft} onSave={()=>saveProduct('Intake draft', { ...productForm, ...(activeDraft || {}) })} onClear={clearActiveDraft} onExport={exportActiveDraft}/>
      <div className="card"><h3>Take or Upload Product Photos</h3><p className="notice">Barcode photos attempt barcode decode and lookup. Label photos save to the active draft and offer OCR without implying lookup happened.</p>{photoDecodeNotice&&<p className={photoDecodeNotice.startsWith('No readable')?'notice':'pill'}>{photoDecodeNotice}</p>}<PhotoCaptureGrid handleImages={handleImages}/>{ocrProgress&&<OcrProgress progress={ocrProgress} onCancel={()=>{cancelActiveOcr(); setMessage('OCR cancellation requested.');}}/>}<PhotoPreviewGallery images={productForm.uploadedImages||activeDraft?.uploadedImages||[]} onRemove={removeImage} onOcr={runOcrForImage} ocrResults={ocrResults} offerOcr={settings.offerOcrAfterPhoto}/><OcrHistory ocrResults={ocrResults} images={productForm.uploadedImages||[]} onOpen={(record)=>{ const image=(productForm.uploadedImages||[]).find((img)=>img.id===record.imageId); const parsed=buildOcrSuggestions(record.photoType, record.correctedText || record.rawText, productForm); setOcrReview({ image, record, suggestions: parsed.suggestions, parserWarnings: parsed.parserWarnings, phraseDetections: parsed.phraseDetections, comparisons: compareLookupToLabel(productForm, parsed.suggestions) }); }} onRetry={(record)=>{ const image=(productForm.uploadedImages||[]).find((img)=>img.id===record.imageId); if(image) runOcrForImage(image); }} onDelete={(id)=>setOcrResults((prev)=>prev.filter((r)=>r.id!==id))}/>{ocrReview&&<LabelOcrReview {...ocrReview} product={productForm} onClose={closeOcrReview} onUpdateRecord={updateOcrResult} onApply={applyOcrFields} onSaveEvidence={saveOcrEvidence} onRetry={(image, enhancement)=>runOcrForImage(image, enhancement)} onDiscard={(record)=>{setOcrResults((prev)=>prev.filter((r)=>r.id!==record.id)); closeOcrReview();}}/>}</div>
      <div className="card"><h3>Recent Scans</h3>{recentScans.length?recentScans.map((s)=><article className="record compact-scan" key={s.id}><b>{s.detectedValue || s.upc || 'Unknown barcode'}</b><span>{s.sourceType || 'manual'} · {s.detectedAt ? new Date(s.detectedAt).toLocaleString() : new Date(s.createdAt).toLocaleString()}</span><span>Lookup: {s.lookupStatus || 'pending-review'} · Product: {s.productId || 'not saved'}</span>{activeDraft&&<button type="button" onClick={reviewActiveDraft}>Reopen draft</button>}</article>):<p className="muted">No recent scans yet. Scan a barcode to start your local history.</p>}</div>
      {scanStep === 'review-draft' && <div className="card"><h3>Manual Product Entry</h3><ProductFields form={productForm} setForm={setProductForm} select={select} input={input}/><button className="button primary" onClick={()=>saveProduct()}>Save Product Record</button></div>}
    </div></section>}
    {activeTab === 'products' && <section className="section light-section"><div className="container"><Section title="Product Records Database" eyebrow="Saved locally" text="Every scan, upload, and manual product entry is stored locally and can be edited or deleted."/>{!products.length&&<div className="card empty-state"><h3>No saved products yet.</h3><p>Scan a barcode, take a label photo, or add a product manually.</p><button className="button primary" onClick={()=>switchTab('scanner')}>Scan product</button><button onClick={()=>{switchTab('scanner');setScanStep('review-draft')}}>Add manual product</button></div>} {!!products.length&&<><Filters query={query} setQuery={setQuery} companyFilter={companyFilter} setCompanyFilter={setCompanyFilter} techFilter={techFilter} setTechFilter={setTechFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} companies={companies} /><div className="list">{filteredProducts.map(p=><article className="record" key={p.id}><h3>{p.productName || 'Unnamed product'}</h3><p>{p.brand || 'Unknown brand'} · UPC {p.upc || 'none'} · {p.evidenceStatus}</p><p>Images: {p.uploadedImages?.length || 0} · Evidence: {p.linkedEvidenceIds?.length || 0}</p><button onClick={()=>setActiveProduct(p)}>Open detail</button><button onClick={()=>{setEditingProductId(p.id); setProductForm(p); switchTab('scanner'); setScanStep('review-draft');}}>Edit</button><button className="danger" onClick={()=>confirm('Delete this product record?')&&setProducts(products.filter(x=>x.id!==p.id))}>Delete</button></article>)}</div></>}{activeProduct&&<ProductDetail record={activeProduct} statusText={statusText(activeProduct)} evidence={evidence} close={()=>setActiveProduct(null)} edit={()=>{setEditingProductId(activeProduct.id);setProductForm(activeProduct);switchTab('scanner');setScanStep('review-draft')}}/>}</div></section>}
    {activeTab === 'companies' && <section className="section"><div className="container"><Section title="Company Database" eyebrow="Ownership mapping" text="Save companies, technology categories, evidence status, confidence, and brand ownership relationships."/>{!companies.length&&<p className="notice">Company database is empty. Add a company manually or create one from a product lookup.</p>}<div className="grid two"><div className="card"><CompanyFields form={companyForm} setForm={setCompanyForm} input={input} select={select}/><button className="button primary" onClick={saveCompany}>Save Company</button></div><div>{companies.map(c=><article className="record" key={c.id}><h3>{c.companyName}</h3><p>{c.parentCompany} · {c.evidenceStatus} · {c.confidenceLevel}</p><button className="danger" onClick={()=>confirm('Delete company record?')&&setCompanies(companies.filter(x=>x.id!==c.id))}>Delete</button></article>)}</div></div></div></section>}
    {activeTab === 'evidence' && <section className="section light-section"><div className="container"><Section title="Evidence Trail System" eyebrow="Claims need sources" text="Connect evidence to a company or product without implying verification unless its status is marked verified."/>{!evidence.length&&<p className="notice">No evidence saved yet. Add a source, label photo, receipt, lookup result, or company record.</p>}<div className="card"><EvidenceFields form={evidenceForm} setForm={setEvidenceForm} input={input} select={select}/><button className="button primary" onClick={saveEvidence}>Save Evidence</button></div><div className="list">{evidence.map(e=><article className="record" key={e.id}><h3>{e.evidenceTitle}</h3><p>{e.evidenceType} · {e.evidenceStatus} · {e.confidenceLevel}</p><p>{e.summary}</p><button className="danger" onClick={()=>confirm('Delete evidence item?')&&setEvidence(evidence.filter(x=>x.id!==e.id))}>Delete</button></article>)}</div></div></section>}
    {activeTab === 'data' && <section className="section"><div className="container"><Section title="Data Import / Export" eyebrow="Local data management" text="Export regularly. Images saved as data URLs can fill local device storage."/><div className="actions"><button onClick={()=>download('brandtrace-backup.json', JSON.stringify({companies,products,evidence,scans,uploads,ocrResults,intakeDrafts,settings,lookupCache:readKey(STORAGE_KEYS.lookupCache,{})}, null, 2))}>Export all JSON</button><button onClick={()=>download('brandtrace-products.csv', asCsv(products), 'text/csv')}>Export products CSV</button><button onClick={()=>download('brandtrace-companies.csv', asCsv(companies), 'text/csv')}>Export companies CSV</button><button onClick={()=>download('brandtrace-evidence.csv', asCsv(evidence), 'text/csv')}>Export evidence CSV</button><label className="button secondary import">Import JSON merge<input type="file" accept="application/json" onChange={e=>e.target.files[0]&&importBackup(e.target.files[0], true)}/></label><label className="button secondary import">Import JSON overwrite<input type="file" accept="application/json" onChange={e=>e.target.files[0]&&importBackup(e.target.files[0], false)}/></label><button onClick={seedDemo}>Load demo seed data</button>{settings.demoSeeded&&<button onClick={clearDemo}>Clear demo data</button>}<button className="danger" onClick={resetAll}>Reset local BrandTrace data</button></div><OutsideSourceRoadmap/></div></section>}
    {activeTab === 'settings' && <section className="section light-section"><div className="container"><Section title="BrandTrace Settings" eyebrow="Lookup behavior" text="Control public UPC lookup behavior while preserving local-first storage."/><div className="card settings-grid">{[['enablePublicLookup','Enable public UPC lookup'],['preferLocalRecords','Prefer local records first'],['cacheLookupResults','Cache lookup results'],['autoCreateEvidence','Auto-create evidence from lookups'],['autoCreateCompanyDrafts','Auto-create company drafts'],['enableLocalLabelOcr','Enable local label OCR'],['offerOcrAfterPhoto','Offer OCR after adding label photos'],['keepRawOcrText','Keep raw OCR text'],['warnBeforeReplacingFields','Warn before replacing existing fields'],['enableIngredientParsing','Enable ingredient parsing'],['enableLabelPhraseHighlighting','Enable label phrase highlighting']].map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={!!settings[key]} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/><span>{label}</span></label>)}</div></div></section>}

  </main><footer className="site-footer"><div className="container footer-grid"><p>Developed by Ember Fire Media</p><p>BrandTrace.fyi proprietary soft-launch MVP</p><p>Scan. Trace. Decide.</p></div></footer></>;
}



function CurrentIntakeDraftPanel({ draft, onReview, onSave, onClear, onExport }) {
  if (!draft) return <div className="card intake-draft"><h3>Current Intake Draft</h3><p className="notice">No active draft yet. Taking or uploading a photo will save it locally in BrandTrace and create a recoverable intake draft.</p></div>;
  return <div className="card intake-draft"><h3>Current Intake Draft</h3><p className="notice">Photos in this draft are saved locally on this device.</p><dl><dt>Draft status</dt><dd>{draft.draftStatus}</dd><dt>Photo count</dt><dd>{draft.uploadedImages?.length || 0}</dd><dt>Detected UPC</dt><dd>{draft.upc || 'None yet'}</dd><dt>Product name</dt><dd>{draft.productName || 'Needs review'}</dd><dt>Brand</dt><dd>{draft.brand || 'Needs review'}</dd><dt>Lookup source</dt><dd>{draft.lookupSource || 'None / local only'}</dd><dt>Evidence status</dt><dd>{draft.linkedEvidenceIds?.length ? `${draft.linkedEvidenceIds.length} evidence draft(s) linked` : 'No linked evidence yet'}</dd><dt>Last updated</dt><dd>{draft.updatedAt ? new Date(draft.updatedAt).toLocaleString() : 'Unknown'}</dd></dl>{(draft.sourceWarnings||[]).map((w)=><p className="notice" key={w}>{w}</p>)}<div className="actions"><button type="button" onClick={onReview}>Review draft</button><button className="button primary" type="button" onClick={onSave}>Save as product</button><button type="button" onClick={onExport}>Export draft</button><button className="danger" type="button" onClick={onClear}>Clear draft</button></div></div>;
}
function OutsideSourceRoadmap() {
  const sources = [
    ['Open Food Facts barcode lookup','Product identity, labels, nutrition, images','Medium','No backend needed for current browser lookup','Yes','Yes'],
    ['Local BrandTrace company/product/evidence records','Your saved research and evidence links','High for your reviewed data','No','No','Yes'],
    ['User-uploaded label evidence','Physical label photos and notes','High when label is legible','No','No','Yes'],
    ['Local OCR','Extracted text from local label photos','Medium','No','No','Yes'],
    ['USDA FoodData Central','Nutrition/food composition references','Medium/High','API key may be needed','Public government data','Yes'],
    ['GS1 / GTIN / Digital Link references','GTIN ownership and product identifiers','High','API key/backend likely','No','Yes'],
    ['OpenCorporates','Company registration leads','Medium','API key may be needed','Public aggregate','Yes'],
    ['SEC / EDGAR company filings','Public company filings and ownership clues','High','No backend required for links; heavier use may need API','Public government data','Yes'],
    ['Company websites and contact pages','Claims, contact details, ownership pages','Medium','No','No','Yes'],
    ['Retail listings','Product names, images, market availability','Low/Medium','May need backend/API depending source','Sometimes','Yes'],
    ['Manual source URL evidence','Any user-reviewed source URL','Depends on source','No','Depends on source','Yes'],
  ];
  return <details className="card source-roadmap"><summary><b>Outside Source Roadmap</b></summary><p className="muted">Outside data is optional enrichment. Local BrandTrace records and uploaded label evidence remain the primary source of reviewed truth.</p><div className="table-wrap"><table><thead><tr><th>Source</th><th>What it can provide</th><th>Reliability</th><th>API/backend</th><th>Public/crowdsourced</th><th>Review</th></tr></thead><tbody>{sources.map((r)=><tr key={r[0]}>{r.map((c)=><td key={c}>{c}</td>)}</tr>)}</tbody></table></div></details>;
}

function LookupReview({ draft, setDraft, saveDraft, applyToDraft, createCompanyDraft, input }) {
  const update = (key, value) => setDraft({ ...draft, [key]: value, dataSources: [...new Set([...(draft.dataSources || []), 'User corrected'])] });
  return <div className="lookup-review"><h3>Review UPC Lookup Draft</h3><p className="notice">BrandTrace found public product data. Review and correct it before saving. Public lookup data may be incomplete or outdated.</p><p className="muted">{draft.companyStatus === 'Matched to company database' ? 'Matched to company database. Company match is based on BrandTrace local database.' : 'Parent company not verified yet.'}</p>{draft.productImageUrl&&<img className="lookup-image" src={draft.productImageUrl} alt={draft.productName || draft.upc}/>} {input('Product name', draft.productName, v=>update('productName', v))}{input('Brand', draft.brand, v=>update('brand', v))}{input('UPC / barcode', draft.upc, v=>update('upc', v))}{input('Parent company', draft.parentCompany, v=>update('parentCompany', v))}{input('Category', draft.category, v=>update('category', v))}<label>Ingredients text<textarea value={draft.ingredientsNotes||''} onChange={e=>update('ingredientsNotes', e.target.value)}/></label><label>Nutrition notes<textarea value={draft.nutritionNotes||''} onChange={e=>update('nutritionNotes', e.target.value)}/></label>{input('Packaging / labels', draft.packagingLabels, v=>update('packagingLabels', v))}{input('Country / market', draft.countryMarket, v=>update('countryMarket', v))}{input('Source URL', draft.sourceUrl, v=>update('sourceUrl', v))}<p className="notice">Open Food Facts is public/crowdsourced. Verify against the physical label.</p><div className="actions"><button className="button primary" type="button" onClick={applyToDraft}>Apply reviewed fields to draft</button><button type="button" onClick={saveDraft}>Save reviewed product</button>{!draft.companyId&&<button onClick={()=>createCompanyDraft(draft)}>Create Company Draft</button>}</div></div>;
}

function ProductDetail({ record, statusText, evidence, close, edit }) {
  const linkedEvidence = evidence.filter((e) => (record.linkedEvidenceIds || []).includes(e.id) || e.relatedProduct === record.productName || e.relatedProduct === record.upc);
  return <article className="card result product-detail"><h3>Product Detail</h3>{record.productImageUrl&&<img className="lookup-image" src={record.productImageUrl} alt={record.productName || record.upc}/>}<p className="notice">{statusText}</p>{record.sourceName==='Open Food Facts'&&<p className="notice">Open Food Facts is public/crowdsourced. Verify against the physical label.</p>}<dl><dt>Product name</dt><dd>{record.productName || 'Unnamed product'}</dd><dt>Brand</dt><dd>{record.brand || 'Unknown'}</dd><dt>Parent company</dt><dd>{record.parentCompany || 'Needs research'}</dd><dt>UPC</dt><dd>{record.upc || 'None'}</dd><dt>Source data</dt><dd>{[record.sourceName, record.sourceUrl].filter(Boolean).join(' · ') || (record.dataSources || []).join(', ') || 'Manual/local'}</dd><dt>Ingredients</dt><dd>{record.ingredientsNotes || 'Not recorded'}</dd><dt>Nutrition notes</dt><dd>{record.nutritionNotes || 'Not recorded'}</dd><dt>Confidence status</dt><dd>{record.confidenceLevel || 'Unknown'} · {record.evidenceStatus || 'Needs review'}</dd><dt>Linked evidence</dt><dd>{linkedEvidence.length || 0}</dd></dl><h4>Uploaded photos</h4><PhotoPreviewGallery images={record.uploadedImages||[]} /><h4>Linked evidence</h4>{linkedEvidence.length ? linkedEvidence.map((e)=><p className="pill" key={e.id}>{e.evidenceTitle || e.sourceName}</p>) : <p className="muted">No linked evidence yet.</p>}<div className="actions"><button type="button" onClick={edit}>Edit</button><button type="button" onClick={close}>Close</button></div></article>;
}

function SourceLabel({ sourceType }) { return sourceType === 'camera' ? 'Camera' : 'Upload'; }
function PhotoButton({ label, photoType, sourceType, handleImages, multiple = false }) {
  return <label className={`button ${sourceType === 'camera' ? 'primary' : 'secondary file-action'}`}>{label}<input type="file" accept="image/*" capture={sourceType === 'camera' ? 'environment' : undefined} multiple={multiple} onClick={(e)=>{ e.currentTarget.value = ''; }} onChange={async (e)=>{ await handleImages(e.target.files, photoType, sourceType); e.currentTarget.value = ''; }} /></label>;
}
function PhotoActionRow({ handleImages }) {
  return <div className="upload-action-row" aria-label="Scanner upload actions"><PhotoButton label="Take Product Photo" photoType="Product Photo" sourceType="camera" handleImages={handleImages}/><PhotoButton label="Upload Product Photo" photoType="Product Photo" sourceType="uploaded" handleImages={handleImages} multiple/><button type="button" className="button secondary" onClick={()=>{window.scrollTo({top:0,behavior:'smooth'});}}>Add Evidence Document</button><button type="button" className="button secondary" onClick={()=>{window.scrollTo({top:0,behavior:'smooth'});}}>Manual Entry</button></div>;
}
function PhotoCaptureGrid({ handleImages }) {
  const photoOptions = [
    ['Front Label', 'Take Front Label Photo'],
    ['Ingredient Label', 'Take Ingredient Label Photo'],
    ['Nutrition Label', 'Take Nutrition Label Photo'],
    ['Barcode Photo', 'Take Barcode Photo'],
    ['Company / Contact Label', 'Take Company / Contact Label Photo'],
    ['Receipt Photo', 'Take Receipt Photo'],
    ['Other Evidence Photo', 'Take Other Evidence Photo'],
  ];
  return <div className="photo-capture-grid">{photoOptions.map(([type, cameraLabel]) => <div className="photo-capture-card" key={type}><h4>{type}</h4><div className="photo-button-row"><PhotoButton label="Upload Photo" photoType={type} sourceType="uploaded" handleImages={handleImages} multiple/><PhotoButton label={cameraLabel} photoType={type} sourceType="camera" handleImages={handleImages}/></div></div>)}</div>;
}
function PhotoPreviewGallery({ images, onRemove, onOcr, ocrResults = [], offerOcr = false }) {
  if (!images.length) return <p className="muted">No photos yet. Uploaded and camera-captured images will preview here and save with the product record.</p>;
  return <div className="previews">{images.map((img)=>{ const hasOcr=ocrResults.some((r)=>r.imageId===img.id); return <figure className="preview-card" key={img.id}><img src={img.dataUrl} alt={img.name || img.type}/><figcaption><b>{img.type || 'Photo'}</b><span>Source: <SourceLabel sourceType={img.sourceType}/></span><span>Date added: {img.createdAt ? new Date(img.createdAt).toLocaleString() : 'Unknown'}</span>{onOcr&&<button className="button primary" type="button" aria-label={`Read label text from ${img.type}`} onClick={()=>onOcr(img)}>{offerOcr && !hasOcr ? 'Read Text Now' : 'Read Label Text'}</button>}{onRemove&&<button className="danger" type="button" onClick={()=>onRemove(img.id)}>Remove</button>}</figcaption></figure>;})}</div>;
}

function OcrHistory({ ocrResults, images, onOpen, onRetry, onDelete }) {
  if (!ocrResults.length) return null;
  return <div className="ocr-history"><h3>OCR Results</h3>{ocrResults.map((r)=>{ const image=images.find((img)=>img.id===r.imageId); return <article className="record compact" key={r.id}>{image?.dataUrl&&<img className="thumb" src={image.dataUrl} alt={`${r.photoType} thumbnail`}/>}<p><b>{r.photoType}</b> · {r.processingStatus} · {r.createdAt ? new Date(r.createdAt).toLocaleString() : 'Unknown date'}</p><p>Confidence: {r.confidence ?? 'unknown'} · {r.userReviewed ? 'Reviewed' : 'Unreviewed'} · Fields applied: {(r.appliedFields||[]).join(', ') || 'none'}</p><div className="actions"><button type="button" onClick={()=>onOpen(r)}>Open review</button><button type="button" onClick={()=>onRetry(r)}>Retry</button><button className="danger" type="button" onClick={()=>onDelete(r.id)}>Delete OCR result</button></div></article>;})}</div>;
}

function Section({ eyebrow, title, text }) { return <div className="section-header"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text&&<p>{text}</p>}</div>; }
function ProductFields({ form, setForm, input, select }) { return <>{form.sourceName&&<p className="notice">Public product database result. Verify against label.</p>}{input('Product name', form.productName, v=>setForm({...form,productName:v}))}{input('Brand', form.brand, v=>setForm({...form,brand:v}))}{input('Parent company', form.parentCompany, v=>setForm({...form,parentCompany:v}))}{input('UPC / barcode', form.upc, v=>setForm({...form,upc:v}))}{input('Category', form.category, v=>setForm({...form,category:v}))}{input('Store found', form.storeLocation, v=>setForm({...form,storeLocation:v}))}{input('Product image URL', form.productImageUrl, v=>setForm({...form,productImageUrl:v}))}{input('Packaging / labels', form.packagingLabels, v=>setForm({...form,packagingLabels:v}))}{input('Date found', form.dateFound, v=>setForm({...form,dateFound:v}), {type:'date'})}{input('Country/market', form.countryMarket, v=>setForm({...form,countryMarket:v}))}<label>Ingredients notes<textarea value={form.ingredientsNotes||''} onChange={e=>setForm({...form,ingredientsNotes:e.target.value})}/></label><label>Nutrition notes<textarea value={form.nutritionNotes||''} onChange={e=>setForm({...form,nutritionNotes:e.target.value})}/></label>{select('Technology concern / claim', form.technologyCategory, v=>setForm({...form,technologyCategory:v}), TECHNOLOGY_CATEGORIES)}{select('Evidence status', form.evidenceStatus, v=>setForm({...form,evidenceStatus:v}), EVIDENCE_STATUSES)}{select('Confidence level', form.confidenceLevel, v=>setForm({...form,confidenceLevel:v}), CONFIDENCE_LEVELS)}<label>User notes<textarea value={form.userNotes||''} onChange={e=>setForm({...form,userNotes:e.target.value})}/></label></>; }
function CompanyFields({ form, setForm, input, select }) { function addBrand(){setForm({...form, brandOwnership:[...(form.brandOwnership||[]), {id:id(), brand:'', relationship:'Owned', notes:'', productIds:[]}]})} return <>{input('Company name', form.companyName, v=>setForm({...form,companyName:v}))}{input('Parent company', form.parentCompany, v=>setForm({...form,parentCompany:v}))}{input('Headquarters country/state', form.headquarters, v=>setForm({...form,headquarters:v}))}{input('Website', form.website, v=>setForm({...form,website:v}))}{input('Customer service/contact page', form.contactPage, v=>setForm({...form,contactPage:v}))}{input('Known brands', form.knownBrands, v=>setForm({...form,knownBrands:v}))}{input('Subsidiaries', form.subsidiaries, v=>setForm({...form,subsidiaries:v}))}{input('Product categories', form.productCategories, v=>setForm({...form,productCategories:v}))}<label>Technology categories used or watched<select multiple value={form.technologyCategories||[]} onChange={e=>setForm({...form,technologyCategories:Array.from(e.target.selectedOptions).map(o=>o.value)})}>{TECHNOLOGY_CATEGORIES.map(o=><option key={o}>{o}</option>)}</select></label><label>Public claims / concerns<textarea value={form.publicClaims||''} onChange={e=>setForm({...form,publicClaims:e.target.value})}/></label>{select('Evidence status', form.evidenceStatus, v=>setForm({...form,evidenceStatus:v}), EVIDENCE_STATUSES)}{select('Confidence level', form.confidenceLevel, v=>setForm({...form,confidenceLevel:v}), CONFIDENCE_LEVELS)}{input('Last reviewed date', form.lastReviewedDate, v=>setForm({...form,lastReviewedDate:v}), {type:'date'})}<label>Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label><h3>Brand Ownership</h3>{(form.brandOwnership||[]).map((b,i)=><div className="mini" key={b.id}><input placeholder="Brand" value={b.brand} onChange={e=>{const a=[...form.brandOwnership];a[i].brand=e.target.value;setForm({...form,brandOwnership:a})}}/><select value={b.relationship} onChange={e=>{const a=[...form.brandOwnership];a[i].relationship=e.target.value;setForm({...form,brandOwnership:a})}}>{OWNERSHIP_TYPES.map(o=><option key={o}>{o}</option>)}</select><input placeholder="M&A notes / linked product IDs" value={b.notes} onChange={e=>{const a=[...form.brandOwnership];a[i].notes=e.target.value;setForm({...form,brandOwnership:a})}}/></div>)}<button type="button" onClick={addBrand}>Add brand under company</button></>; }
function EvidenceFields({ form, setForm, input, select }) { return <>{input('Evidence title', form.evidenceTitle, v=>setForm({...form,evidenceTitle:v}))}{select('Evidence type', form.evidenceType, v=>setForm({...form,evidenceType:v}), EVIDENCE_TYPES)}{input('Source name', form.sourceName, v=>setForm({...form,sourceName:v}))}{input('Source URL', form.sourceUrl, v=>setForm({...form,sourceUrl:v}))}{input('Date published or found', form.date, v=>setForm({...form,date:v}), {type:'date'})}{input('Related company', form.relatedCompany, v=>setForm({...form,relatedCompany:v}))}{input('Related product', form.relatedProduct, v=>setForm({...form,relatedProduct:v}))}{input('Claim being supported', form.claim, v=>setForm({...form,claim:v}))}<label>Short summary<textarea value={form.summary||''} onChange={e=>setForm({...form,summary:e.target.value})}/></label><label>Exact quote / excerpt<textarea value={form.quote||''} onChange={e=>setForm({...form,quote:e.target.value})}/></label>{select('Evidence status', form.evidenceStatus, v=>setForm({...form,evidenceStatus:v}), EVIDENCE_STATUSES)}{select('Confidence level', form.confidenceLevel, v=>setForm({...form,confidenceLevel:v}), CONFIDENCE_LEVELS)}<label>Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{input('Last reviewed date', form.lastReviewedDate, v=>setForm({...form,lastReviewedDate:v}), {type:'date'})}</>; }
function Filters(p){return <div className="filters"><input placeholder="Search products, brand, UPC..." value={p.query} onChange={e=>p.setQuery(e.target.value)}/><select value={p.companyFilter} onChange={e=>p.setCompanyFilter(e.target.value)}><option value="">All companies</option>{p.companies.map(c=><option key={c.id}>{c.companyName}</option>)}</select><select value={p.techFilter} onChange={e=>p.setTechFilter(e.target.value)}><option value="">All tech categories</option>{TECHNOLOGY_CATEGORIES.map(o=><option key={o}>{o}</option>)}</select><select value={p.statusFilter} onChange={e=>p.setStatusFilter(e.target.value)}><option value="">All evidence statuses</option>{EVIDENCE_STATUSES.map(o=><option key={o}>{o}</option>)}</select></div>}
function ResultCard({ record, statusText, evidenceCount, close }) { const badges = [...new Set([...(record.dataSources || ['Manual entry']), ...(record.uploadedImages?.length ? ['Uploaded label'] : []), ...(record.linkedEvidenceIds?.length || evidenceCount ? ['Evidence attached'] : [])])]; return <article className="card result"><h3>Scanner Result</h3><div className="badges">{badges.map(b=><span className="badge" key={b}>{b}</span>)}</div><p className="notice">{statusText}</p>{record.sourceName==='Open Food Facts'&&<p className="notice">Public product database result. Verify against label.</p>}{record.companyId&&<p className="pill">Company match is based on BrandTrace local database.</p>}{record.parentCompany==='Unknown'&&<p className="notice">Parent company not verified yet.</p>}<dl><dt>Product</dt><dd>{record.productName}</dd><dt>Brand</dt><dd>{record.brand}</dd><dt>Parent company</dt><dd>{record.parentCompany}</dd><dt>UPC</dt><dd>{record.upc}</dd><dt>Technology category</dt><dd>{record.technologyCategory}</dd><dt>Evidence status</dt><dd>{record.evidenceStatus}</dd><dt>Confidence</dt><dd>{record.confidenceLevel}</dd><dt>Notes</dt><dd>{record.userNotes || record.notes}</dd><dt>Linked evidence</dt><dd>{record.linkedEvidenceIds?.length || evidenceCount || 0}</dd><dt>Uploaded images</dt><dd>{record.uploadedImages?.length || 0}</dd><dt>Last updated</dt><dd>{record.updatedAt}</dd></dl><PhotoPreviewGallery images={record.uploadedImages||[]} />{close&&<button onClick={close}>Close</button>}</article>; }
export default App;
