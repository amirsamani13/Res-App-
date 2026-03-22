import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CalendarEvent, Reservation } from '../types';
import { askBusinessAnalyst, fastChat, upsertEventTool, deleteEventTool, createReservationTool, updateReservationTool } from '../services/geminiService';
import { Send, Bot, BrainCircuit, Mic, MicOff, X } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, arrayBufferToBase64 } from '../services/audioUtils';

interface ChatAssistantProps {
    events: CalendarEvent[];
    reservations: Reservation[];
    onEventUpdate: (event: Partial<CalendarEvent>) => string;
    onEventDelete: (date: string, titleKeyword?: string) => void;
    onReservationCreate: (res: Partial<Reservation>) => string;
    onReservationUpdate: (id: string, updates: Partial<Reservation>) => void;
    onClose?: () => void;
}

interface Message {
    id: string;
    role: 'user' | 'model';
    text: string;
    isThinking?: boolean;
}

const ChatAssistant: React.FC<ChatAssistantProps> = ({ 
    events, 
    reservations,
    onEventUpdate,
    onEventDelete,
    onReservationCreate,
    onReservationUpdate,
    onClose
}) => {
    const [messages, setMessages] = useState<Message[]>([
        { id: '1', role: 'model', text: 'Hello! I can help you analyze your schedule, reservations, or answer quick questions.' }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [useThinking, setUseThinking] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);

    const [isVoiceActive, setIsVoiceActive] = useState(false);
    const [voiceStatus, setVoiceStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
    const [volumeLevel, setVolumeLevel] = useState(0);

    const onEventUpdateRef = useRef(onEventUpdate);
    const onEventDeleteRef = useRef(onEventDelete);
    const onReservationCreateRef = useRef(onReservationCreate);
    const onReservationUpdateRef = useRef(onReservationUpdate);
    
    useEffect(() => {
        onEventUpdateRef.current = onEventUpdate;
        onEventDeleteRef.current = onEventDelete;
        onReservationCreateRef.current = onReservationCreate;
        onReservationUpdateRef.current = onReservationUpdate;
    }, [onEventUpdate, onEventDelete, onReservationCreate, onReservationUpdate]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const outputContextRef = useRef<AudioContext | null>(null);
    const sessionRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const nextStartTimeRef = useRef<number>(0);
    const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;
        const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsLoading(true);

        try {
            let responseText = '';
            if (useThinking) {
                const history = messages.map(m => `${m.role}: ${m.text}`);
                responseText = await askBusinessAnalyst(history, userMsg.text, events, reservations);
            } else {
                responseText = await fastChat(`Context: You are a restaurant calendar and reservation assistant. User asks: ${userMsg.text}`);
            }
            setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'model', text: responseText, isThinking: useThinking }]);
        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'model', text: 'Sorry, I encountered an error processing your request.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    const cleanupVoice = useCallback(() => {
        if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
        if (processorRef.current) processorRef.current.disconnect();
        if (inputSourceRef.current) inputSourceRef.current.disconnect();
        if (audioContextRef.current) audioContextRef.current.close();
        if (outputContextRef.current) outputContextRef.current.close();
        setVoiceStatus('disconnected');
        setIsVoiceActive(false);
        setVolumeLevel(0);
    }, []);

    const connectToGeminiLive = async () => {
        setVoiceStatus('connecting');
        try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
          outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          streamRef.current = stream;
    
          const config = {
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: `You are RestoSync Assistant. Respond concisely.`,
                tools: [{ functionDeclarations: [upsertEventTool, deleteEventTool, createReservationTool, updateReservationTool] }]
            }
          };
    
          const sessionPromise = ai.live.connect({
            ...config,
            callbacks: {
              onopen: () => {
                setVoiceStatus('connected');
                if (!audioContextRef.current) return;
                const source = audioContextRef.current.createMediaStreamSource(stream);
                const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
                processor.onaudioprocess = (e) => {
                  const inputData = e.inputBuffer.getChannelData(0);
                  let sum = 0;
                  for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
                  setVolumeLevel(Math.sqrt(sum / inputData.length) * 100);
                  const int16 = new Int16Array(inputData.length);
                  for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                  const b64 = arrayBufferToBase64(int16.buffer);
                  sessionPromise.then(session => session.sendRealtimeInput({ media: { mimeType: 'audio/pcm;rate=16000', data: b64 } }));
                };
                source.connect(processor);
                processor.connect(audioContextRef.current.destination);
                inputSourceRef.current = source;
                processorRef.current = processor;
              },
              onmessage: async (msg: LiveServerMessage) => {
                if (msg.toolCall) {
                    for (const fc of msg.toolCall.functionCalls) {
                        let result = "Done.";
                        if (fc.name === 'upsertEvent') result = onEventUpdateRef.current(fc.args as any);
                        else if (fc.name === 'deleteEvent') onEventDeleteRef.current(fc.args.date as string, fc.args.titleKeyword as string);
                        else if (fc.name === 'createReservation') result = onReservationCreateRef.current(fc.args as any);
                        sessionPromise.then(session => session.sendToolResponse({ functionResponses: { id: fc.id, name: fc.name, response: { result: result } } }));
                    }
                }
                const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
                if (audioData && outputContextRef.current) {
                    const ctx = outputContextRef.current;
                    const bytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
                    if (nextStartTimeRef.current < ctx.currentTime) nextStartTimeRef.current = ctx.currentTime;
                    const audioBuffer = await decodeAudioData(bytes, ctx, 24000);
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    source.connect(ctx.destination);
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    sourcesRef.current.add(source);
                    source.onended = () => sourcesRef.current.delete(source);
                }
              },
              onclose: () => cleanupVoice(),
              onerror: () => cleanupVoice()
            }
          });
          sessionRef.current = sessionPromise;
        } catch (error) {
          console.error(error);
          cleanupVoice();
        }
      };

    const toggleVoice = () => isVoiceActive ? cleanupVoice() : (setIsVoiceActive(true), connectToGeminiLive());

    return (
        <div className={`
            bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col
            fixed inset-0 z-[60] md:static md:z-0 md:h-full md:w-80 transition-all duration-300
        `}>
            <div className="p-4 border-b border-slate-700 bg-slate-800 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <Bot className="text-indigo-400" />
                    <h3 className="font-semibold text-white">AI Assistant</h3>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setUseThinking(!useThinking)}
                        className={`p-1.5 rounded-lg transition-all ${useThinking ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-700 text-slate-400'}`}
                    >
                        <BrainCircuit size={18} />
                    </button>
                    <button 
                        onClick={onClose}
                        className="md:hidden p-1.5 rounded-lg bg-slate-700 text-slate-400"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/50">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-sm ${
                            msg.role === 'user' 
                            ? 'bg-indigo-600 text-white rounded-tr-none' 
                            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700 shadow-sm'
                        }`}>
                            {msg.isThinking && <div className="text-[10px] text-indigo-300 mb-1 font-bold">THINKING</div>}
                            {msg.text}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none animate-pulse">
                            <div className="flex gap-1"><div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div><div className="w-1.5 h-1.5 bg-slate-500 rounded-full"></div></div>
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700 shrink-0">
                <div className="flex gap-2 mb-2">
                    {isVoiceActive && (
                        <div className="flex-1 bg-indigo-900/20 border border-indigo-500/30 rounded px-3 py-1 flex items-center gap-2">
                            <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
                            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Live Voice: {voiceStatus}</span>
                        </div>
                    )}
                </div>
                <div className="flex gap-2">
                    <input 
                        className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-1 focus:ring-indigo-500 outline-none"
                        placeholder="Type message..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button onClick={toggleVoice} className={`p-2 rounded-lg transition-colors ${isVoiceActive ? 'bg-rose-600' : 'bg-slate-700'}`}>
                        {isVoiceActive ? <Mic className="text-white" size={18} /> : <MicOff className="text-slate-400" size={18} />}
                    </button>
                    <button onClick={handleSend} disabled={isLoading} className="bg-indigo-600 p-2 rounded-lg text-white">
                        <Send size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChatAssistant;