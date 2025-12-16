
import React from 'react';

export const RatioIcon = ({ id, active }: { id: string; active: boolean }) => {
    let width = 14;
    let height = 14;
    const stroke = active ? "white" : "#9ca3af"; // white or gray-400
    
    if (id === 'smart') {
        return (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <rect x="7" y="7" width="10" height="10" rx="1" strokeOpacity="0.5" />
            </svg>
        );
    }

    switch(id) {
        case '21:9': width = 20; height = 9; break;
        case '16:9': width = 18; height = 10; break;
        case '3:2':  width = 18; height = 12; break;
        case '4:3':  width = 16; height = 12; break;
        case '1:1':  width = 14; height = 14; break;
        case '3:4':  width = 12; height = 16; break;
        case '2:3':  width = 12; height = 18; break;
        case '9:16': width = 10; height = 18; break;
    }

    const x = (24 - width) / 2;
    const y = (24 - height) / 2;

    return (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2">
            <rect x={x} y={y} width={width} height={height} rx="2" />
        </svg>
    )
};

export const ModelCard = ({ label, description, isSelected, onClick, badge, color = "primary" }: { label: string, description: string, isSelected: boolean, onClick: () => void, badge?: string, color?: "primary" | "purple" | "blue" }) => {
    let activeBorder, activeText, activeIcon;

    if (color === "primary") {
        activeBorder = "border-primary-400 bg-primary-50/50 ring-primary-100";
        activeText = "text-primary-700";
        activeIcon = "bg-primary-500 border-primary-500";
    } else if (color === "purple") {
        activeBorder = "border-purple-400 bg-purple-50/50 ring-purple-100";
        activeText = "text-purple-700";
        activeIcon = "bg-purple-500 border-purple-500";
    } else {
        activeBorder = "border-blue-400 bg-blue-50/50 ring-blue-100";
        activeText = "text-blue-700";
        activeIcon = "bg-blue-500 border-blue-500";
    }
    
    return (
        <button
            onClick={onClick}
            className={`relative flex flex-col items-start p-3 rounded-xl border transition-all w-full text-left group ${
                isSelected 
                ? `${activeBorder} shadow-sm ring-1` 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
        >
            <div className="flex justify-between w-full items-start mb-1 gap-2">
                <span className={`text-xs font-bold ${isSelected ? activeText : 'text-gray-700'}`}>
                    {label}
                </span>
                <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                    isSelected ? activeIcon : 'border-gray-200 bg-gray-50 group-hover:border-gray-300'
                }`}>
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                </div>
            </div>
            
            <p className={`text-[10px] leading-relaxed pr-1 ${isSelected ? 'text-gray-700' : 'text-gray-400'}`}>
                {description}
            </p>

            {badge && (
                <div className="mt-2">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border inline-block shadow-sm ${color === 'primary' ? 'bg-amber-100 text-amber-700 border-amber-200/50' : (color === 'purple' ? 'bg-purple-100 text-purple-700 border-purple-200/50' : 'bg-blue-100 text-blue-700 border-blue-200/50')}`}>
                        {badge}
                    </span>
                </div>
            )}
        </button>
    );
};
