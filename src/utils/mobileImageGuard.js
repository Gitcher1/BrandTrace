const INSTALL_FLAG = Symbol.for('brandtrace.mobileImageGuard');
const MIN_COMPRESS_BYTES = 850_000;
const MAX_EDGE = 1280;
const JPEG_QUALITY = 0.76;

async function drawBitmapToBlob(bitmap, sourceType) {
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  if (!width || !height) throw new Error('Image dimensions unavailable');

  const scale = Math.min(1, MAX_EDGE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

  const outputType = sourceType === 'image/png' && scale === 1 ? 'image/png' : 'image/jpeg';
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Image compression failed'))),
      outputType,
      outputType === 'image/jpeg' ? JPEG_QUALITY : undefined,
    );
  });

  bitmap.close?.();
  canvas.width = 1;
  canvas.height = 1;
  return blob;
}

async function compressWithImageBitmap(file) {
  if (typeof createImageBitmap !== 'function') return null;
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    bitmap = await createImageBitmap(file);
  }
  return drawBitmapToBlob(bitmap, file.type);
}

async function compressWithImageElement(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return await drawBitmapToBlob(img, file.type);
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function compressLargeCameraImage(file) {
  const bitmapResult = await compressWithImageBitmap(file);
  if (bitmapResult) return bitmapResult;
  return compressWithImageElement(file);
}

/**
 * BrandTrace's local-first photo flow stores image previews as data URLs.
 * Android camera photos can be many megapixels; converting the original file to
 * base64 first temporarily duplicates that large image in memory and can cause a
 * mobile browser tab to be discarded/blanked when returning from the camera.
 *
 * This narrowly wraps FileReader.readAsDataURL for large image blobs only. The
 * image is resized before base64 conversion. Text/JSON imports and smaller images
 * keep the browser's native FileReader behavior unchanged.
 */
export function installMobileImageReaderGuard() {
  if (typeof window === 'undefined' || typeof FileReader === 'undefined') return;
  if (FileReader.prototype[INSTALL_FLAG]) return;

  const nativeReadAsDataURL = FileReader.prototype.readAsDataURL;

  Object.defineProperty(FileReader.prototype, INSTALL_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false,
  });

  FileReader.prototype.readAsDataURL = function brandTraceReadAsDataURL(blob) {
    const shouldCompress =
      blob instanceof Blob &&
      String(blob.type || '').startsWith('image/') &&
      blob.size >= MIN_COMPRESS_BYTES;

    if (!shouldCompress) {
      return nativeReadAsDataURL.call(this, blob);
    }

    const reader = this;
    compressLargeCameraImage(blob)
      .then((compressed) => nativeReadAsDataURL.call(reader, compressed))
      .catch((error) => {
        console.warn('BrandTrace image pre-compression failed; using original image.', error);
        nativeReadAsDataURL.call(reader, blob);
      });

    return undefined;
  };
}
