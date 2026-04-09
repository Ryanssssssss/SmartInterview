"use client";

import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useVoice } from "@/hooks/use-voice";

interface VoiceRecorderProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceRecorder({ onTranscript, disabled }: VoiceRecorderProps) {
  const { recording, transcribing, startRecording, stopRecording } = useVoice();

  const handleToggle = async () => {
    if (recording) {
      try {
        const text = await stopRecording();
        if (text) onTranscript(text);
      } catch {
        // ignore
      }
    } else {
      try {
        await startRecording();
      } catch {
        // ignore
      }
    }
  };

  return (
    <Button
      variant={recording ? "destructive" : "outline"}
      size="icon"
      onClick={handleToggle}
      disabled={disabled || transcribing}
      className="shrink-0"
      title={recording ? "停止录音" : "语音输入"}
    >
      {transcribing ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : recording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}
