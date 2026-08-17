/**
 * Public UPC / barcode product lookup via Open Food Facts.
 *
 * - Free, no API key required
 * - Only the barcode number is sent (never images)
 * - Designed for browser use; degrades gracefully on network failure
 *
 * Open Food Facts asks apps to identify themselves. Browsers control the
 * User-Agent header, so we also pass a clear app identifier via query string
 * and Accept headers where allowed.
 */

const OFF_PRODUCT_URL = (barcode) =>
  `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json` +
  `?fields=code,product_name,generic_name,brands,brands_tags,categories,categories_tags,` +
  `ingredients_text,nutriments,nutrition_grades,nutrition_grade_fr,image_url,image_front_url,` +
  `packaging,labels,countries,countries_tags,url` +
  `&app_name=BrandTrace&app_version=0.1&app_source=brandtrace.fyi`;

/**
 * Normalize a raw Open Food Facts product object into BrandTrace draft fields.
 */
export function normalizeOffProduct(product, barcode) {
  const brands = String(product.brands || product.brands_tags?.join(', ') || '')
    .split(',')
    .map((b) => b.trim())
    .filter(Boolean);
  const categories = product.categories || product.categories_tags?.join(', ') || '';
  const labels = [product.packaging, product.labels].filter(Boolean).join(' | ');
  const countries = product.countries || product.countries_tags?.join(', ') || '';
  const name = product.product_name || product.generic_name || '';
  const sourceUrl = product.url || `https://world.openfoodfacts.org/product/${barcode}`;
  const nutriments = product.nutriments || {};
  const nutritionNotes = [
    product.nutrition_grade_fr && `Nutrition grade: ${product.nutrition_grade_fr}`,
    nutriments.energy_kcal_100g && `Energy: ${nutriments.energy_kcal_100g} kcal/100g`,
    nutriments.fat_100g && `Fat: ${nutriments.fat_100g}g/100g`,
    nutriments.sugars_100g && `Sugars: ${nutriments.sugars_100g}g/100g`,
    nutriments.salt_100g && `Salt: ${nutriments.salt_100g}g/100g`,
  ]
    .filter(Boolean)
    .join('; ');

  return {
    productName: name,
    brand: brands[0] || '',
    upc: barcode,
    category: categories,
    ingredientsNotes: product.ingredients_text || '',
    nutritionNotes,
    productImageUrl: product.image_url || product.image_front_url || '',
    packagingLabels: labels,
    countryMarket: countries,
    sourceName: 'Open Food Facts',
    sourceUrl,
    lookupDate: new Date().toISOString().slice(0, 10),
    rawLookupSourceName: 'Open Food Facts API v2',
  };
}

/**
 * Fetch product data for a barcode from Open Food Facts.
 *
 * @param {string} barcode - digits only preferred
 * @param {{ signal?: AbortSignal }} [options]
 * @returns {Promise<{ found: boolean, barcode: string, normalized: object|null, rawStatus: string, error?: string }>}
 */
export async function fetchOpenFoodFactsProduct(barcode, options = {}) {
  const clean = String(barcode || '').replace(/\D/g, '');
  if (!/^\d{8}$|^\d{12}$|^\d{13}$|^\d{14}$/.test(clean)) {
    return {
      found: false,
      barcode: clean,
      normalized: null,
      rawStatus: 'invalid_barcode',
      error: 'Barcode must be 8, 12, 13, or 14 digits for public product lookup.',
    };
  }

  try {
    const res = await fetch(OFF_PRODUCT_URL(clean), {
      method: 'GET',
      signal: options.signal,
      headers: {
        Accept: 'application/json',
      },
      // mode: 'cors' is default for cross-origin; OFF returns Access-Control-Allow-Origin: *
    });

    if (!res.ok) {
      return {
        found: false,
        barcode: clean,
        normalized: null,
        rawStatus: `http_${res.status}`,
        error:
          res.status === 429
            ? 'Open Food Facts rate limit reached. Wait a moment and try again, or enter the product manually.'
            : `Open Food Facts returned HTTP ${res.status}. You can still save the barcode locally and enter details manually.`,
      };
    }

    const data = await res.json();

    if (data.status !== 1 || !data.product) {
      return {
        found: false,
        barcode: clean,
        normalized: null,
        rawStatus: data.status_verbose || 'not_found',
        error: 'No public Open Food Facts record was found for this barcode.',
      };
    }

    return {
      found: true,
      barcode: clean,
      normalized: normalizeOffProduct(data.product, clean),
      rawStatus: 'found',
    };
  } catch (err) {
    const message = String(err?.message || err || '');
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    return {
      found: false,
      barcode: clean,
      normalized: null,
      rawStatus: 'network_error',
      error: offline
        ? 'You appear to be offline. Barcode is saved locally; try lookup again when online.'
        : /Failed to fetch|NetworkError|Load failed/i.test(message)
          ? 'Network error reaching Open Food Facts. Check connection or try again. Manual entry still works.'
          : `Lookup failed: ${message}. Manual entry still works.`,
    };
  }
}
