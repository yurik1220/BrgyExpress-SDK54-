import axios from 'axios';

export interface FaceVerificationResult {
  isMatch: boolean;
  confidence: number;
  faceDetected: boolean;
  livenessPassed?: boolean;
  error?: string;
  errorType?: 'image_quality' | 'verification_failure' | 'technical_error';
}

const LUXAND_TOKEN = process.env.EXPO_PUBLIC_LUXAND_TOKEN || '';
const LUXAND_BASE = 'https://api.luxand.cloud';

async function fileOrUrlForm(field: string, value: string): Promise<FormData> {
  const fd: any = new FormData();
  if (typeof value === 'string' && value.startsWith('https://')) {
    fd.append(field, value);
  } else {
    // Assume local file URI
    fd.append(field, { uri: value, name: 'file.jpg', type: 'image/jpeg' } as any);
  }
  return fd as FormData;
}

export async function liveness(imageUri: string): Promise<{ passed: boolean; score?: number }>{
  try {
    const formData = await fileOrUrlForm('photo', imageUri);
    const res = await fetch(`${LUXAND_BASE}/photo/liveness`, {
      method: 'POST',
      headers: { token: LUXAND_TOKEN },
      body: formData,
    });
    const json: any = await res.json();
    console.log('[Luxand] liveness raw response:', JSON.stringify(json));
    const passed = !!(json && (json.status === 'success' || json.liveness === 'real' || json.result === 'pass'));
    const score = json?.score ?? json?.confidence ?? undefined;
    console.log('[Luxand] liveness parsed ->', { passed, score });
    return { passed, score };
  } catch (e) {
    console.error('[Luxand] liveness error:', e);
    return { passed: false };
  }
}

export async function similarity(face1Uri: string, face2Uri: string): Promise<{ confidence: number; ok: boolean }>{
  try {
    const fd: any = new FormData();
    // Luxand commonly expects 'photo1' and 'photo2' fields. We'll send those;
    // some deployments also accept 'face1'/'face2', so include both to be safe.
    const appendFile = (key: string, uri: string, name: string) => {
      if (uri.startsWith('https://')) {
        fd.append(key, uri);
      } else {
        fd.append(key, { uri, name, type: 'image/jpeg' } as any);
      }
    };
    appendFile('photo1', face1Uri, 'photo1.jpg');
    appendFile('photo2', face2Uri, 'photo2.jpg');
    appendFile('face1', face1Uri, 'face1.jpg');
    appendFile('face2', face2Uri, 'face2.jpg');

    const res = await fetch(`${LUXAND_BASE}/photo/similarity`, { method: 'POST', headers: { token: LUXAND_TOKEN }, body: fd });
    const json: any = await res.json();
    let raw: any = json?.similarity ?? json?.confidence ?? json?.score ?? json?.probability;
    let parsed = typeof raw === 'string' ? parseFloat(raw) : Number(raw);
    if (!isFinite(parsed)) parsed = 0;
    // Normalize 0-1 values to 0-100
    if (parsed > 0 && parsed <= 1) parsed = parsed * 100;
    // Some APIs return integer percent already; clamp 0..100
    if (parsed < 0) parsed = 0;
    if (parsed > 100) parsed = 100;
    const ok = parsed > 0 || (json && json.status === 'success');
    return { confidence: parsed, ok };
  } catch (e) {
    return { confidence: 0, ok: false };
  }
}

export async function verifyFace(idImageUri: string, selfieImageUri: string, opts: { minConfidence?: number } = {}): Promise<FaceVerificationResult> {
  const minConfidence = opts.minConfidence ?? 60;
  if (!LUXAND_TOKEN) {
    return { isMatch: false, confidence: 0, faceDetected: false, errorType: 'technical_error', error: 'Luxand token missing' };
  }
  try {
    // Similarity between ID and selfie
    const sim = await similarity(idImageUri, selfieImageUri);
    if (!sim.ok) {
      return { isMatch: false, confidence: 0, faceDetected: true, errorType: 'technical_error', error: 'Face similarity check failed. Please try again.' };
    }
    const confidence = sim.confidence;
    const isMatch = confidence >= minConfidence;
    if (!isMatch) {
      return { isMatch: false, confidence, faceDetected: true, errorType: 'verification_failure', error: `Face similarity too low (${confidence.toFixed(1)}%).` };
    }
    return { isMatch: true, confidence, faceDetected: true };
  } catch (e) {
    return { isMatch: false, confidence: 0, faceDetected: false, errorType: 'technical_error', error: 'Verification failed. Please try again.' };
  }
}

export default { verifyFace, liveness, similarity };


