// Ratil Quran AI — on-device Quran-specific speech recognition.
// Audio is processed in this browser. Only model/library files are downloaded on first use.
(() => {
  const MODEL_ID = "Mustanad/whisper-base-ar-quran-onnx";
  const TRANSFORMERS_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
  const MODEL_DOWNLOAD_NOTE = "التنزيل الأول للنموذج يقارب 106 ميجابايت. بعد التخزين المؤقت يعالج رتّل الصوت على جهازك دون رفع التلاوة إلى خادم.";
  let transcriber = null;
  let loadingPromise = null;
  let mediaStream = null;
  let audioContext = null;
  let inputNode = null;
  let processorNode = null;
  let muteNode = null;
  let activeSession = 0;
  let queue = Promise.resolve();
  let isStarting = false;
  let isCapturing = false;
  let speechStarted = false;
  let silenceMs = 0;
  let segmentParts = [];
  let segmentSamples = 0;
  let preRoll = [];

  const el = id => document.getElementById(id);
  function status(message, error = false) {
    const box = el("msg");
    if (!box) return;
    box.textContent = message;
    box.className = error ? "err" : "";
  }

  async function loadModel() {
    if (transcriber) return transcriber;
    if (!loadingPromise) {
      status("جارٍ تحميل نموذج التعرّف القرآني لأول مرة. " + MODEL_DOWNLOAD_NOTE);
      loadingPromise = import(TRANSFORMERS_URL).then(({ pipeline, env }) => {
        env.allowLocalModels = false;
        env.useBrowserCache = true;
        return pipeline(
          "automatic-speech-recognition",
          MODEL_ID,
          {
            device: "wasm",
            dtype: "q8",
            progress_callback: info => {
              if (info && info.status === "progress" && Number.isFinite(info.progress)) {
                const pct = Math.max(0, Math.min(100, Math.round(info.progress)));
                status("تحميل نموذج التلاوة القرآنية: " + pct + "% — " + MODEL_DOWNLOAD_NOTE);
              }
            }
          }
        );
      }).then(pipe => {
        transcriber = pipe;
        status("تم تجهيز نموذج التلاوة القرآنية على جهازك. ابدأ القراءة.");
        return pipe;
      }).catch(error => {
        loadingPromise = null;
        throw error;
      });
    }
    return loadingPromise;
  }

  function concat(parts, total) {
    const out = new Float32Array(total);
    let offset = 0;
    for (const part of parts) {
      out.set(part, offset);
      offset += part.length;
    }
    return out;
  }

  function resample(input, fromRate, toRate) {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const length = Math.max(1, Math.floor(input.length / ratio));
    const output = new Float32Array(length);
    for (let i = 0; i < length; i++) {
      const at = i * ratio;
      const left = Math.floor(at);
      const right = Math.min(left + 1, input.length - 1);
      const frac = at - left;
      output[i] = input[left] * (1 - frac) + input[right] * frac;
    }
    return output;
  }

  function sendTranscript(text, session) {
    const transcript = String(text || "").trim();
    if (!transcript || session !== activeSession) return;
    const live = el("live");
    if (live) live.textContent = transcript;
    // Feed the Quran-specific transcript into the existing word-by-word aligner.
    if (window.memOn && window.memAttemptActive && typeof window.memHandleCandidates === "function") {
      window.memHandleCandidates([transcript]);
    } else if (!window.memOn && typeof window.alignBest === "function") {
      window.alignBest([transcript.split(/\\s+/).map(token => token.replace(/[^\\u0621-\\u064A\\u0671]/g, "")).filter(Boolean)]);
    }
  }

  function enqueueSegment(parts, total, sampleRate, session) {
    if (!parts.length || !total) return;
    const raw = concat(parts, total);
    const pcm = resample(raw, sampleRate, 16000);
    if (pcm.length < 16000 * 0.65) return;

    queue = queue.then(async () => {
      if (session !== activeSession) return;
      try {
        status("يحلل رتّل التلاوة محليًا ويطابق الكلمات مع الآية...");
        const model = await loadModel();
        const result = await model(pcm);
        if (session !== activeSession) return;
        const transcript = result && typeof result.text === "string" ? result.text : "";
        if (transcript.trim()) {
          sendTranscript(transcript, session);
          status("تم تحليل المقطع ومقارنة الكلمات. أكمل القراءة أو أوقف الميكروفون.");
        }
      } catch (error) {
        console.error("Ratil Quran ASR error:", error);
        status("تعذّر تحليل هذا المقطع. أعد المحاولة في مكان هادئ وتأكد من اكتمال تنزيل النموذج.", true);
      }
    });
  }

  function flushSegment(session) {
    if (!speechStarted || !segmentParts.length) {
      segmentParts = [];
      segmentSamples = 0;
      speechStarted = false;
      silenceMs = 0;
      return;
    }
    const parts = segmentParts;
    const total = segmentSamples;
    const rate = audioContext ? audioContext.sampleRate : 48000;
    segmentParts = [];
    segmentSamples = 0;
    speechStarted = false;
    silenceMs = 0;
    enqueueSegment(parts, total, rate, session);
  }

  function captureBlock(samples, session) {
    if (!isCapturing || session !== activeSession) return;
    const copy = new Float32Array(samples);
    let power = 0;
    for (let i = 0; i < copy.length; i++) power += copy[i] * copy[i];
    const rms = Math.sqrt(power / Math.max(1, copy.length));
    const blockMs = copy.length / audioContext.sampleRate * 1000;
    const speaking = rms > 0.009;

    if (!speechStarted) {
      preRoll.push(copy);
      if (preRoll.length > 3) preRoll.shift();
      if (speaking) {
        speechStarted = true;
        segmentParts = preRoll.slice();
        segmentSamples = segmentParts.reduce((sum, part) => sum + part.length, 0);
        preRoll = [];
        silenceMs = 0;
      }
    } else {
      segmentParts.push(copy);
      segmentSamples += copy.length;
      if (speaking) silenceMs = 0;
      else silenceMs += blockMs;

      if (silenceMs >= 950 || segmentSamples >= audioContext.sampleRate * 26) {
        flushSegment(session);
        preRoll = [];
      }
    }
  }

  async function start() {
    if (isStarting || isCapturing) return;
    isStarting = true;
    const session = ++activeSession;
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("يحتاج الميكروفون إلى متصفح حديث واتصال HTTPS.");
      }
      status("اطلب إذن الميكروفون، ثم يجري تجهيز نموذج التلاوة القرآني. " + MODEL_DOWNLOAD_NOTE);
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      if (session !== activeSession) return;
      await loadModel();
      if (session !== activeSession) return;

      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) throw new Error("المتصفح لا يدعم تحليل الصوت المطلوب.");
      audioContext = new AudioCtx();
      await audioContext.resume();
      inputNode = audioContext.createMediaStreamSource(mediaStream);
      processorNode = audioContext.createScriptProcessor(4096, 1, 1);
      muteNode = audioContext.createGain();
      muteNode.gain.value = 0;
      processorNode.onaudioprocess = event => captureBlock(event.inputBuffer.getChannelData(0), session);
      inputNode.connect(processorNode);
      processorNode.connect(muteNode);
      muteNode.connect(audioContext.destination);
      isCapturing = true;
      status("الميكروفون يعمل. اقرأ بوضوح، وسيتعرف رتّل على المقاطع بعد الوقفات القصيرة.");
    } catch (error) {
      console.error("Ratil Quran AI start error:", error);
      stop();
      throw error;
    } finally {
      isStarting = false;
    }
  }

  function stop() {
    const session = activeSession;
    isCapturing = false;
    if (speechStarted && segmentParts.length) flushSegment(session);
    if (processorNode) {
      processorNode.onaudioprocess = null;
      try { processorNode.disconnect(); } catch (_) {}
    }
    if (inputNode) { try { inputNode.disconnect(); } catch (_) {} }
    if (muteNode) { try { muteNode.disconnect(); } catch (_) {} }
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    if (audioContext) {
      try { audioContext.close(); } catch (_) {}
    }
    processorNode = inputNode = muteNode = mediaStream = audioContext = null;
    preRoll = [];
    speechStarted = false;
    segmentParts = [];
    segmentSamples = 0;
    silenceMs = 0;
  }

  window.RatilQuranAI = { start, stop, modelName: MODEL_ID };
})();