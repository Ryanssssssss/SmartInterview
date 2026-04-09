"use client";

import { useCallback, useRef, useState } from "react";
import { textToSpeech } from "@/lib/api";

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
      audio.play();
    } catch {
      setPlaying(false);
    }
  }, []);

  const stopPlaying = useCallback(() => {
    audioRef.current?.pause();
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
    stopPlaying,
  };
}
