let workerPromise = null;
let worker = null;
let activeJob = null;
export function isOcrWorkerCreated(){ return !!workerPromise; }
export async function getOcrWorker(onProgress = () => {}) {
  if (worker) return worker;
  if (!workerPromise) {
    workerPromise = (async () => {
      let mod;
      try { mod = await import(/* @vite-ignore */ 'tesseract.js'); }
      catch { mod = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.esm.min.js'); }
      const created = await mod.createWorker('eng', 1, { logger: (m)=>onProgress(m) });
      worker = created; return created;
    })().catch((error)=>{ workerPromise=null; worker=null; throw new Error(`OCR engine failed to load: ${error?.message || error}`); });
  }
  return workerPromise;
}
export async function terminateOcrWorker(){ const w=worker || await workerPromise?.catch(()=>null); worker=null; workerPromise=null; activeJob=null; if(w?.terminate) await w.terminate(); }
export function cancelActiveOcr(){ activeJob?.cancel?.(); activeJob={ canceled:true }; return activeJob; }
export async function prepareImageForOcr(dataUrl, options={}) {
  if (!/^data:image\//.test(String(dataUrl||''))) throw new Error('Unsupported image format. Upload a browser-readable image file.');
  const img = new Image(); img.decoding='async'; img.src=dataUrl; await img.decode();
  if (img.naturalWidth < 120 || img.naturalHeight < 80) throw new Error('Image is too small for reliable OCR. Retake a closer label photo.');
  if (!options.enhanced && !options.rotate) return dataUrl;
  const canvas=document.createElement('canvas'); const rotate=((options.rotate||0)%360+360)%360; const swap=rotate===90||rotate===270; canvas.width=swap?img.naturalHeight:img.naturalWidth; canvas.height=swap?img.naturalWidth:img.naturalHeight; const ctx=canvas.getContext('2d',{willReadFrequently:true}); ctx.translate(canvas.width/2,canvas.height/2); ctx.rotate(rotate*Math.PI/180); ctx.drawImage(img,-img.naturalWidth/2,-img.naturalHeight/2);
  if(options.grayscale||options.contrast||options.threshold){ const data=ctx.getImageData(0,0,canvas.width,canvas.height); for(let i=0;i<data.data.length;i+=4){ let g=.299*data.data[i]+.587*data.data[i+1]+.114*data.data[i+2]; if(options.contrast) g=Math.max(0,Math.min(255,(g-128)*1.35+128)); if(options.threshold) g=g>150?255:0; data.data[i]=data.data[i+1]=data.data[i+2]=g; } ctx.putImageData(data,0,0); }
  const out=canvas.toDataURL('image/jpeg',.92); canvas.width=1; canvas.height=1; return out;
}
export async function recognizeLabelImage(dataUrl, { onProgress=()=>{}, enhancement={} } = {}) {
  const job={ canceled:false, cancel(){ this.canceled=true; } }; activeJob=job; onProgress({ status:'loading OCR engine', progress:0 }); const w=await getOcrWorker(onProgress); if(job.canceled) throw new DOMException('OCR canceled','AbortError'); onProgress({ status:'preparing image', progress:.05 }); const prepared=await prepareImageForOcr(dataUrl, enhancement); if(job.canceled) throw new DOMException('OCR canceled','AbortError'); onProgress({ status:'recognizing text', progress:.1 }); const result=await w.recognize(prepared); if(job.canceled) throw new DOMException('OCR canceled','AbortError'); activeJob=null; const data=result?.data || {}; if(!String(data.text||'').trim()) throw new Error('No readable text detected. Manual entry and the saved photo are still available.'); return { rawText:data.text, confidence:data.confidence, language:'eng', imageEnhancementUsed:Object.keys(enhancement).filter(k=>enhancement[k]).join(', ') || 'original' };
}
