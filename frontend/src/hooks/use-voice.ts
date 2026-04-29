"use client";

import { useCallback, useRef, useState } from "react";
import { textToSpeech, streamTTS } from "@/lib/api";

const ASR_WS_URL = "ws://localhost:8000/api/voice/asr";
const TARGET_SAMPLE_RATE = 16000;

function downsampleBuffer(
  buffer: Float32Array,
  inputRate: number,
  outputRate: number
): Int16Array {
  if (inputRate === outputRate) {
    const result = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return result;
  }
  const ratio = inputRate / outputRate;
  const newLength = Math.round(buffer.length / ratio);
  const result = new Int16Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const idx = Math.round(i * ratio);
    const s = Math.max(-1, Math.min(1, buffer[idx]));
    result[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return result;
}

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalText, setFinalText] = useState("");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sentencesRef = useRef<string[]>([]);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    sentencesRef.current = [];
    setTranscript("");
    setFinalText("");

    const ws = new WebSocket(ASR_WS_URL);
    wsRef.current = ws;

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "partial") {
          setTranscript(sentencesRef.current.join("") + msg.text);
        } else if (msg.type === "final") {
          sentencesRef.current.push(msg.text);
          const full = sentencesRef.current.join("");
          setTranscript(full);
          setFinalText(full);
        }
      } catch { /* ignore */ }
    };

    ws.onerror = () => {};
    ws.onclose = () => {};

    await new Promise<void>((resolve) => {
      ws.onopen = () => resolve();
    });

    const audioCtx = new AudioContext({ sampleRate: 48000 });
    audioCtxRef.current = audioCtx;
    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      if (ws.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = downsampleBuffer(inputData, audioCtx.sampleRate, TARGET_SAMPLE_RATE);
      ws.send(pcm16.buffer);
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);

    setRecording(true);
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    processorRef.current?.disconnect();
    sourceRef.current?.disconnect();
    audioCtxRef.current?.close();
    streamRef.current?.getTracks().forEach((t) => t.stop());

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
    wsRef.current = null;

    setRecording(false);
    const result = sentencesRef.current.join("");
    return result;
  }, []);

  // ── 流式播放相关 Ref ──
  const playCtxRef = useRef<AudioContext | null>(null);
  const playNextTimeRef = useRef(0);
  const playSessionIdRef = useRef(0); // 递增 ID，用于废弃旧的流式回调

  const playTTS = useCallback(async (text: string, speed?: number) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      const oldSrc = audioRef.current.src;
      audioRef.current = null;
      if (oldSrc) URL.revokeObjectURL(oldSrc);
    }

    setPlaying(true);
    try {
      const buffer = await textToSpeech(text, speed);
      const blob = new Blob([buffer], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;
      audio.playbackRate = speed ?? 1.0;
      audio.onended = () => {
        setPlaying(false);
        URL.revokeObjectURL(url);
        if (audioRef.current === audio) audioRef.current = null;
      };
      audio.play().catch(() => {
        // 浏览器自动播放策略拒绝，静默处理
        setPlaying(false);
      });
    } catch {
      setPlaying(false);
    }
  }, []);

  /**
   * 流式 TTS 播放：通过 SSE 逐 chunk 接收 PCM float32，
   * 用 AudioContext 排队播放（AudioBufferSourceNode），实现边收边播。
   */
  const playTTSStream = useCallback(async (text: string) => {
    // 1. 彻底停掉上一次播放
    if (playCtxRef.current) {
      try { playCtxRef.current.close(); } catch {}
      playCtxRef.current = null;
    }

    // 2. 递增 session ID，让旧的回调自动失效
    const currentSession = ++playSessionIdRef.current;

    setPlaying(true);

    let ctx: AudioContext | null = null;
    playNextTimeRef.current = 0;

    try {
      await streamTTS(
        text,
        // onChunk
        (pcmFloat32, sampleRate) => {
          // 如果 session 已过期，丢弃这个 chunk
          if (currentSession !== playSessionIdRef.current) return;

          if (!ctx) {
            ctx = new AudioContext({ sampleRate });
            playCtxRef.current = ctx;
            if (ctx.state === "suspended") {
              ctx.resume().catch(() => {});
            }
            playNextTimeRef.current = ctx.currentTime + 0.05;
          }

          const audioBuffer = ctx.createBuffer(1, pcmFloat32.length, sampleRate);
          audioBuffer.getChannelData(0).set(pcmFloat32);

          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);

          const startAt = Math.max(playNextTimeRef.current, ctx.currentTime);
          source.start(startAt);
          playNextTimeRef.current = startAt + audioBuffer.duration;
        },
        // onDone
        () => {
          if (currentSession !== playSessionIdRef.current) return;
          if (ctx) {
            const remaining = Math.max(0, playNextTimeRef.current - ctx.currentTime);
            setTimeout(() => {
              if (currentSession !== playSessionIdRef.current) return;
              setPlaying(false);
              if (playCtxRef.current === ctx) {
                playCtxRef.current.close().catch(() => {});
                playCtxRef.current = null;
              }
            }, remaining * 1000 + 100);
          } else {
            setPlaying(false);
          }
        },
        // onError
        (msg) => {
          if (currentSession !== playSessionIdRef.current) return;
          console.error("流式 TTS 错误:", msg);
          setPlaying(false);
          if (playCtxRef.current === ctx) {
            playCtxRef.current?.close().catch(() => {});
            playCtxRef.current = null;
          }
        },
      );
    } catch {
      if (currentSession === playSessionIdRef.current) {
        setPlaying(false);
      }
    }
  }, []);

  const stopPlaying = useCallback(() => {
    // 停止非流式播放
    audioRef.current?.pause();
    // 停止流式播放：递增 session ID 废弃所有旧回调
    playSessionIdRef.current++;
    if (playCtxRef.current) {
      try { playCtxRef.current.close(); } catch {}
      playCtxRef.current = null;
    }
    setPlaying(false);
  }, []);

  return {
    recording,
    transcribing: false,
    playing,
    transcript,
    finalText,
    startRecording,
    stopRecording,
    playTTS,
    playTTSStream,
    stopPlaying,
  };
}
