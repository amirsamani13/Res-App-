import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Mic, MicOff, Volume2, Wifi, WifiOff } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { decodeAudioData, arrayBufferToBase64 } from '../services/audioUtils';
import { upsertEventTool, deleteEventTool, createReservationTool, updateReservationTool } from '../services/geminiService';
import { CalendarEvent, Reservation } from '../types';

interface VoiceControlProps {
  onEventUpdate: (event: Partial<CalendarEvent>) => string; // Returns ID
  onEventDelete: (date: string, titleKeyword?: string) => void;
  onReservationCreate: (res: Partial<Reservation>) => string;
  onReservationUpdate: (id: string, updates: Partial<Reservation>) => void;
  events: CalendarEvent[];
  reservations: Reservation[];
}

const VoiceControl: React.FC<VoiceControlProps> = ({ 
  onEventUpdate, 
  onEventDelete, 
  onReservationCreate,
  onReservationUpdate,
  events,
  reservations
}) => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [volumeLevel, setVolumeLevel] = useState(0);

  // Use Refs for callbacks to prevent stale closures
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

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const outputContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());

  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
    }
    if (inputSourceRef.current) {
      inputSourceRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (outputContextRef.current) {
      outputContextRef.current.close();
    }
    setStatus('disconnected');
    setIsActive(false);
    setVolumeLevel(0);
  }, []);

  const connectToGemini = async () => {
    setStatus('connecting');
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Initialize Audio Contexts
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Build context string from current events
      const eventContextStr = events.map(e => 
          `Event ID: ${e.id} | ${e.date} | ${e.title} | ${e.startTime}`
      ).join('\n');
      
      const resContextStr = reservations.map(r => 
          `Res ID: ${r.id} | ${r.date} ${r.time} | ${r.customerName} | Size: ${r.size} | Status: ${r.status}`
      ).join('\n');

      const config = {
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `You are RestoSync, a comprehensive restaurant manager assistant.
            Current Date: ${new Date().toDateString()}.
            
            TASKS:
            1. Manage Calendar Events (Special nights, bands, etc).
            2. Manage Table Reservations (Bookings, cancellations, changes).

            Current Schedule:
            ${eventContextStr || "No events."}

            Current Reservations:
            ${resContextStr || "No reservations."}
            
            RULES FOR RESERVATIONS:
            - Always ask for customer name, party size, and time if missing.
            - **CONFLICT CHECK**: Before creating a reservation, check the "Current Reservations" list provided above.
            - If there are already 2 or more reservations at the requested time, warn the user that the restaurant is busy.
            - Suggest the nearest available time slot (e.g., 30 minutes before or after) based on the schedule.
            
            Speak briefly and professionally.`,
            tools: [{ functionDeclarations: [upsertEventTool, deleteEventTool, createReservationTool, updateReservationTool] }]
        }
      };

      const sessionPromise = ai.live.connect({
        ...config,
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setStatus('connected');
            
            if (!audioContextRef.current) return;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            inputSourceRef.current = source;
            
            const processor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            processorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              
              let sum = 0;
              for(let i=0; i<inputData.length; i++) sum += inputData[i] * inputData[i];
              setVolumeLevel(Math.sqrt(sum / inputData.length) * 100);

              const l = inputData.length;
              const int16 = new Int16Array(l);
              for (let i = 0; i < l; i++) {
                int16[i] = inputData[i] * 32768;
              }
              
              const b64 = arrayBufferToBase64(int16.buffer);

              sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'audio/pcm;rate=16000',
                        data: b64
                    }
                });
              });
            };

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            // Handle Tool Calls
            if (msg.toolCall) {
                console.log("Tool Call Received:", msg.toolCall);
                for (const fc of msg.toolCall.functionCalls) {
                    let result = "Done.";
                    
                    if (fc.name === 'upsertEvent') {
                        const eventId = onEventUpdateRef.current(fc.args as any);
                        result = `Event processed. ID: ${eventId}.`;
                    } 
                    else if (fc.name === 'deleteEvent') {
                        onEventDeleteRef.current(fc.args.date as string, fc.args.titleKeyword as string);
                        result = `Events deleted.`;
                    }
                    else if (fc.name === 'createReservation') {
                        const resId = onReservationCreateRef.current(fc.args as any);
                        result = `Reservation created. ID: ${resId}.`;
                    }
                    else if (fc.name === 'updateReservation') {
                        // Handle name lookup if ID is missing (fallback logic handled in tool call if needed, but better to support here)
                        // For now we assume the tool call has the ID or we rely on the component using this to handle it
                        let { id, lookupName, ...updates } = fc.args as any;

                        if (!id && lookupName) {
                            // Try to find reservation by name
                            const found = reservations.find(r => r.customerName.toLowerCase().includes(lookupName.toLowerCase()));
                            if (found) {
                                id = found.id;
                            }
                        }

                        if (id) {
                             onReservationUpdateRef.current(id, updates);
                             result = `Reservation updated.`;
                        } else {
                             result = `Error: Could not find reservation to update.`;
                        }
                    }
                    
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: {
                                id: fc.id,
                                name: fc.name,
                                response: { result: result }
                            }
                        });
                    });
                }
            }

            // Handle Audio Output
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData && outputContextRef.current) {
                const ctx = outputContextRef.current;
                const bytes = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
                
                const currentTime = ctx.currentTime;
                if (nextStartTimeRef.current < currentTime) {
                    nextStartTimeRef.current = currentTime;
                }

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
          onclose: () => {
            console.log("Gemini Live Closed");
            setStatus('disconnected');
            setIsActive(false);
          },
          onerror: (e) => {
            console.error("Gemini Live Error", e);
            setStatus('disconnected');
            setIsActive(false);
          }
        }
      });
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to connect", error);
      setStatus('disconnected');
      setIsActive(false);
    }
  };

  const toggleSession = () => {
    if (isActive) {
      cleanup();
    } else {
      setIsActive(true);
      connectToGemini();
    }
  };

  return (
    <div className={`fixed bottom-6 left-20 z-50 flex items-center gap-4 p-4 rounded-full shadow-2xl transition-all duration-300 ${isActive ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'}`}>
      
      {isActive && (
        <div className="flex items-center gap-2 mr-2">
            <div className="flex gap-1 h-4 items-center">
                {[1,2,3].map(i => (
                    <div key={i} className="w-1 bg-white rounded-full transition-all duration-75" style={{ height: `${Math.max(4, volumeLevel * i * 0.5)}px` }}></div>
                ))}
            </div>
            <span className="text-xs font-semibold text-white uppercase tracking-wider animate-pulse">
                {status === 'connecting' ? 'Connecting...' : 'Listening'}
            </span>
        </div>
      )}

      <button 
        onClick={toggleSession}
        className="flex items-center justify-center text-white focus:outline-none"
      >
        {isActive ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default VoiceControl;