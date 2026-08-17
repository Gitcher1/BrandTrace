import { defineConfig } from 'vite';

/**
 * Safety transform for the current soft-launch App.jsx photo control.
 *
 * The camera <input type="file"> was absolutely positioned but its camera label
 * did not have a positioned wrapper, allowing the invisible input to cover nearby
 * controls on mobile and steal taps from the live scanner. The async change
 * handler also referenced React's currentTarget after awaiting image processing.
 *
 * Keep this transform narrow and fail the build if the expected source no longer
 * exists so a future App.jsx refactor cannot silently reintroduce the problem.
 */
function mobilePhotoInputFix() {
  return {
    name: 'brandtrace-mobile-photo-input-fix',
    enforce: 'pre',
    transform(code, id) {
      if (!id.endsWith('/src/App.jsx')) return null;

      const pattern = /function PhotoButton\(\{ label, photoType, sourceType, handleImages, multiple = false \}\) \{\s*return <label className=\{`button \$\{sourceType === 'camera' \? 'primary' : 'secondary file-action'\}`\}>\{label\}<input type=\"file\" accept=\"image\/\*\" capture=\{sourceType === 'camera' \? 'environment' : undefined\} multiple=\{multiple\} onClick=\{\(e\)=>\{ e\.currentTarget\.value = ''; \}\} onChange=\{async \(e\)=>\{ await handleImages\(e\.target\.files, photoType, sourceType\); e\.currentTarget\.value = ''; \}\} \/><\/label>;\s*\}/;

      const replacement = `function PhotoButton({ label, photoType, sourceType, handleImages, multiple = false }) {
  return <label className={\`button file-action \${sourceType === 'camera' ? 'primary' : 'secondary'}\`}>{label}<input type="file" accept="image/*" capture={sourceType === 'camera' ? 'environment' : undefined} multiple={multiple} onClick={(e)=>{ e.currentTarget.value = ''; }} onChange={async (e)=>{ const input = e.currentTarget; const files = input.files; input.value = ''; await handleImages(files, photoType, sourceType); }} /></label>;
}`;

      if (!pattern.test(code)) {
        throw new Error('BrandTrace mobile photo-input safety transform could not find PhotoButton source. Update vite.config.js with App.jsx.');
      }

      return { code: code.replace(pattern, replacement), map: null };
    },
  };
}

export default defineConfig({
  plugins: [mobilePhotoInputFix()],
});
