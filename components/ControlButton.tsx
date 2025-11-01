
import React from 'react';

interface ControlButtonProps {
  isActive: boolean;
  onClick: () => void;
}

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.49 6-3.31 6-6.72h-1.7z"></path>
    </svg>
);

const StopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 6h12v12H6z"></path>
  </svg>
);

export const ControlButton: React.FC<ControlButtonProps> = ({ isActive, onClick }) => {
    const buttonClasses = isActive
        ? "bg-red-600 hover:bg-red-700"
        : "bg-cyan-600 hover:bg-cyan-700";

    const text = isActive ? "Detener" : "Hablar";

    return (
        <button
            onClick={onClick}
            className={`flex items-center justify-center w-40 h-16 rounded-full text-white font-bold text-lg shadow-lg transform transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-opacity-50 ${isActive ? 'focus:ring-red-400' : 'focus:ring-cyan-400'} ${buttonClasses}`}
            aria-label={text}
        >
            {isActive ? (
                <StopIcon className="w-7 h-7 mr-2" />
            ) : (
                <MicrophoneIcon className="w-7 h-7 mr-2" />
            )}
            <span>{text}</span>
        </button>
    );
};
