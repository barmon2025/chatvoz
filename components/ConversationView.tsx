
import React, { useRef, useEffect } from 'react';
import { Transcript } from '../types';

interface ConversationViewProps {
  transcripts: Transcript[];
}

const TranscriptBubble: React.FC<{ transcript: Transcript }> = ({ transcript }) => {
  const isUser = transcript.speaker === 'user';
  const bubbleClasses = isUser
    ? 'bg-cyan-600 self-end'
    : 'bg-gray-700 self-start';
  const textClasses = transcript.isFinal ? 'text-white' : 'text-gray-400';

  return (
    <div className={`max-w-xl w-fit rounded-2xl px-4 py-2 my-2 transition-all duration-300 ${bubbleClasses}`}>
      <p className={`whitespace-pre-wrap ${textClasses}`}>{transcript.text || '...'}</p>
    </div>
  );
};

export const ConversationView: React.FC<ConversationViewProps> = ({ transcripts }) => {
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  return (
    <div className="flex-grow p-6 overflow-y-auto flex flex-col space-y-2">
      {transcripts.length === 0 ? (
        <div className="flex-grow flex items-center justify-center text-gray-500">
          <p>Presione el botón para comenzar la conversación.</p>
        </div>
      ) : (
        transcripts.map((transcript) => (
          <TranscriptBubble key={transcript.id} transcript={transcript} />
        ))
      )}
      <div ref={endOfMessagesRef} />
    </div>
  );
};
