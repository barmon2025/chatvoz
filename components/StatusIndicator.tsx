
import React from 'react';
import { LiveStatus } from '../types';

interface StatusIndicatorProps {
  status: LiveStatus;
}

const statusConfig = {
    [LiveStatus.IDLE]: { text: "Listo para hablar", color: "bg-gray-500" },
    [LiveStatus.CONNECTING]: { text: "Conectando...", color: "bg-yellow-500 animate-pulse" },
    [LiveStatus.LISTENING]: { text: "Escuchando...", color: "bg-green-500 animate-pulse" },
    [LiveStatus.SPEAKING]: { text: "Hablando...", color: "bg-cyan-500" },
    [LiveStatus.ERROR]: { text: "Error en la conexión", color: "bg-red-500" },
};

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status }) => {
    const { text, color } = statusConfig[status];

    return (
        <div className="flex items-center justify-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${color} transition-colors`}></div>
            <p className="text-gray-300 text-sm font-medium">{text}</p>
        </div>
    );
};
