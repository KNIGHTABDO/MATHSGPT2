import { useState, useRef, useCallback, useEffect } from 'react';
import { generateAudio } from '../services/geminiService';
import { decode, decodeAudioData } from '../utils/audioUtils';

const useAudioPlayer = () => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [audioText, setAudioText] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    // Initialize AudioContext
    if (!audioContextRef.current) {
        // Fix for webkitAudioContext for cross-browser compatibility.
        const CrossBrowserAudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new CrossBrowserAudioContext();
    }
    
    // Cleanup on unmount
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  const play = useCallback(async () => {
    if (!audioText || isLoading) return;

    if (audioBufferRef.current) {
        // Play from buffer if already fetched
        const source = audioContextRef.current!.createBufferSource();
        source.buffer = audioBufferRef.current;
        source.connect(audioContextRef.current!.destination);
        source.onended = () => setIsPlaying(false);
        source.start(0);
        audioSourceRef.current = source;
        setIsPlaying(true);
    } else {
        // Fetch, decode, and play
        setIsLoading(true);
        try {
            const base64Audio = await generateAudio(audioText);
            const decodedBytes = decode(base64Audio);
            const audioBuffer = await decodeAudioData(decodedBytes, audioContextRef.current!, 24000, 1);
            
            audioBufferRef.current = audioBuffer;

            const source = audioContextRef.current!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContextRef.current!.destination);
            source.onended = () => setIsPlaying(false);
            source.start(0);
            
            audioSourceRef.current = source;
            setIsPlaying(true);
        } catch (error) {
            console.error("Failed to play audio:", error);
        } finally {
            setIsLoading(false);
        }
    }
  }, [audioText, isLoading]);

  const pause = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
      setIsPlaying(false);
    }
  }, []);

  const handleSetAudioText = useCallback((text: string) => {
    pause(); // Stop any current playback
    audioBufferRef.current = null; // Clear buffer for new text
    setAudioText(text);
  }, [pause]);


  return { isPlaying, isLoading, play, pause, setAudioText: handleSetAudioText };
};

export default useAudioPlayer;