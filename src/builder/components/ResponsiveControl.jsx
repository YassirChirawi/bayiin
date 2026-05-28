import React, { useState } from 'react';
import { Monitor, Tablet, Smartphone } from 'lucide-react';

export default function ResponsiveControl({ label, value, onChange, defaultValues = { desktop: 80, tablet: 80, mobile: 80 }, min = 0, max = 200, step = 4, suffix = 'px' }) {
    // Le composant garde en mémoire le device actuellement édité
    const [activeDevice, setActiveDevice] = useState('desktop');

    // Assurer que la valeur est toujours un objet
    const safeValue = typeof value === 'object' && value !== null 
        ? { ...defaultValues, ...value } 
        : { desktop: value ?? defaultValues.desktop, tablet: value ?? defaultValues.tablet, mobile: value ?? defaultValues.mobile };

    const handleDeviceChange = (device) => {
        setActiveDevice(device);
    };

    const handleSliderChange = (e) => {
        const newValue = parseInt(e.target.value);
        onChange({
            ...safeValue,
            [activeDevice]: newValue
        });
    };

    const devices = [
        { id: 'desktop', icon: Monitor, label: 'Desktop' },
        { id: 'tablet', icon: Tablet, label: 'Tablette' },
        { id: 'mobile', icon: Smartphone, label: 'Mobile' }
    ];

    const currentValue = safeValue[activeDevice] ?? defaultValues[activeDevice];

    return (
        <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-bold text-slate-700">{label}</label>
                
                {/* Breakpoint Switcher */}
                <div className="flex bg-slate-200/50 rounded-lg p-1">
                    {devices.map(device => {
                        const Icon = device.icon;
                        const isActive = activeDevice === device.id;
                        return (
                            <button
                                key={device.id}
                                onClick={() => handleDeviceChange(device.id)}
                                title={device.label}
                                className={`p-1.5 rounded-md transition-all ${
                                    isActive 
                                        ? 'bg-white shadow-sm text-indigo-600' 
                                        : 'text-slate-400 hover:text-slate-600'
                                }`}
                            >
                                <Icon size={14} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <input 
                    type="range" 
                    min={min} 
                    max={max}
                    step={step}
                    value={currentValue} 
                    onChange={handleSliderChange}
                    className="flex-1 accent-indigo-600"
                />
                <div className="w-16 flex items-center justify-end font-mono text-sm font-bold text-slate-600 bg-white px-2 py-1 rounded-lg border border-slate-200">
                    {currentValue}{suffix}
                </div>
            </div>
        </div>
    );
}
