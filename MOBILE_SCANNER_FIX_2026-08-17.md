# Mobile scanner and camera-photo fix — 2026-08-17

Reported from live mobile testing:

- Camera preview opens but barcode detection is unreliable.
- Taking camera photos can return to a blank BrandTrace page.

## Fixes

1. Live scanning now uses ZXing's continuous video-stream API directly with retail barcode formats and `TRY_HARDER` enabled.
2. Rear-camera preference, camera switching, and torch controls are retained.
3. Large image files are resized before `FileReader.readAsDataURL`, reducing mobile memory pressure when returning from the native camera app.
4. JSON/text FileReader behavior is unchanged.
5. A React error boundary displays a safe reload screen instead of a blank page if an unexpected render error occurs.

## Mobile verification checklist

- Open BrandTrace on HTTPS.
- Tap Scan Product Barcode and allow camera permission.
- Fill most of the green guide with a grocery UPC/EAN and hold steady.
- Confirm detection closes the scanner and starts lookup.
- Take a Front Label photo and confirm BrandTrace returns to the scanner page with a photo preview.
- Repeat with Barcode Photo and confirm the app remains visible and responsive.
