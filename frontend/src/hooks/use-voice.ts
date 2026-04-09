"use client";

import { useCallback, useRef, useState } from "react";
import { speechToText, textToSpeech } from "@/lib/api";

export function useVoice() {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [playing, setPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch {
      throw new Error("无法访问麦克风");
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) {
        reject(new Error("未在录音"));
        return;
      }

      recorder.onstop = async () => {
        setRecording(false);
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });

        // Stop all tracks
        recorder.stream.getTracks().forEach((t) => t.stop());

        setTranscribing(true);
        try {
          const { text } = await speechToText(blob);
          resolve(text);
        } catch (e) {
          reject(e);
        } finally {
          setTranscribing(false);
        }
      };

      recorder.stop();
    });
  }, []);

  const playTTS = useCallback(async (text: string, speed?: number) => {
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
    transcribing,
    playing,
    startRecording,
    stopRecording,
    playTTS,
    stopPlaying,
  };
}
