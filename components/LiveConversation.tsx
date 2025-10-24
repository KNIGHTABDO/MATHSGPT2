import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality, LiveSession } from '@google/genai';
import { encode, decode, decodeAudioData, createBlob } from '../utils/audioUtils';
import type { TranscriptionEntry } from '../types';
import Button from './ui/Button';
import Card from './ui/Card';
import { MicrophoneIcon } from './icons/MicrophoneIcon';
import { StopIcon } from './icons/StopIcon';
import Spinner from './ui/Spinner';


const LiveConversation: React.FC = () => {
    const [isConnecting, setIsConnecting] = useState(false);
    const [isActive, setIsActive] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [transcriptions, setTranscriptions] = useState<TranscriptionEntry[]>([]);

    const sessionPromiseRef = useRef<Promise<LiveSession> | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    
    const currentInputTranscriptionRef = useRef('');
    const currentOutputTranscriptionRef = useRef('');


    const stopConversation = useCallback(() => {
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => session.close());
            sessionPromiseRef.current = null;
        }

        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
            mediaStreamRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        
        if (outputAudioContextRef.current) {
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
        }
        
        scriptProcessorRef.current?.disconnect();
        scriptProcessorRef.current = null;

        audioSourcesRef.current.forEach(source => source.stop());
        audioSourcesRef.current.clear();

        setIsActive(false);
        setIsConnecting(false);
    }, []);

    const startConversation = async () => {
        setIsConnecting(true);
        setError(null);
        setTranscriptions([]);
        currentInputTranscriptionRef.current = '';
        currentOutputTranscriptionRef.current = '';

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;

            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            
            // Fix for webkitAudioContext for cross-browser compatibility.
            const CrossBrowserAudioContext = window.AudioContext || (window as any).webkitAudioContext;
            outputAudioContextRef.current = new CrossBrowserAudioContext({ sampleRate: 24000 });
            nextStartTimeRef.current = 0;

            const sessionPromise = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                },
                callbacks: {
                    onopen: () => {
                        setIsConnecting(false);
                        setIsActive(true);
                        audioContextRef.current = new CrossBrowserAudioContext({ sampleRate: 16000 });
                        const source = audioContextRef.current.createMediaStreamSource(stream);
                        const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessor.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const pcmBlob = createBlob(inputData);
                            sessionPromiseRef.current?.then((session) => {
                                session.sendRealtimeInput({ media: pcmBlob });
                            });
                        };
                        
                        source.connect(scriptProcessor);
                        scriptProcessor.connect(audioContextRef.current.destination);
                        scriptProcessorRef.current = scriptProcessor;
                    },
                    onmessage: async (message: LiveServerMessage) => {
                        if (message.serverContent?.inputTranscription) {
                            currentInputTranscriptionRef.current += message.serverContent.inputTranscription.text;
                        }
                        if (message.serverContent?.outputTranscription) {
                            currentOutputTranscriptionRef.current += message.serverContent.outputTranscription.text;
                        }
                        if (message.serverContent?.turnComplete) {
                            const userInput = currentInputTranscriptionRef.current.trim();
                            const modelOutput = currentOutputTranscriptionRef.current.trim();
                            
                            setTranscriptions(prev => {
                                const newHistory = [...prev];
                                if (userInput) newHistory.push({ speaker: 'user', text: userInput });
                                if (modelOutput) newHistory.push({ speaker: 'model', text: modelOutput });
                                return newHistory;
                            });

                            currentInputTranscriptionRef.current = '';
                            currentOutputTranscriptionRef.current = '';
                        }

                        const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
                        if (base64Audio && outputAudioContextRef.current) {
                             const outputCtx = outputAudioContextRef.current;
                             nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputCtx.currentTime);
                             const audioBuffer = await decodeAudioData(decode(base64Audio), outputCtx, 24000, 1);
                             const source = outputCtx.createBufferSource();
                             source.buffer = audioBuffer;
                             source.connect(outputCtx.destination);
                             source.addEventListener('ended', () => {
                                 audioSourcesRef.current.delete(source);
                             });
                             source.start(nextStartTimeRef.current);
                             nextStartTimeRef.current += audioBuffer.duration;
                             audioSourcesRef.current.add(source);
                        }
                    },
                    onerror: (e) => {
                        console.error('Live API Error:', e);
                        setError('A connection error occurred.');
                        stopConversation();
                    },
                    onclose: () => {
                        stopConversation();
                    },
                },
            });

            sessionPromiseRef.current = sessionPromise;

        } catch (err) {
            console.error(err);
            setError('Failed to start conversation. Please check microphone permissions.');
            setIsConnecting(false);
        }
    };
    
    useEffect(() => {
        return () => {
            stopConversation();
        };
    }, [stopConversation]);

    return (
        <Card>
            <div className="flex flex-col items-center space-y-4">
                <p className="text-gray-400 text-center">Have a real-time conversation with Gemini. Start by clicking the button below.</p>
                {!isActive && (
                    <Button onClick={startConversation} disabled={isConnecting}>
                        {isConnecting ? <Spinner /> : <MicrophoneIcon />}
                        {isConnecting ? 'Connecting...' : 'Start Conversation'}
                    </Button>
                )}
                {isActive && (
                    <Button onClick={stopConversation} variant="danger">
                        <StopIcon />
                        Stop Conversation
                    </Button>
                )}
                {error && <p className="text-red-400">{error}</p>}
                
                <div className="w-full h-80 bg-gray-900 rounded-lg p-4 overflow-y-auto space-y-4">
                    {transcriptions.length === 0 && !isActive && (
                        <p className="text-gray-500 text-center mt-4">Transcription will appear here...</p>
                    )}
                    {transcriptions.map((entry, index) => (
                        <div key={index} className={`flex ${entry.speaker === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${entry.speaker === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-100'}`}>
                                <p className="text-sm">{entry.text}</p>
                            </div>
                        </div>
                    ))}
                     {isActive && transcriptions.length === 0 && (
                        <div className="flex justify-center items-center h-full">
                            <div className="flex items-center space-x-2 text-gray-400">
                               <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                               <span>Listening...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
};

export default LiveConversation;