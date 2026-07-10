import { useEffect, useMemo, useRef, useState } from 'react';
import BarcodeScanner from './components/BarcodeScanner.jsx';
import BarcodeResult from './components/BarcodeResult.jsx';
import { detectBarcodeFromFile, isLookupBarcode, normalizeBarcodeValue, scannerErrorMessage } from './utils/barcodeDecoder.js';

const STORAGE_KEYS = {
  companies: 'brandtraceCompanies',
  products: 'brandtraceProducts',
  evidence: 'brandtraceEvidence',
  scans: 'brandtraceScans',
  uploads: 'brandtraceUploads',
  settings: 'brandtraceSettings',
  lookupCache: 'brandtraceLookupCache',
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
  const [companies, setCompanies] = useState(() => readKey(STORAGE_KEYS.companies, []));
  const [products, setProducts] = useState(() => readKey(STORAGE_KEYS.products, []));
  const [evidence, setEvidence] = useState(() => readKey(STORAGE_KEYS.evidence, []));
  const [scans, setScans] = useState(() => readKey(STORAGE_KEYS.scans, []));
  const [uploads, setUploads] = useState(() => readKey(STORAGE_KEYS.uploads, []));
  const defaultSettings = { demoSeeded: false, enablePublicLookup: true, preferLocalRecords: true, cacheLookupResults: true, autoCreateEvidence: true, autoCreateCompanyDrafts: false };
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
  const openScannerButtonRef = useRef(null);
  const [docForm, setDocForm] = useState({ fileName: '', evidenceType: 'User upload', sourceOrganization: '', date: '', relatedCompany: '', relatedProduct: '', summaryNotes: '', confidenceLevel: 'Unknown' });
  const [editingProductId, setEditingProductId] = useState(null);
  const [query, setQuery] = useState(''); const [companyFilter, setCompanyFilter] = useState(''); const [techFilter, setTechFilter] = useState(''); const [statusFilter, setStatusFilter] = useState('');
  const [result, setResult] = useState(null); const [message, setMessage] = useState(''); const [activeProduct, setActiveProduct] = useState(null);
  const barcodeSupported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  useEffect(() => saveKey(STORAGE_KEYS.companies, companies), [companies]); useEffect(() => saveKey(STORAGE_KEYS.products, products), [products]); useEffect(() => saveKey(STORAGE_KEYS.evidence, evidence), [evidence]); useEffect(() => saveKey(STORAGE_KEYS.scans, scans), [scans]); useEffect(() => saveKey(STORAGE_KEYS.uploads, uploads), [uploads]); useEffect(() => saveKey(STORAGE_KEYS.settings, settings), [settings]);
  const stats = useMemo(() => ({ companies: companies.length, products: products.length, evidence: evidence.length, watchlist: [...products, ...companies].filter((r) => r.evidenceStatus === 'Watchlist').length, unverified: [...products, ...companies, ...evidence].filter((r) => r.evidenceStatus === 'Unverified viral claim').length, verified: [...products, ...companies, ...evidence].filter((r) => r.evidenceStatus === 'Verified').length }), [companies, products, evidence]);
  const filteredProducts = products.filter((p) => [p.productName, p.brand, p.parentCompany, p.upc].join(' ').toLowerCase().includes(query.toLowerCase()) && (!companyFilter || p.parentCompany === companyFilter) && (!techFilter || p.technologyCategory === techFilter) && (!statusFilter || p.evidenceStatus === statusFilter));
  const brandMatches = companies.flatMap((c) => (c.brandOwnership || []).map((b) => ({ ...b, companyName: c.companyName }))).filter((b) => b.brand?.toLowerCase().includes(query.toLowerCase()));


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
  function applyDetectedBarcode(result, sourceType) {
    const normalized = normalizeBarcodeValue(result.value || result.rawValue, result.format);
    const label = sourceLabelFor(sourceType);
    const next = { value: normalized, rawValue: result.rawValue || result.value, format: result.format || 'unknown', sourceType, label, detectedAt: now(), decoder: result.decoder || '' };
    setDetectedBarcode(next);
    setScanForm((p) => ({ ...p, upc: normalized, dataSources: [...new Set([...(p.dataSources || []), label])] }));
    if (isLookupBarcode(normalized, result.format)) setLookupBarcode(normalized);
    setLookupNotice('Barcode detected. Review the number before lookup.');
    recordScanHistory({ value: normalized, format: next.format, sourceType, notes: label });
  }
  function closeScanner(reason = '') { setScannerOpen(false); setTimeout(() => openScannerButtonRef.current?.focus(), 0); if (reason) setMessage(reason); }

  function saveProduct(source = 'Manual entry', form = productForm) { const cleanForm = { ...form }; delete cleanForm.nextPhotoType; const record = editingProductId ? { ...products.find((p) => p.id === editingProductId), ...cleanForm, updatedAt: now() } : withMeta(cleanForm); setProducts((prev) => editingProductId ? prev.map((p) => p.id === editingProductId ? record : p) : [record, ...prev]); setResult(record); setEditingProductId(null); setProductForm(emptyProduct); setMessage(`${source} saved locally.`); return record; }
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
              applyDetectedBarcode({ value: decoded.rawValue, rawValue: decoded.rawValue, format: decoded.format, decoder: decoded.decoder }, barcodeSource);
              recordScanHistory({ value: decoded.rawValue, format: decoded.format, sourceType: barcodeSource, imageId: image.id, notes: `Decoded from ${sourceType === 'camera' ? 'camera' : 'uploaded'} barcode photo` });
              setPhotoDecodeNotice('Barcode detected from photo. Review the number before lookup.');
            } else setPhotoDecodeNotice('No readable barcode was found in this photo. Try moving closer, improving lighting, keeping the barcode flat, or enter the UPC manually.');
          } catch (e) { setPhotoDecodeNotice(scannerErrorMessage(e)); }
        }
        return image;
      }));
      const nextForm = { ...productForm, uploadedImages: [...(productForm.uploadedImages || []), ...images] };
      const serialized = JSON.stringify(nextForm.uploadedImages || []);
      if (serialized.length > 4200000) setMessage('This image may be too large for local storage. Try a smaller image or export your data first.');
      setProductForm(nextForm);
      setUploads((prev) => [...images.map((image) => withMeta({ uploadType: 'product-photo', photoType: image.type, sourceType: image.sourceType, fileName: image.name, productId: editingProductId || '', productName: productForm.productName || '', upc: productForm.upc || '', imageId: image.id })), ...prev]);
      if (editingProductId) setProducts((prev) => prev.map((p) => p.id === editingProductId ? { ...p, uploadedImages: nextForm.uploadedImages, updatedAt: now() } : p));
      setMessage(`${images.length} ${sourceType === 'camera' ? 'camera' : 'uploaded'} photo${images.length === 1 ? '' : 's'} added locally.`);
    } catch {
      setMessage(sourceType === 'camera' ? 'Camera capture is not supported on this device. Upload a photo instead.' : 'This image may be too large for local storage. Try a smaller image or export your data first.');
    }
  }
  function removeImage(imageId) {
    const nextImages = (productForm.uploadedImages || []).filter((img) => img.id !== imageId);
    setProductForm((p) => ({ ...p, uploadedImages: nextImages }));
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
  async function lookupUpc(refresh = false) {
    const barcode = String(lookupBarcode || scanForm.upc || '').replace(/\D/g, '');
    if (!barcode) { setLookupNotice('Enter or scan a UPC/barcode first.'); return; }
    setLookupBarcode(barcode);
    if (!settings.enablePublicLookup) { setLookupNotice('Public UPC lookup is disabled in settings. Manual entry is still available.'); return; }
    const existing = settings.preferLocalRecords && products.find((p) => String(p.upc || '').replace(/\D/g, '') === barcode);
    if (existing && !refresh) { setLookupDraft(existing); setLookupStatus('found'); setLookupNotice('Using saved lookup data. You can refresh this lookup.'); return; }
    const cache = readKey(STORAGE_KEYS.lookupCache, {});
    if (cache[barcode] && !refresh) { setLookupStatus(cache[barcode].found ? 'found' : 'notfound'); setLookupDraft(cache[barcode].found ? buildDraft(cache[barcode].normalizedProductData) : null); setLookupNotice('Using saved lookup data. You can refresh this lookup.'); return; }
    setLookupStatus('loading'); setLookupNotice('Looking up product information…');
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`);
      const data = await res.json();
      if (!res.ok || data.status !== 1 || !data.product) { cacheLookup({ barcode, source: 'Open Food Facts', found: false, fetchedAt: now(), normalizedProductData: null, rawSummary: data.status_verbose || 'Not found' }); setLookupStatus('notfound'); setLookupDraft(null); setLookupNotice('No public product record was found for this UPC yet. You can still save this scan, upload label photos, or enter the product manually.'); return; }
      const normalized = normalizeOffProduct(data.product, barcode); cacheLookup({ barcode, source: 'Open Food Facts', found: true, fetchedAt: now(), normalizedProductData: normalized, rawSummary: `${normalized.productName || 'Unnamed'} / ${normalized.brand || 'Unknown brand'}` });
      setLookupDraft(buildDraft(normalized)); setLookupStatus('found'); setLookupNotice('BrandTrace found public product data. Review and correct it before saving. Public lookup data may be incomplete or outdated.');
    } catch { setLookupStatus('idle'); setLookupNotice('Lookup failed or the app is offline. Manual entry, uploads, and saved local records still work.'); }
  }
  function saveLookupDraft() { const product = saveProduct('UPC lookup draft', { ...lookupDraft, dataSources: [...new Set([...(lookupDraft.dataSources || []), 'Open Food Facts lookup', 'User corrected'])] }); if (settings.autoCreateEvidence) { const ev = withMeta({ ...addEvidenceForLookup(product), relatedProduct: product.productName || product.upc }); setEvidence((prev) => [ev, ...prev]); if (settings.autoCreateCompanyDrafts && !product.companyId) createCompanyDraftFromLookup(product); setProducts((prev) => prev.map((p) => p.id === product.id ? { ...p, linkedEvidenceIds: [...(p.linkedEvidenceIds || []), ev.id], dataSources: [...new Set([...(p.dataSources || []), 'Evidence attached'])] } : p)); } setLookupDraft(null); setLookupStatus('idle'); return product; }
  function saveUnknownProduct() { setLookupDraft(buildDraft({ upc: lookupBarcode || scanForm.upc, productName: '', brand: '', category: '', sourceName: 'Manual entry', sourceUrl: '', lookupDate: new Date().toISOString().slice(0,10), rawLookupSourceName: 'Not found' })); setLookupStatus('found'); }
  function createCompanyDraftRecord(product = lookupDraft) { const brand = product?.brand || product?.parentCompany || 'Unknown company'; return withMeta({ ...emptyCompany, companyName: brand, parentCompany: 'Unknown', knownBrands: product?.brand || '', productCategories: product?.category || '', evidenceStatus: 'Needs review', confidenceLevel: 'Low', notes: 'Created from UPC lookup. Parent company needs verification.', publicClaims: `Source: Open Food Facts product lookup${product?.sourceUrl ? ` (${product.sourceUrl})` : ''}`, lastReviewedDate: new Date().toISOString().slice(0,10), brandOwnership: product?.brand ? [{ id: id(), brand: product.brand, relationship: 'Unclear', notes: 'Created from UPC lookup; verify ownership.', productIds: [] }] : [] }); }
  function createCompanyDraftFromLookup(product = lookupDraft) { const company = createCompanyDraftRecord(product); setCompanies((prev) => [company, ...prev]); setLookupDraft(product ? { ...product, companyId: company.id, parentCompany: company.parentCompany || company.companyName, companyStatus: 'Needs Research', dataSources: [...new Set([...(product.dataSources || []), 'Company database match'])] } : product); setMessage('Company draft created locally from UPC lookup.'); return company; }

  function seedDemo() { if (settings.demoSeeded) return; setCompanies((p) => [...demoCompanies, ...p]); setProducts((p) => [...demoProducts, ...p]); setSettings({ ...settings, demoSeeded: true }); }
  function clearDemo() { if (!confirm('Clear demo/sample BrandTrace records?')) return; const isDemo = (r) => JSON.stringify(r).toLowerCase().includes('demo'); setCompanies((p) => p.filter((r) => !isDemo(r))); setProducts((p) => p.filter((r) => !isDemo(r))); setSettings({ ...settings, demoSeeded: false }); }
  function resetAll() { if (!confirm('Reset all local BrandTrace data on this device? This cannot be undone.')) return; Object.values(STORAGE_KEYS).forEach((k) => localStorage.removeItem(k)); setCompanies([]); setProducts([]); setEvidence([]); setScans([]); setUploads([]); setSettings({ demoSeeded: false }); }
  function importBackup(file, merge) { const reader = new FileReader(); reader.onload = () => { try { const data = JSON.parse(reader.result); if (!merge && !confirm('Overwrite local BrandTrace data with this backup?')) return; setCompanies(merge ? [...(data.companies || []), ...companies] : data.companies || []); setProducts(merge ? [...(data.products || []), ...products] : data.products || []); setEvidence(merge ? [...(data.evidence || []), ...evidence] : data.evidence || []); setScans(merge ? [...(data.scans || []), ...scans] : data.scans || []); setUploads(merge ? [...(data.uploads || []), ...uploads] : data.uploads || []); setSettings({ ...settings, ...(data.settings || {}) }); setMessage('Backup imported.'); } catch { setMessage('Import failed: invalid BrandTrace JSON file.'); } }; reader.readAsText(file); }
  const input = (label, value, onChange, props = {}) => <label>{label}<input value={value || ''} onChange={(e) => onChange(e.target.value)} {...props} /></label>;
  const select = (label, value, onChange, options) => <label>{label}<select value={value || ''} onChange={(e) => onChange(e.target.value)}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>;
  const statusText = (r) => r.evidenceStatus === 'Verified' ? 'Verified evidence exists. Review sources before drawing conclusions.' : r.evidenceStatus === 'Watchlist' ? 'This item is on your watchlist.' : r.evidenceStatus?.includes('Unverified') || r.evidenceStatus === 'Needs review' ? 'This claim needs more evidence.' : r.technologyCategory === 'Factory 3D printing / tooling only' ? 'This appears to be factory tooling/R&D only, not an edible product claim.' : 'No verified concern found yet.';

  return <><header className="site-header"><nav className="nav container"><a className="brand" href="#home"><span className="brand-mark">BT</span><span>BrandTrace</span></a><div className="nav-links"><a href="#scanner">Scanner</a><a href="#products">Products</a><a href="#companies">Companies</a><a href="#evidence">Evidence</a><a href="#data">Data</a><a href="#settings">Settings</a></div></nav></header><main>
    <section id="home" className="hero section"><div className="container hero-grid"><div><p className="eyebrow">Local-first evidence tracing</p><h1>Scan. Upload. Trace.</h1><p className="hero-text">BrandTrace is an evidence-first product and company tracing tool. It helps you organize claims, sources, labels, and company information. It does not replace legal, medical, food safety, or regulatory advice.</p><div className="hero-actions"><a className="button primary" href="#scanner">Start new scan/upload</a><a className="button secondary" href="#products">Search product database</a></div></div><div className="hero-card"><h2>Soft launch dashboard</h2><div className="stats">{Object.entries(stats).map(([k,v])=><span key={k}><b>{v}</b>{k}</span>)}</div><a className="button primary" href="#evidence">Add evidence</a><a className="button secondary" href="#data">Export backup</a></div></div></section>
    {message && <div className="toast container">{message}</div>}
    <section id="scanner" className="section"><div className="container"><Section title="Scanner & Upload Hub" eyebrow="Primary intake" text="Capture product labels, barcode notes, evidence documents, or manual product records. All data stays in this browser localStorage." /><div className="grid two"><div className="card"><h3>Scan Barcode / QR</h3><p className="muted">Camera frames and barcode photos are processed in this browser. BrandTrace does not send images to a barcode-decoding service. UPC lookup sends only the barcode number to the enabled public product source.</p>{!barcodeSupported && <p className="notice">Native BarcodeDetector is unavailable, so BrandTrace will try the bundled browser fallback decoder. Manual entry and photo upload remain available after every scanner error.</p>}<button ref={openScannerButtonRef} className="button primary" type="button" onClick={()=>setScannerOpen(true)}>Open Barcode Scanner</button>{scannerOpen&&<BarcodeScanner onDetected={(result)=>{applyDetectedBarcode(result, 'live-camera'); closeScanner();}} onClosed={closeScanner}/>}<BarcodeResult result={detectedBarcode} onLookup={()=>lookupUpc(false)} onScanAgain={()=>setScannerOpen(true)} onEdit={()=>document.querySelector('[name=scan-upc]')?.focus()} onCancel={()=>setDetectedBarcode(null)}/>{input('UPC / barcode', scanForm.upc, v=>{setScanForm({...scanForm, upc:v, dataSources:[...new Set([...(scanForm.dataSources||[]), detectedBarcode ? 'User corrected' : 'Manual entry'])]}); setLookupBarcode(v);}, {name:'scan-upc'})}<div className="lookup-actions"><button className="button primary" type="button" onClick={()=>lookupUpc(false)}>Lookup UPC</button><button type="button" onClick={()=>lookupUpc(true)}>Refresh lookup</button><button type="button" onClick={()=>{setLookupBarcode(''); setScanForm({...scanForm, upc:''}); setLookupDraft(null); setLookupStatus('idle'); setLookupNotice(''); setDetectedBarcode(null);}}>Clear</button></div><p className="muted">UPC lookup requires internet access and sends the barcode number to Open Food Facts when enabled. Uploaded photos stay local unless you choose to export or share them.</p>{lookupNotice&&<p className={lookupStatus==='notfound'?'notice':'pill'}>{lookupNotice}</p>}{lookupStatus==='notfound'&&<div className="actions"><button onClick={saveUnknownProduct}>Save as unknown product</button><a className="button file-action" href="#scanner-manual-entry">Upload label photos</a><a className="button file-action" href="#scanner-manual-entry">Manual entry</a><button onClick={()=>lookupUpc(true)}>Try again</button></div>}{lookupDraft&&<LookupReview draft={lookupDraft} setDraft={setLookupDraft} saveDraft={saveLookupDraft} createCompanyDraft={createCompanyDraftFromLookup} input={input}/>} {input('QR/manual code', scanForm.qrCode, v=>setScanForm({...scanForm, qrCode:v}))}{input('Product name', scanForm.productName, v=>setScanForm({...scanForm, productName:v}))}{input('Brand', scanForm.brand, v=>setScanForm({...scanForm, brand:v}))}{input('Company / parent company', scanForm.parentCompany, v=>setScanForm({...scanForm, parentCompany:v}))}{input('Store/location', scanForm.storeLocation, v=>setScanForm({...scanForm, storeLocation:v}))}{input('Date found', scanForm.dateFound, v=>setScanForm({...scanForm, dateFound:v}), {type:'date'})}<label>Notes<textarea value={scanForm.notes} onChange={e=>setScanForm({...scanForm, notes:e.target.value})}/></label><button className="button primary" onClick={saveScan}>Save Scan Record</button></div><div className="card"><h3>Upload Label / Product Photos</h3><p className="notice">On supported phones, Take Photo opens your camera. If your browser does not support camera capture, use Upload Photo instead. Large images can fill local device storage, so export your data regularly.</p>{photoDecodeNotice&&<p className={photoDecodeNotice.startsWith('No readable')?'notice':'pill'}>{photoDecodeNotice}</p>}<PhotoActionRow handleImages={handleImages}/><PhotoCaptureGrid handleImages={handleImages}/><PhotoPreviewGallery images={productForm.uploadedImages||[]} onRemove={removeImage}/><h3 id="scanner-manual-entry">Manual Product Entry</h3><ProductFields form={productForm} setForm={setProductForm} select={select} input={input}/><button className="button primary" onClick={()=>saveProduct()}>Save Product Record</button></div><div className="card"><h3>Upload Reports / Evidence Documents</h3><p className="muted">No server upload, OCR, or parsing is performed. Save metadata and notes only.</p>{input('File name', docForm.fileName, v=>setDocForm({...docForm,fileName:v}))}{select('Evidence type', docForm.evidenceType, v=>setDocForm({...docForm,evidenceType:v}), EVIDENCE_TYPES)}{input('Source organization', docForm.sourceOrganization, v=>setDocForm({...docForm,sourceOrganization:v}))}{input('Date', docForm.date, v=>setDocForm({...docForm,date:v}), {type:'date'})}{input('Related company', docForm.relatedCompany, v=>setDocForm({...docForm,relatedCompany:v}))}{input('Related product', docForm.relatedProduct, v=>setDocForm({...docForm,relatedProduct:v}))}<label>Summary notes<textarea value={docForm.summaryNotes} onChange={e=>setDocForm({...docForm,summaryNotes:e.target.value})}/></label>{select('Confidence level', docForm.confidenceLevel, v=>setDocForm({...docForm,confidenceLevel:v}), CONFIDENCE_LEVELS)}<button className="button primary" onClick={saveDocEvidence}>Save Evidence Metadata</button></div>{result && <ResultCard record={result} statusText={statusText(result)} evidenceCount={evidence.filter(e=>e.relatedProduct===result.productName).length}/>}</div></div></section>
    <section id="products" className="section light-section"><div className="container"><Section title="Product Records Database" eyebrow="Search first" text="Every scan, upload, and manual product entry is stored locally and can be edited or deleted with confirmation."/><Filters query={query} setQuery={setQuery} companyFilter={companyFilter} setCompanyFilter={setCompanyFilter} techFilter={techFilter} setTechFilter={setTechFilter} statusFilter={statusFilter} setStatusFilter={setStatusFilter} companies={companies} /><div className="list">{filteredProducts.map(p=><article className="record" key={p.id}><h3>{p.productName || 'Unnamed product'}</h3><p>{p.brand} · {p.parentCompany} · {p.evidenceStatus}</p><button onClick={()=>setActiveProduct(p)}>Open detail</button><button onClick={()=>{setEditingProductId(p.id); setProductForm(p); location.hash='scanner';}}>Edit</button><button className="danger" onClick={()=>confirm('Delete this product record?')&&setProducts(products.filter(x=>x.id!==p.id))}>Delete</button></article>)}</div>{activeProduct&&<ResultCard record={activeProduct} statusText={statusText(activeProduct)} evidenceCount={evidence.filter(e=>e.relatedProduct===activeProduct.productName).length} close={()=>setActiveProduct(null)}/>}</div></section>
    <section id="companies" className="section"><div className="container"><Section title="Company Database" eyebrow="Ownership mapping" text="Save companies, technology categories, evidence status, confidence, and brand ownership relationships."/><div className="grid two"><div className="card"><CompanyFields form={companyForm} setForm={setCompanyForm} input={input} select={select}/><button className="button primary" onClick={saveCompany}>Save Company</button></div><div><h3>Brand Ownership Search</h3><input placeholder="Search products, brands, or companies" value={query} onChange={e=>setQuery(e.target.value)}/>{brandMatches.map(b=><p className="pill" key={b.id}>{b.brand} → {b.companyName} ({b.relationship})</p>)}{companies.map(c=><article className="record" key={c.id}><h3>{c.companyName}</h3><p>{c.parentCompany} · {c.evidenceStatus} · {c.confidenceLevel}</p><p><b>Brands:</b> {(c.brandOwnership||[]).map(b=>`${b.brand} (${b.relationship})`).join(', ') || c.knownBrands}</p><button className="danger" onClick={()=>confirm('Delete company record?')&&setCompanies(companies.filter(x=>x.id!==c.id))}>Delete</button></article>)}</div></div></div></section>
    <section id="evidence" className="section light-section"><div className="container"><Section title="Evidence Trail System" eyebrow="Claims need sources" text="Connect evidence to a company or product without implying verification unless its status is marked verified."/><div className="card"><EvidenceFields form={evidenceForm} setForm={setEvidenceForm} input={input} select={select}/><button className="button primary" onClick={saveEvidence}>Save Evidence</button></div><div className="list">{evidence.map(e=><article className="record" key={e.id}><h3>{e.evidenceTitle}</h3><p>{e.evidenceType} · {e.evidenceStatus} · {e.confidenceLevel}</p><p>{e.summary}</p><button className="danger" onClick={()=>confirm('Delete evidence item?')&&setEvidence(evidence.filter(x=>x.id!==e.id))}>Delete</button></article>)}</div></div></section>
    <section id="data" className="section"><div className="container"><Section title="Data Import / Export" eyebrow="Local data management" text="Export regularly. Images saved as data URLs can fill local device storage."/><div className="actions"><button onClick={()=>download('brandtrace-backup.json', JSON.stringify({companies,products,evidence,scans,uploads,settings,lookupCache:readKey(STORAGE_KEYS.lookupCache,{})}, null, 2))}>Export all JSON</button><button onClick={()=>download('brandtrace-products.csv', asCsv(products), 'text/csv')}>Export products CSV</button><button onClick={()=>download('brandtrace-companies.csv', asCsv(companies), 'text/csv')}>Export companies CSV</button><button onClick={()=>download('brandtrace-evidence.csv', asCsv(evidence), 'text/csv')}>Export evidence CSV</button><label className="button secondary import">Import JSON merge<input type="file" accept="application/json" onChange={e=>e.target.files[0]&&importBackup(e.target.files[0], true)}/></label><label className="button secondary import">Import JSON overwrite<input type="file" accept="application/json" onChange={e=>e.target.files[0]&&importBackup(e.target.files[0], false)}/></label><button onClick={seedDemo}>Load demo seed data</button>{settings.demoSeeded&&<button onClick={clearDemo}>Clear demo data</button>}<button className="danger" onClick={resetAll}>Reset local BrandTrace data</button></div></div></section>

    <section id="settings" className="section light-section"><div className="container"><Section title="BrandTrace Settings" eyebrow="Lookup behavior" text="Control public UPC lookup behavior while preserving local-first storage."/><div className="card settings-grid">{[['enablePublicLookup','Enable public UPC lookup'],['preferLocalRecords','Prefer local records first'],['cacheLookupResults','Cache lookup results'],['autoCreateEvidence','Auto-create evidence from lookups'],['autoCreateCompanyDrafts','Auto-create company drafts']].map(([key,label])=><label className="check" key={key}><input type="checkbox" checked={!!settings[key]} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/><span>{label}</span></label>)}</div></div></section>
  </main><footer className="site-footer"><div className="container footer-grid"><p>Developed by Ember Fire Media</p><p>BrandTrace.fyi proprietary soft-launch MVP</p><p>Scan. Trace. Decide.</p></div></footer></>;
}


function LookupReview({ draft, setDraft, saveDraft, createCompanyDraft, input }) {
  const update = (key, value) => setDraft({ ...draft, [key]: value, dataSources: [...new Set([...(draft.dataSources || []), 'User corrected'])] });
  return <div className="lookup-review"><h3>Review UPC Lookup Draft</h3><p className="notice">BrandTrace found public product data. Review and correct it before saving. Public lookup data may be incomplete or outdated.</p><p className="muted">{draft.companyStatus === 'Matched to company database' ? 'Matched to company database. Company match is based on BrandTrace local database.' : 'Parent company not verified yet.'}</p>{draft.productImageUrl&&<img className="lookup-image" src={draft.productImageUrl} alt={draft.productName || draft.upc}/>} {input('Product name', draft.productName, v=>update('productName', v))}{input('Brand', draft.brand, v=>update('brand', v))}{input('UPC / barcode', draft.upc, v=>update('upc', v))}{input('Parent company', draft.parentCompany, v=>update('parentCompany', v))}{input('Category', draft.category, v=>update('category', v))}<label>Ingredients text<textarea value={draft.ingredientsNotes||''} onChange={e=>update('ingredientsNotes', e.target.value)}/></label><label>Nutrition notes<textarea value={draft.nutritionNotes||''} onChange={e=>update('nutritionNotes', e.target.value)}/></label>{input('Packaging / labels', draft.packagingLabels, v=>update('packagingLabels', v))}{input('Country / market', draft.countryMarket, v=>update('countryMarket', v))}{input('Source URL', draft.sourceUrl, v=>update('sourceUrl', v))}<div className="actions"><button className="button primary" onClick={saveDraft}>Save reviewed product</button>{!draft.companyId&&<button onClick={()=>createCompanyDraft(draft)}>Create Company Draft</button>}</div></div>;
}

function SourceLabel({ sourceType }) { return sourceType === 'camera' ? 'Camera' : 'Upload'; }
function PhotoButton({ label, photoType, sourceType, handleImages, multiple = false }) {
  return <label className={`button ${sourceType === 'camera' ? 'primary' : 'secondary file-action'}`}>{label}<input type="file" accept="image/*" capture={sourceType === 'camera' ? 'environment' : undefined} multiple={multiple} onClick={(e)=>{ e.currentTarget.value = ''; }} onChange={(e)=>handleImages(e.target.files, photoType, sourceType)} /></label>;
}
function PhotoActionRow({ handleImages }) {
  return <div className="upload-action-row" aria-label="Scanner upload actions"><PhotoButton label="Take Product Photo" photoType="Product Photo" sourceType="camera" handleImages={handleImages}/><PhotoButton label="Upload Product Photo" photoType="Product Photo" sourceType="uploaded" handleImages={handleImages} multiple/><a className="button secondary file-action" href="#evidence">Add Evidence Document</a><a className="button secondary file-action" href="#scanner-manual-entry">Manual Entry</a></div>;
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
function PhotoPreviewGallery({ images, onRemove }) {
  if (!images.length) return <p className="muted">No photos yet. Uploaded and camera-captured images will preview here and save with the product record.</p>;
  return <div className="previews">{images.map((img)=><figure className="preview-card" key={img.id}><img src={img.dataUrl} alt={img.name || img.type}/><figcaption><b>{img.type || 'Photo'}</b><span>Source: <SourceLabel sourceType={img.sourceType}/></span><span>Date added: {img.createdAt ? new Date(img.createdAt).toLocaleString() : 'Unknown'}</span>{onRemove&&<button className="danger" type="button" onClick={()=>onRemove(img.id)}>Remove</button>}</figcaption></figure>)}</div>;
}

function Section({ eyebrow, title, text }) { return <div className="section-header"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2>{text&&<p>{text}</p>}</div>; }
function ProductFields({ form, setForm, input, select }) { return <>{form.sourceName&&<p className="notice">Public product database result. Verify against label.</p>}{input('Product name', form.productName, v=>setForm({...form,productName:v}))}{input('Brand', form.brand, v=>setForm({...form,brand:v}))}{input('Parent company', form.parentCompany, v=>setForm({...form,parentCompany:v}))}{input('UPC / barcode', form.upc, v=>setForm({...form,upc:v}))}{input('Category', form.category, v=>setForm({...form,category:v}))}{input('Store found', form.storeLocation, v=>setForm({...form,storeLocation:v}))}{input('Product image URL', form.productImageUrl, v=>setForm({...form,productImageUrl:v}))}{input('Packaging / labels', form.packagingLabels, v=>setForm({...form,packagingLabels:v}))}{input('Date found', form.dateFound, v=>setForm({...form,dateFound:v}), {type:'date'})}{input('Country/market', form.countryMarket, v=>setForm({...form,countryMarket:v}))}<label>Ingredients notes<textarea value={form.ingredientsNotes||''} onChange={e=>setForm({...form,ingredientsNotes:e.target.value})}/></label><label>Nutrition notes<textarea value={form.nutritionNotes||''} onChange={e=>setForm({...form,nutritionNotes:e.target.value})}/></label>{select('Technology concern / claim', form.technologyCategory, v=>setForm({...form,technologyCategory:v}), TECHNOLOGY_CATEGORIES)}{select('Evidence status', form.evidenceStatus, v=>setForm({...form,evidenceStatus:v}), EVIDENCE_STATUSES)}{select('Confidence level', form.confidenceLevel, v=>setForm({...form,confidenceLevel:v}), CONFIDENCE_LEVELS)}<label>User notes<textarea value={form.userNotes||''} onChange={e=>setForm({...form,userNotes:e.target.value})}/></label></>; }
function CompanyFields({ form, setForm, input, select }) { function addBrand(){setForm({...form, brandOwnership:[...(form.brandOwnership||[]), {id:id(), brand:'', relationship:'Owned', notes:'', productIds:[]}]})} return <>{input('Company name', form.companyName, v=>setForm({...form,companyName:v}))}{input('Parent company', form.parentCompany, v=>setForm({...form,parentCompany:v}))}{input('Headquarters country/state', form.headquarters, v=>setForm({...form,headquarters:v}))}{input('Website', form.website, v=>setForm({...form,website:v}))}{input('Customer service/contact page', form.contactPage, v=>setForm({...form,contactPage:v}))}{input('Known brands', form.knownBrands, v=>setForm({...form,knownBrands:v}))}{input('Subsidiaries', form.subsidiaries, v=>setForm({...form,subsidiaries:v}))}{input('Product categories', form.productCategories, v=>setForm({...form,productCategories:v}))}<label>Technology categories used or watched<select multiple value={form.technologyCategories||[]} onChange={e=>setForm({...form,technologyCategories:Array.from(e.target.selectedOptions).map(o=>o.value)})}>{TECHNOLOGY_CATEGORIES.map(o=><option key={o}>{o}</option>)}</select></label><label>Public claims / concerns<textarea value={form.publicClaims||''} onChange={e=>setForm({...form,publicClaims:e.target.value})}/></label>{select('Evidence status', form.evidenceStatus, v=>setForm({...form,evidenceStatus:v}), EVIDENCE_STATUSES)}{select('Confidence level', form.confidenceLevel, v=>setForm({...form,confidenceLevel:v}), CONFIDENCE_LEVELS)}{input('Last reviewed date', form.lastReviewedDate, v=>setForm({...form,lastReviewedDate:v}), {type:'date'})}<label>Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label><h3>Brand Ownership</h3>{(form.brandOwnership||[]).map((b,i)=><div className="mini" key={b.id}><input placeholder="Brand" value={b.brand} onChange={e=>{const a=[...form.brandOwnership];a[i].brand=e.target.value;setForm({...form,brandOwnership:a})}}/><select value={b.relationship} onChange={e=>{const a=[...form.brandOwnership];a[i].relationship=e.target.value;setForm({...form,brandOwnership:a})}}>{OWNERSHIP_TYPES.map(o=><option key={o}>{o}</option>)}</select><input placeholder="M&A notes / linked product IDs" value={b.notes} onChange={e=>{const a=[...form.brandOwnership];a[i].notes=e.target.value;setForm({...form,brandOwnership:a})}}/></div>)}<button type="button" onClick={addBrand}>Add brand under company</button></>; }
function EvidenceFields({ form, setForm, input, select }) { return <>{input('Evidence title', form.evidenceTitle, v=>setForm({...form,evidenceTitle:v}))}{select('Evidence type', form.evidenceType, v=>setForm({...form,evidenceType:v}), EVIDENCE_TYPES)}{input('Source name', form.sourceName, v=>setForm({...form,sourceName:v}))}{input('Source URL', form.sourceUrl, v=>setForm({...form,sourceUrl:v}))}{input('Date published or found', form.date, v=>setForm({...form,date:v}), {type:'date'})}{input('Related company', form.relatedCompany, v=>setForm({...form,relatedCompany:v}))}{input('Related product', form.relatedProduct, v=>setForm({...form,relatedProduct:v}))}{input('Claim being supported', form.claim, v=>setForm({...form,claim:v}))}<label>Short summary<textarea value={form.summary||''} onChange={e=>setForm({...form,summary:e.target.value})}/></label><label>Exact quote / excerpt<textarea value={form.quote||''} onChange={e=>setForm({...form,quote:e.target.value})}/></label>{select('Evidence status', form.evidenceStatus, v=>setForm({...form,evidenceStatus:v}), EVIDENCE_STATUSES)}{select('Confidence level', form.confidenceLevel, v=>setForm({...form,confidenceLevel:v}), CONFIDENCE_LEVELS)}<label>Notes<textarea value={form.notes||''} onChange={e=>setForm({...form,notes:e.target.value})}/></label>{input('Last reviewed date', form.lastReviewedDate, v=>setForm({...form,lastReviewedDate:v}), {type:'date'})}</>; }
function Filters(p){return <div className="filters"><input placeholder="Search products, brand, UPC..." value={p.query} onChange={e=>p.setQuery(e.target.value)}/><select value={p.companyFilter} onChange={e=>p.setCompanyFilter(e.target.value)}><option value="">All companies</option>{p.companies.map(c=><option key={c.id}>{c.companyName}</option>)}</select><select value={p.techFilter} onChange={e=>p.setTechFilter(e.target.value)}><option value="">All tech categories</option>{TECHNOLOGY_CATEGORIES.map(o=><option key={o}>{o}</option>)}</select><select value={p.statusFilter} onChange={e=>p.setStatusFilter(e.target.value)}><option value="">All evidence statuses</option>{EVIDENCE_STATUSES.map(o=><option key={o}>{o}</option>)}</select></div>}
function ResultCard({ record, statusText, evidenceCount, close }) { const badges = [...new Set([...(record.dataSources || ['Manual entry']), ...(record.uploadedImages?.length ? ['Uploaded label'] : []), ...(record.linkedEvidenceIds?.length || evidenceCount ? ['Evidence attached'] : [])])]; return <article className="card result"><h3>Scanner Result</h3><div className="badges">{badges.map(b=><span className="badge" key={b}>{b}</span>)}</div><p className="notice">{statusText}</p>{record.sourceName==='Open Food Facts'&&<p className="notice">Public product database result. Verify against label.</p>}{record.companyId&&<p className="pill">Company match is based on BrandTrace local database.</p>}{record.parentCompany==='Unknown'&&<p className="notice">Parent company not verified yet.</p>}<dl><dt>Product</dt><dd>{record.productName}</dd><dt>Brand</dt><dd>{record.brand}</dd><dt>Parent company</dt><dd>{record.parentCompany}</dd><dt>UPC</dt><dd>{record.upc}</dd><dt>Technology category</dt><dd>{record.technologyCategory}</dd><dt>Evidence status</dt><dd>{record.evidenceStatus}</dd><dt>Confidence</dt><dd>{record.confidenceLevel}</dd><dt>Notes</dt><dd>{record.userNotes || record.notes}</dd><dt>Linked evidence</dt><dd>{record.linkedEvidenceIds?.length || evidenceCount || 0}</dd><dt>Uploaded images</dt><dd>{record.uploadedImages?.length || 0}</dd><dt>Last updated</dt><dd>{record.updatedAt}</dd></dl><PhotoPreviewGallery images={record.uploadedImages||[]} />{close&&<button onClick={close}>Close</button>}</article>; }
export default App;
