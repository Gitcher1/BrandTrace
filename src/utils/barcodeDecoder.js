
const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];
function bitsFromRow(ctx, y, width) {
  const data = ctx.getImageData(0, y, width, 1).data;
  const gray = [];
  for (let x = 0; x < width; x++) gray.push((data[x*4] + data[x*4+1] + data[x*4+2]) / 3);
  const min = Math.min(...gray), max = Math.max(...gray), threshold = (min + max) / 2;
  const raw = gray.map((v) => v < threshold ? 1 : 0);
  let first = raw.findIndex(Boolean), last = raw.length - 1 - [...raw].reverse().findIndex(Boolean);
  if (first < 0 || last <= first) return '';
  const modules = 95, moduleWidth = (last - first + 1) / modules;
  let bits = '';
  for (let i = 0; i < modules; i++) {
    const a = Math.max(0, Math.round(first + i * moduleWidth));
    const b = Math.min(width, Math.round(first + (i + 1) * moduleWidth));
    let sum = 0; for (let x = a; x < b; x++) sum += raw[x];
    bits += sum >= (b - a) / 2 ? '1' : '0';
  }
  return bits;
}
function decodeEanBits(bits) {
  if (!bits.startsWith('101') || bits.slice(45,50) !== '01010' || bits.slice(92) !== '101') return null;
  let left='', parity='';
  for (let i=0;i<6;i++){ const part=bits.slice(3+i*7,10+i*7); let d=L.indexOf(part); if(d>=0){left+=d; parity+='L'; continue;} d=G.indexOf(part); if(d>=0){left+=d; parity+='G'; continue;} return null; }
  let right=''; for (let i=0;i<6;i++){ const d=R.indexOf(bits.slice(50+i*7,57+i*7)); if(d<0) return null; right+=d; }
  const first = PARITY.indexOf(parity); if (first < 0) return null;
  const ean = `${first}${left}${right}`;
  const sum = ean.slice(0,12).split('').reduce((a,n,i)=>a+Number(n)*(i%2?3:1),0);
  return (10 - (sum % 10)) % 10 === Number(ean[12]) ? ean : null;
}
async function localLinearFallback(source) {
  const canvas = document.createElement('canvas');
  const w = source.videoWidth || source.naturalWidth || source.width, h = source.videoHeight || source.naturalHeight || source.height;
  if (!w || !h) return null;
  canvas.width = Math.min(900, w); canvas.height = Math.max(1, Math.round(h * canvas.width / w));
  const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  for (const y of [0.42,0.5,0.58].map((v)=>Math.round(canvas.height*v))) {
    const decoded = decodeEanBits(bitsFromRow(ctx, y, canvas.width));
    if (decoded) return { rawValue: decoded.startsWith('0') ? decoded.slice(1) : decoded, format: decoded.startsWith('0') ? 'upc_a' : 'ean_13', decoder: 'local EAN/UPC canvas fallback' };
  }
  return null;
}

export const RETAIL_FORMATS = ['upc_a', 'upc_e', 'ean_8', 'ean_13'];
export const SUPPORTED_FORMATS = [...RETAIL_FORMATS, 'code_128', 'code_39', 'itf', 'qr_code'];
export function normalizeBarcodeValue(raw, format = '') {
  const value = String(raw || '').trim();
  const digits = value.replace(/\D/g, '');
  const retail = RETAIL_FORMATS.includes(String(format).toLowerCase()) || /^[0-9]{8,14}$/.test(value);
  if (retail && [8, 12, 13, 14].includes(digits.length)) return digits;
  const qrMatch = value.match(/(?:^|\D)(\d{8}|\d{12}|\d{13}|\d{14})(?:\D|$)/);
  return qrMatch ? qrMatch[1] : value;
}
export function isLookupBarcode(raw, format = '') {
  const value = normalizeBarcodeValue(raw, format);
  return /^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(value);
}
export async function getNativeDetector() {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null;
  try {
    const available = await window.BarcodeDetector.getSupportedFormats?.();
    const formats = available?.length ? SUPPORTED_FORMATS.filter((f) => available.includes(f)) : SUPPORTED_FORMATS;
    if (!formats.length) return null;
    return new window.BarcodeDetector({ formats });
  } catch { return null; }
}
async function getFallbackReader() {
  try {
    const mod = await import(/* @vite-ignore */ '@zxing/browser');
    return new mod.BrowserMultiFormatReader();
  } catch { return null; }
}
export async function detectBarcodeFromSource(source) {
  const native = await getNativeDetector();
  if (native) {
    const found = await native.detect(source);
    if (found?.[0]) return { rawValue: found[0].rawValue, format: found[0].format || 'unknown', decoder: 'native BarcodeDetector' };
    return null;
  }
  const local = await localLinearFallback(source);
  if (local) return local;
  const reader = await getFallbackReader();
  if (!reader) throw new Error('Barcode decoder unavailable. This browser does not expose BarcodeDetector and the bundled ZXing fallback could not load.');
  try {
    const result = await reader.decodeFromImageElement(source);
    return { rawValue: result.getText(), format: String(result.getBarcodeFormat?.() || 'unknown').toLowerCase(), decoder: 'ZXing browser fallback' };
  } catch { return null; }
}
export async function detectBarcodeFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return await detectBarcodeFromSource(img);
  } finally { URL.revokeObjectURL(url); }
}
export function scannerErrorMessage(error) {
  const name = error?.name || '';
  const text = String(error?.message || error || '');
  if (!window.isSecureContext) return 'Secure HTTPS context required. Camera access works only on HTTPS or localhost; manual entry and photo upload still work.';
  if (!navigator.mediaDevices?.getUserMedia) return 'Browser camera API unsupported. Enter the UPC manually or upload a barcode photo.';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'Camera permission denied. You can still enter the UPC manually or upload a barcode photo.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'No camera available. Use manual UPC entry or upload a barcode photo.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'Camera already in use or unavailable. Close other camera apps, then try again.';
  if (/decoder unavailable/i.test(text)) return text;
  if (/timeout/i.test(text)) return 'Scanner timeout. Try improving lighting, holding the barcode flat, or enter the UPC manually.';
  return 'Barcode not detected. Try moving closer, improving lighting, keeping the barcode flat, or enter the UPC manually.';
}
