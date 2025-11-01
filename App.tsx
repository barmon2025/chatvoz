
import React, { useState, useEffect, useCallback } from 'react';
import { useLiveConversation } from './hooks/useLiveConversation';
import { PoblacionData, Transcript, LiveStatus } from './types';
import { ConversationView } from './components/ConversationView';
import { StatusIndicator } from './components/StatusIndicator';
import { ControlButton } from './components/ControlButton';

const App: React.FC = () => {
  const [poblacionData, setPoblacionData] = useState<PoblacionData[]>([]);
  const [transcripts, setTranscripts] = useState<Transcript[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('https://raw.githubusercontent.com/robertrb63/robertrb63.github.io/main/users3.json');
        if (!response.ok) {
          throw new Error('No se pudo cargar los datos de población.');
        }
        const data: PoblacionData[] = await response.json();
        setPoblacionData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Un error desconocido ocurrió.');
      }
    };

    fetchData();
  }, []);

  const handleNewTranscript = useCallback((newTranscript: Omit<Transcript, 'id'>) => {
    setTranscripts(prev => {
        const existingIndex = prev.findIndex(t => t.speaker === newTranscript.speaker && !t.isFinal);
        if (existingIndex !== -1) {
            const updated = [...prev];
            updated[existingIndex] = { ...newTranscript, id: updated[existingIndex].id };
            return updated;
        }
        return [...prev, { ...newTranscript, id: Date.now() + Math.random() }];
    });
}, []);


  const { status, startSession, stopSession } = useLiveConversation(poblacionData, handleNewTranscript);

  const isSessionActive = status !== LiveStatus.IDLE && status !== LiveStatus.ERROR;

  const toggleSession = () => {
    if (isSessionActive) {
      stopSession();
    } else {
      setTranscripts([]);
      startSession();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-red-900 text-white p-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Error</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (poblacionData.length === 0 && !error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-xl animate-pulse">Cargando datos...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl p-4 h-screen flex flex-col font-sans">
      <header className="text-center mb-6">
        <h1 className="text-4xl font-bold text-cyan-400">Asistente de Poblaciones</h1>
        <p className="text-gray-400">Haga una pregunta sobre una población para obtener su información.</p>
      </header>
      
      <main className="flex-grow flex flex-col bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        <ConversationView transcripts={transcripts} />
        <div className="p-4 border-t border-gray-700 bg-gray-800/80 backdrop-blur-sm">
          <StatusIndicator status={status} />
        </div>
      </main>

      <footer className="py-6 flex justify-center">
        <ControlButton isActive={isSessionActive} onClick={toggleSession} />
      </footer>
    </div>
  );
};

export default App;
