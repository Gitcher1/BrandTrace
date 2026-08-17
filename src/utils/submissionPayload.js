/**
 * Builds a review-ready submission payload from local BrandTrace records.
 * Used by the future “Submit for review” flow.
 * The payload is plain JSON so it can be posted to any backend
 * (Supabase submissions table, self-hosted API, etc.) without coupling
 * the UI to a specific provider.
 */

/**
 * @param {object} options
 * @param {object[]} [options.products]
 * @param {object[]} [options.companies]
 * @param {object[]} [options.evidence]
 * @param {string} [options.claim] - short human summary of what is being claimed
 * @param {string} [options.submitterLabel] - optional display name / anonymous
 * @param {string} [options.notes]
 */
export function buildSubmissionPayload({
  products = [],
  companies = [],
  evidence = [],
  claim = '',
  submitterLabel = '',
  notes = '',
} = {}) {
  const cleanedProducts = products.map(sanitizeProduct);
  const cleanedCompanies = companies.map(sanitizeCompany);
  const cleanedEvidence = evidence.map(sanitizeEvidence);

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    claim: String(claim || '').trim() || deriveClaim(cleanedProducts, cleanedCompanies),
    submitterLabel: String(submitterLabel || '').trim() || 'anonymous',
    notes: String(notes || '').trim(),
    products: cleanedProducts,
    companies: cleanedCompanies,
    evidence: cleanedEvidence,
    // Explicitly do not include large data-URL images by default.
    // Callers can re-attach selected evidence photos if the user consents.
    imagePolicy: 'metadata-only-by-default',
  };
}

function deriveClaim(products, companies) {
  if (products[0]?.productName && products[0]?.brand) {
    return `Product ownership / identity claim for ${products[0].productName} (${products[0].brand})`;
  }
  if (companies[0]?.companyName) {
    return `Company / ownership claim for ${companies[0].companyName}`;
  }
  return 'Community submission from BrandTrace local records';
}

function sanitizeProduct(p = {}) {
  return {
    localId: p.id || null,
    productName: p.productName || '',
    brand: p.brand || '',
    parentCompany: p.parentCompany || '',
    upc: p.upc || '',
    category: p.category || '',
    countryMarket: p.countryMarket || '',
    technologyCategory: p.technologyCategory || '',
    evidenceStatus: p.evidenceStatus || 'Needs review',
    confidenceLevel: p.confidenceLevel || 'Unknown',
    dataSources: Array.isArray(p.dataSources) ? p.dataSources : [],
    sourceUrl: p.sourceUrl || '',
    userNotes: p.userNotes || '',
    // Strip bulky data URLs; keep only counts / types if present
    uploadedImageCount: Array.isArray(p.uploadedImages) ? p.uploadedImages.length : 0,
  };
}

function sanitizeCompany(c = {}) {
  return {
    localId: c.id || null,
    companyName: c.companyName || '',
    parentCompany: c.parentCompany || '',
    headquarters: c.headquarters || '',
    website: c.website || '',
    knownBrands: c.knownBrands || '',
    technologyCategories: Array.isArray(c.technologyCategories) ? c.technologyCategories : [],
    evidenceStatus: c.evidenceStatus || 'Needs review',
    confidenceLevel: c.confidenceLevel || 'Unknown',
    brandOwnership: Array.isArray(c.brandOwnership) ? c.brandOwnership : [],
    notes: c.notes || '',
  };
}

function sanitizeEvidence(e = {}) {
  return {
    localId: e.id || null,
    evidenceTitle: e.evidenceTitle || '',
    evidenceType: e.evidenceType || '',
    sourceName: e.sourceName || '',
    sourceUrl: e.sourceUrl || '',
    date: e.date || '',
    relatedCompany: e.relatedCompany || '',
    relatedProduct: e.relatedProduct || '',
    claim: e.claim || '',
    summary: e.summary || '',
    quote: e.quote || '',
    evidenceStatus: e.evidenceStatus || 'Needs review',
    confidenceLevel: e.confidenceLevel || 'Unknown',
    notes: e.notes || '',
  };
}

/**
 * Minimal helper that could later POST to Supabase or any API.
 * Currently a pure function so it stays testable and backend-agnostic.
 */
export function submissionToApiBody(payload) {
  return {
    claim: payload.claim,
    submitter_label: payload.submitterLabel,
    payload,
    status: 'community_submission',
  };
}
