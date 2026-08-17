import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import {
  BarcodeFormat,
  ChecksumException,
  DecodeHintType,
  FormatException,
  NotFoundException,
} from '@zxing/library';
import { normalizeBarcodeValue, scannerErrorMessage } from '../utils/barcodeDecoder.js';

const RETAIL_FORMATS = [
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.EAN_8,
  BarcodeFormat.EAN_13,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.ITF,
  BarcodeFormat.QR_CODE,
];

function formatName(result) {
  const value = result?.getBarcodeFormat?.();
  const named = typeof value === 'number' ? BarcodeFormat[value] : value;
  return String(named || 'unknown').toLowerCase();
}

function isExpectedScanMiss(error) {
  return (
    error instanceof NotFoundException ||
    error instanceof ChecksumException ||
    error instanceof FormatException ||
    ['NotFoundException', 'ChecksumException', 'FormatException'].includes(error?.name)
  );
}

/**
 * Mobile-first continuous barcode scanner.
 * Uses ZXing's documented live video-device path. Passing no device on the first
 * scan lets ZXing request the environment/rear camera instead of accidentally
 * selecting the first enumerated device (often the selfie camera on phones).
 */
export default function BarcodeScanner({ onDetected, onClosed }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const generationRef = useRef(0);
  const closedRef = useRef(false);
  const devicesRef = useRef([]);
  const [status, setStatus] = useState('Requesting rear camera…');
  const [error, setError] = useState('');
  const [devices, setDevices] = useState([]);
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [torch, setTorch] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  function stop() {
    generationRef.current += 1;
    try {
      controlsRef.current?.stop?.();
    } catch {
      // Best-effort cleanup.
    }
    controlsRef.current = null;
    readerRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorch(false);
    setTorchSupported(false);
  }

  async function refreshDevices() {
    try {
      const cams = await BrowserMultiFormatReader.listVideoInputDevices();
      devicesRef.current = cams;
      setDevices(cams);
      return cams;
    } catch {
      devicesRef.current = [];
      setDevices([]);
      return [];
    }
  }

  async function start(deviceId) {
    stop();
    const generation = generationRef.current;
    closedRef.current = false;
    setError('');
    setStatus('Requesting rear camera…');

    try {
      if (!window.isSecureContext) throw new Error('secure context');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera unsupported');

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 500,
        tryPlayVideoTimeout: 8000,
      });
      readerRef.current = reader;

      const controls = await reader.decodeFromVideoDevice(
        deviceId || undefined,
        videoRef.current,
        (result, scanError) => {
          if (generation !== generationRef.current || closedRef.current) return;

          if (result) {
            const rawValue = result.getText();
            const format = formatName(result);
            const value = normalizeBarcodeValue(rawValue, format);
            closedRef.current = true;
            setStatus('Barcode detected.');
            stop();
            onDetected?.({
              value,
              rawValue,
              format,
              decoder: 'ZXing continuous video scanner',
            });
            return;
          }

          if (scanError && !isExpectedScanMiss(scanError)) {
            console.warn('BrandTrace scanner attempt error', scanError);
          }
        },
      );

      if (generation !== generationRef.current || closedRef.current) {
        controls?.stop?.();
        return;
      }

      controlsRef.current = controls;
      setTorchSupported(typeof controls?.switchTorch === 'function');
      setStatus('Scanning continuously… center the UPC/EAN barcode in the guide and hold steady.');

      const cams = await refreshDevices();
      if (deviceId && cams.length) {
        const activeIndex = cams.findIndex((cam) => cam.deviceId === deviceId);
        if (activeIndex >= 0) setDeviceIndex(activeIndex);
      }
    } catch (e) {
      if (generation !== generationRef.current) return;
      stop();
      setError(scannerErrorMessage(e));
      setStatus('Scanner stopped.');
    }
  }

  useEffect(() => {
    // Undefined deviceId is intentional: ZXing requests facingMode: environment.
    start(undefined);
    return () => {
      closedRef.current = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function switchCamera() {
    const cams = devicesRef.current.length ? devicesRef.current : await refreshDevices();
    if (cams.length < 2) return;
    const next = (deviceIndex + 1) % cams.length;
    setDeviceIndex(next);
    await start(cams[next].deviceId);
  }

  async function toggleTorch() {
    try {
      if (typeof controlsRef.current?.switchTorch !== 'function') throw new Error('unsupported');
      const next = !torch;
      await controlsRef.current.switchTorch(next);
      setTorch(next);
    } catch {
      setError('Flashlight is not supported by this camera.');
    }
  }

  return (
    <div className="scanner-panel">
      <p className="muted" id="camera-privacy">
        Camera frames and barcode photos are processed in this browser. BrandTrace does not send
        images to a barcode-decoding service. UPC lookup sends only the barcode number to the
        enabled public product source.
      </p>

      <div className="video-wrap">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Live barcode scanner camera preview"
        />
        <div className="scan-guide" aria-hidden="true" />
      </div>

      <p aria-live="polite" className={error ? 'notice' : 'pill'}>
        {error || status}
      </p>

      <p className="muted">
        Tip: fill most of the green box with the barcode, keep it flat, and pause briefly while the
        camera focuses. You do not need to press a shutter button for live scanning.
      </p>

      <div className="actions">
        <button
          type="button"
          onClick={() => {
            closedRef.current = true;
            stop();
            setStatus('Camera canceled.');
            onClosed?.('Camera canceled.');
          }}
        >
          Cancel Scanner
        </button>

        {devices.length > 1 && (
          <button type="button" onClick={switchCamera}>
            Switch Camera
          </button>
        )}

        {torchSupported && (
          <button type="button" onClick={toggleTorch}>
            {torch ? 'Turn Flashlight Off' : 'Turn Flashlight On'}
          </button>
        )}
      </div>
    </div>
  );
}
