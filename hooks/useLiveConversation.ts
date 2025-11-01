
import { useState, useRef, useCallback } from 'react';
// FIX: Removed unused and non-exported 'LiveSession' type.
import { GoogleGenAI, Modality } from '@google/genai';
import { PoblacionData, Transcript, LiveStatus } from '../types';

// --- Audio Helper Functions (self-contained to avoid extra files) ---

function encode(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  // FIX: Corrected typo from 'dataInt116' to 'dataInt16'.
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}


export const useLiveConversation = (
    poblacionData: PoblacionData[],
    onNewTranscript: (transcript: Omit<Transcript, 'id'>) => void,
) => {
    const [status, setStatus] = useState<LiveStatus>(LiveStatus.IDLE);

    // FIX: Changed type from 'Promise<LiveSession>' to 'Promise<any>' as 'LiveSession' is not exported.
    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const mediaStreamSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
    
    const nextAudioTimeRef = useRef(0);
    const audioQueueRef = useRef<Set<AudioBufferSourceNode>>(new Set());

    const currentInputTranscriptRef = useRef('');
    const currentOutputTranscriptRef = useRef('');

    const stopSession = useCallback(() => {
        console.log("Intentando detener la sesión...");
        if (sessionPromiseRef.current) {
            sessionPromiseRef.current.then(session => {
                session.close();
                console.log("Sesión cerrada.");
            });
            sessionPromiseRef.current = null;
        }

        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            console.log("Media stream detenido.");
        }

        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.disconnect();
            scriptProcessorRef.current = null;
        }
        if (mediaStreamSourceRef.current) {
            mediaStreamSourceRef.current.disconnect();
            mediaStreamSourceRef.current = null;
        }

        if (inputAudioContextRef.current && inputAudioContextRef.current.state !== 'closed') {
            inputAudioContextRef.current.close();
            inputAudioContextRef.current = null;
            console.log("Input audio context cerrado.");
        }

        if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
            for (const source of audioQueueRef.current.values()) {
                source.stop();
            }
            audioQueueRef.current.clear();
            outputAudioContextRef.current.close();
            outputAudioContextRef.current = null;
            console.log("Output audio context cerrado.");
        }

        setStatus(LiveStatus.IDLE);
    }, []);

    const startSession = useCallback(async () => {
        if (!poblacionData || poblacionData.length === 0) {
            setStatus(LiveStatus.ERROR);
            console.error("No hay datos de población para iniciar la sesión.");
            return;
        }

        setStatus(LiveStatus.CONNECTING);
        
        try {
            if (!process.env.API_KEY) {
              throw new Error("La clave API de Gemini no está configurada.");
            }
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const systemInstruction = `
Eres un asistente de inteligencia artificial. Tu única tarea es responder preguntas sobre la población basándote en los datos JSON que te proporciono. Cuando un usuario pregunte por la información de una población, busca en los datos el registro correspondiente.

**Instrucciones para la respuesta:**

1.  **Extrae la población:** Del campo \`nombre\` del JSON, extrae solo el nombre de la localidad (ej: de "Párroco de ABANILLA", extrae "ABANILLA").
2.  **Usa la siguiente plantilla:** Debes formatear tu respuesta EXACTAMENTE como se muestra a continuación, llenando los datos del JSON.

**Plantilla:**
"El Párroco responsable de la parroquia de [población] tiene el número de contacto [telefono] y su correo electrónico es [email].
El Moderador responsable de la unidad es [moderador], su número telefónico es [telModerador].
El Arcipreste responsable del arciprestazgo es el mosen [arcipreste], su numero telefónico es [telArcipreste].
El Animador Colaborador es [animador] y le puedes contactar al [telAnimador]."

**Reglas importantes:**
- No añadas ninguna palabra o frase introductoria como "Claro, aquí está la información".
- No añadas saludos ni despedidas.
- Responde ÚNICAMENTE con el texto generado a partir de la plantilla.
- Si no encuentras la población solicitada, responde únicamente con la frase: "No encontré información para esa población".
- No respondas a ninguna otra pregunta que no esté relacionada con estos datos.

Aquí están los datos:
${JSON.stringify(poblacionData)}
            `;
            
            sessionPromiseRef.current = ai.live.connect({
                model: 'gemini-2.5-flash-native-audio-preview-09-2025',
                config: {
                    responseModalities: [Modality.AUDIO],
                    inputAudioTranscription: {},
                    outputAudioTranscription: {},
                    speechConfig: {
                        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } },
                    },
                    systemInstruction: systemInstruction,
                },
                callbacks: {
                    onopen: async () => {
                        console.log('Sesión abierta.');
                        setStatus(LiveStatus.LISTENING);
                        streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                        // FIX: Added '(window as any)' to support 'webkitAudioContext' for cross-browser compatibility.
                        inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                        // FIX: Added '(window as any)' to support 'webkitAudioContext' for cross-browser compatibility.
                        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                        
                        mediaStreamSourceRef.current = inputAudioContextRef.current.createMediaStreamSource(streamRef.current);
                        scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                        
                        scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                            const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
                            const l = inputData.length;
                            const int16 = new Int16Array(l);
                            for (let i = 0; i < l; i++) {
                                int16[i] = inputData[i] * 32768;
                            }
                            const pcmBlob = {
                                data: encode(new Uint8Array(int16.buffer)),
                                mimeType: 'audio/pcm;rate=16000',
                            };
                            
                            if(sessionPromiseRef.current) {
                                sessionPromiseRef.current.then((session) => {
                                    session.sendRealtimeInput({ media: pcmBlob });
                                });
                            }
                        };
                        
                        mediaStreamSourceRef.current.connect(scriptProcessorRef.current);
                        scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);
                    },
                    onmessage: async (message) => {
                        if(message.serverContent?.modelTurn?.parts[0]?.inlineData.data) {
                           setStatus(LiveStatus.SPEAKING);
                           const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                           if (outputAudioContextRef.current && outputAudioContextRef.current.state !== 'closed') {
                               const audioBuffer = await decodeAudioData(decode(base64Audio), outputAudioContextRef.current, 24000, 1);
                               const source = outputAudioContextRef.current.createBufferSource();
                               source.buffer = audioBuffer;
                               source.connect(outputAudioContextRef.current.destination);
                               
                               const currentTime = outputAudioContextRef.current.currentTime;
                               nextAudioTimeRef.current = Math.max(nextAudioTimeRef.current, currentTime);

                               source.start(nextAudioTimeRef.current);
                               nextAudioTimeRef.current += audioBuffer.duration;
                               audioQueueRef.current.add(source);
                               source.onended = () => {
                                   audioQueueRef.current.delete(source);
                                   if(audioQueueRef.current.size === 0) {
                                       setStatus(LiveStatus.LISTENING);
                                   }
                               };
                           }
                        }

                        if(message.serverContent?.inputTranscription) {
                            currentInputTranscriptRef.current += message.serverContent.inputTranscription.text;
                            onNewTranscript({ speaker: 'user', text: currentInputTranscriptRef.current, isFinal: false });
                        }

                        if(message.serverContent?.outputTranscription) {
                            currentOutputTranscriptRef.current += message.serverContent.outputTranscription.text;
                            onNewTranscript({ speaker: 'model', text: currentOutputTranscriptRef.current, isFinal: false });
                        }

                        if(message.serverContent?.turnComplete) {
                            if (currentInputTranscriptRef.current) {
                                onNewTranscript({ speaker: 'user', text: currentInputTranscriptRef.current, isFinal: true });
                            }
                            if (currentOutputTranscriptRef.current) {
                                onNewTranscript({ speaker: 'model', text: currentOutputTranscriptRef.current, isFinal: true });
                            }
                            currentInputTranscriptRef.current = '';
                            currentOutputTranscriptRef.current = '';
                        }
                    },
                    onerror: (e) => {
                        console.error('Error de sesión:', e);
                        setStatus(LiveStatus.ERROR);
                        stopSession();
                    },
                    onclose: () => {
                        console.log('La sesión se cerró desde el servidor.');
                        stopSession();
                    },
                }
            });
            await sessionPromiseRef.current;
        } catch (error) {
            console.error("Error al iniciar la sesión:", error);
            setStatus(LiveStatus.ERROR);
            stopSession();
        }
    }, [poblacionData, onNewTranscript, stopSession]);

    return { status, startSession, stopSession };
};
