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
 * ZXing owns the live stream/scan loop instead of BrandTrace sampling individual frames.
 * This is substantially more reliable for UPC/EAN scanning on Android/iOS browsers.
 */
export default function BarcodeScanner({ onDetected, onClosed }) {
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const readerRef = useRef(null);
  const generationRef = useRef(0);
  const closedRef = useRef(false);
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
      // Best-effort cleanup; also stop any stream still attached to the video element below.
    }
    controlsRef.current = null;
    readerRef.current = null;
    const stream = videoRef.current?.srcObject;
    stream?.getTracks?.().forEach((track) => track.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setTorch(false);
    setTorchSupported(false);
  }

  async function start(index = deviceIndex) {
    stop();
    const generation = generationRef.current;
    closedRef.current = false;
    setError('');
    setStatus('Requesting rear camera…');

    try {
      if (!window.isSecureContext) throw new Error('secure context');
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('camera unsupported');

      let cams = [];
      try {
        cams = await BrowserMultiFormatReader.listVideoInputDevices();
      } catch {
        cams = [];
      }
      if (generation !== generationRef.current) return;
      setDevices(cams);

      const safeIndex = cams.length ? Math.min(index, cams.length - 1) : 0;
      const selectedDeviceId = cams[safeIndex]?.deviceId;
      setDeviceIndex(safeIndex);

      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, RETAIL_FORMATS);
      hints.set(DecodeHintType.TRY_HARDER, true);

      const reader = new BrowserMultiFormatReader(hints, {
        delayBetweenScanAttempts: 120,
        delayBetweenScanSuccess: 500,
        tryPlayVideoTimeout: 8000,
      });
      readerRef.current = reader;

      const videoConstraints = selectedDeviceId
        ? {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          }
        : {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          };

      const controls = await reader.decodeFromConstraints(
        { audio: false, video: videoConstraints },
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
        }
      );

      if (generation !== generationRef.current || closedRef.current) {
        controls?.stop?.();
        return;
      }

      controlsRef.current = controls;
      setTorchSupported(typeof controls?.switchTorch === 'function');
      setStatus('Scanning continuously… center the UPC/EAN barcode in the guide and hold steady.');
    } catch (e) {
      if (generation !== generationRef.current) return;
      stop();
      setError(scannerErrorMessage(e));
      setStatus('Scanner stopped.');
    }
  }

  useEffect(() => {
    start(0);
    return () => {
      closedRef.current = true;
      stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        camera focuses.
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
          <button
            type="button"
            onClick={() => {
              const next = (deviceIndex + 1) % devices.length;
              start(next);
            }}
          >
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
