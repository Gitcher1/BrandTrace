import { useEffect, useRef, useState } from 'react';
import { detectBarcodeFromSource, normalizeBarcodeValue, scannerErrorMessage } from '../utils/barcodeDecoder.js';

export default function BarcodeScanner({ onDetected, onClosed }) {
  const videoRef = useRef(null); const streamRef = useRef(null); const seenRef = useRef('');
  const [status, setStatus] = useState('Requesting rear camera…'); const [error, setError] = useState(''); const [devices, setDevices] = useState([]); const [deviceIndex, setDeviceIndex] = useState(0); const [torch, setTorch] = useState(false); const [torchSupported, setTorchSupported] = useState(false);
  function stop() { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
  async function start(index = deviceIndex) {
    stop(); setError(''); seenRef.current = '';
    try {
      if (!window.isSecureContext) throw new Error('secure context');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera unsupported');
      const all = await navigator.mediaDevices.enumerateDevices?.() || [];
      const cams = all.filter((d) => d.kind === 'videoinput'); setDevices(cams);
      const constraints = cams[index]?.deviceId ? { video: { deviceId: { exact: cams[index].deviceId } } } : { video: { facingMode: { ideal: 'environment' } } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints); streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      const track = stream.getVideoTracks()[0]; setTorchSupported(!!track?.getCapabilities?.().torch); setStatus('Scanning… center the UPC/EAN barcode in the guide.');
      loop();
    } catch (e) { stop(); setError(scannerErrorMessage(e)); setStatus('Scanner stopped.'); }
  }
  async function loop() {
    const started = Date.now();
    while (streamRef.current && Date.now() - started < 45000) {
      await new Promise((r) => setTimeout(r, 450));
      if (!videoRef.current || videoRef.current.readyState < 2) continue;
      try {
        const result = await detectBarcodeFromSource(videoRef.current);
        if (!result?.rawValue) continue;
        const value = normalizeBarcodeValue(result.rawValue, result.format);
        const key = `${result.format}:${value}`;
        if (key === seenRef.current) continue;
        seenRef.current = key; stop(); setStatus('Barcode detected.'); onDetected({ value, rawValue: result.rawValue, format: result.format, decoder: result.decoder }); return;
      } catch (e) { stop(); setError(scannerErrorMessage(e)); return; }
    }
    if (streamRef.current) { stop(); setError(scannerErrorMessage(new Error('timeout'))); setStatus('Scanner timeout.'); }
  }
  useEffect(() => { start(0); return stop; }, []);
  async function toggleTorch() { const track = streamRef.current?.getVideoTracks()[0]; try { await track?.applyConstraints({ advanced: [{ torch: !torch }] }); setTorch(!torch); } catch { setError('Flashlight is not supported by this camera.'); } }
  return <div className="scanner-panel"><p className="muted" id="camera-privacy">Camera frames and barcode photos are processed in this browser. BrandTrace does not send images to a barcode-decoding service. UPC lookup sends only the barcode number to the enabled public product source.</p><div className="video-wrap"><video ref={videoRef} playsInline muted aria-label="Live barcode scanner camera preview"/><div className="scan-guide" aria-hidden="true"/></div><p aria-live="polite" className={error ? 'notice' : 'pill'}>{error || status}</p><div className="actions"><button type="button" onClick={() => { stop(); setStatus('Camera canceled.'); onClosed?.('Camera canceled.'); }}>Cancel Scanner</button>{devices.length > 1 && <button type="button" onClick={() => { const next = (deviceIndex + 1) % devices.length; setDeviceIndex(next); start(next); }}>Switch Camera</button>}{torchSupported && <button type="button" onClick={toggleTorch}>{torch ? 'Turn Flashlight Off' : 'Turn Flashlight On'}</button>}</div></div>;
}
