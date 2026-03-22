import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, arrayBufferToBase64 } from '../services/audioUtils';
import { presentBookingReviewTool, updateReservationTool } from '../services/geminiService';
import { Reservation } from '../types';

interface CustomerVoiceWidgetProps {
  onReservationCreate: (res: Partial<Reservation>) => string;
  onReservationUpdate: (id: string, updates: Partial<Reservation>) => void;
  onReviewReservation?: (res: Partial<Reservation>) => void;
  reservations?: Reservation[];
}

const CustomerVoiceWidget: React.FC<CustomerVoiceWidgetProps> = ({ 
    onReservationCreate, 
    onReservationUpdate,
    onReviewReservation,
    reservations = []
}) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'speaking'>('disconnected');
  const [volumeLevel, setVolumeLevel] = useState(0);

  const onReservationCreateRef = useRef(onReservationCreate);
  const onReservationUpdateRef = useRef(onReservationUpdate);
  const onReviewReservationRef = useRef(onReviewReservation);
  const lastReservationIdRef = useRef<string | null>(null);

  useEffect(() => {
    onReservationCreateRef.current = onReservationCreate;
    onReservationUpdateRef.current = onReservationUpdate;
    onReviewReservationRef.current = onReviewReservation;
  }, [onReservationCreate, onReservationUpdate, onReviewReservation]);

  // Audio Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(() => {
    if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    if (processorRef.current) processorRef.current.disconnect();
    if (inputSourceRef.current) inputSourceRef.current.disconnect();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputContextRef.current) outputContextRef.current.close();
    setStatus('disconnected');
    setIsActive(false);
    setVolumeLevel(0);
    lastReservationIdRef.current = null;
  }, []);

  const connect = async () => {
    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Prepare schedule context for smart suggestions
      const today = new Date().toISOString().split('T')[0];
      const resContext = reservations
        .filter(r => r.date >= today && r.status !== 'cancelled')
        .map(r => `${r.date} ${r.time}: ${r.size} ppl`)
        .join('\n');

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            // Persona: Friendly Hostess
            systemInstruction: `You are 'Bella', the warm and welcoming hostess at RestoSync Bistro.
            Your goal is to help customers find a table.
            
            CURRENT RESERVATIONS ON FILE (For checking availability):
            ${resContext || "No reservations yet."}

            CRITICAL PROTOCOL:
            1. Greet them warmly.
            2. Collect Name, Date, Time, and Party Size.
            3. BUSY CHECK: If >2 bookings exist at the same time, suggest an alternative.
            4. **IMMEDIATE ACTION**: As soon as you have the 4 details, CALL 'presentBookingReview'.
               - **DO NOT ASK** "Is this correct?".
               - **DO NOT ASK** "Shall I confirm?".
               - **DO NOT SAY** "I will show you the form".
               - **DO NOT WAIT** for the user to say yes.
               - JUST CALL THE TOOL.
               - Say: "I've put the details on screen. Please add your email and hit confirm."
            
            If the user changes anything (e.g. "Actually make it 7:30"), CALL 'presentBookingReview' AGAIN immediately with the new data.`,
            tools: [{ functionDeclarations: [presentBookingReviewTool, updateReservationTool] }]
        }
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            setStatus('connected');
            if (!audioContextRef.current) return;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            
            processor.onaudioprocess = (e) => {
              const input = e.inputBuffer.getChannelData(0);
              // Simple volume meter
              let sum = 0;
              for(let i=0; i<input.length; i++) sum += input[i] * input[i];
              setVolumeLevel(Math.sqrt(sum / input.length) * 100);

              // PCM Conversion
              const int16 = new Int16Array(input.length);
              for (let i = 0; i < input.length; i++) int16[i] = input[i] * 32768;
              const b64 = arrayBufferToBase64(int16.buffer);

              sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: { mimeType: 'audio/pcm;rate=16000', data: b64 }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
            
            inputSourceRef.current = source;
            processorRef.current = processor;
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Tool Calls
            if (msg.toolCall) {
                console.log("Tool Call Triggered:", msg.toolCall);
                for (const fc of msg.toolCall.functionCalls) {
                    if (fc.name === 'presentBookingReview') {
                        console.log("Presenting Review Form with args:", fc.args);
                        // Call the review callback instead of create
                        if (onReviewReservationRef.current) {
                            onReviewReservationRef.current(fc.args as any);
                        }
                        
                        sessionPromise.then(session => {
                            session.sendToolResponse({
                                functionResponses: {
                                    id: fc.id,
                                    name: fc.name,
                                    response: { result: `Form displayed to user. Waiting for manual email entry and confirmation.` }
                                }
                            });
                        });
                    }
                    else if (fc.name === 'updateReservation') {
                        // Keep update logic in case they are modifying an existing ID (less likely in new flow but safe to keep)
                        let { id, ...updates } = fc.args as any;
                        
                        if ((!id || id === 'CURRENT' || id.length < 5) && lastReservationIdRef.current) {
                            id = lastReservationIdRef.current;
                        }

                        if (id) {
                            onReservationUpdateRef.current(id, updates);
                            sessionPromise.then(session => {
                                session.sendToolResponse({
                                    functionResponses: {
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: `Success. Reservation ${id} updated.` }
                                    }
                                });
                            });
                        } else {
                             sessionPromise.then(session => {
                                session.sendToolResponse({
                                    functionResponses: {
                                        id: fc.id,
                                        name: fc.name,
                                        response: { result: `Error: Missing ID.` }
                                    }
                                });
                            });
                        }
                    }
                }
            }

            // Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputContextRef.current) {
                setStatus('speaking');
                const ctx = outputContextRef.current;
                const bytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
                
                if (nextStartTimeRef.current < ctx.currentTime) nextStartTimeRef.current = ctx.currentTime;

                const audioBuffer = await decodeAudioData(bytes, ctx, 24000);
                const source = ctx.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(ctx.destination);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += audioBuffer.duration;
                
                source.onended = () => {
                     sourcesRef.current.delete(source);
                     if (sourcesRef.current.size === 0) setStatus('connected');
                };
                sourcesRef.current.add(source);
            }
          },
          onclose: () => cleanup(),
          onerror: (e) => {
              console.error(e);
              cleanup();
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error(error);
      cleanup();
    }
  };

  const toggle = () => isActive ? cleanup() : (setIsActive(true), connect());

  return (
    <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end gap-2">
       {/* Chat Bubble */}
       {isActive && (
           <div className="bg-white text-slate-900 px-4 py-2 rounded-t-2xl rounded-bl-2xl shadow-xl mb-2 text-sm font-medium animate-in slide-in-from-bottom-5 fade-in duration-300 max-w-[200px]">
               {status === 'connecting' ? 'Connecting to Bella...' : 
                status === 'speaking' ? 'Bella is speaking...' :
                'Bella is listening...'}
           </div>
       )}
       
       {/* Button */}
       <button 
         onClick={toggle}
         className={`relative group flex items-center justify-center w-16 h-16 rounded-full shadow-2xl transition-all duration-300 ${
             isActive ? 'bg-rose-500 hover:bg-rose-600 scale-110' : 'bg-slate-900 hover:bg-slate-800'
         }`}
       >
         {/* Ripple Effect */}
         {isActive && (
             <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-75"></span>
         )}
         
         {isActive ? (
             <div className="relative">
                 <Mic className="text-white w-6 h-6" />
                 {/* Volume visualizer */}
                 <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5 h-1 items-end">
                    {[1,2,3].map(i => (
                        <div key={i} className="w-0.5 bg-white/80 rounded-full transition-all" style={{ height: `${Math.max(2, volumeLevel * i * 0.4)}px` }} />
                    ))}
                 </div>
             </div>
         ) : (
             <div className="relative">
                <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-400 animate-pulse" />
                <MicOff className="text-white w-6 h-6" />
             </div>
         )}
       </button>
    </div>
  );
};

export default CustomerVoiceWidget;