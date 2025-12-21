"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PopulationGroups, DataType, DATA_TYPES, DATA_TYPE_CONFIG, CityData, DataSource } from './types';
import { Layers, Info, Filter, X, BarChart3, CheckSquare, Square } from 'lucide-react';

const MapClient = dynamic(() => import('./MapClient'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-card text-muted-foreground">جاري تحميل الخريطة...</div>
});

interface PopulationClientProps {
    initialData: PopulationGroups;
}

export default function PopulationClient({ initialData }: PopulationClientProps) {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [currentDataType, setCurrentDataType] = useState<DataType>(DATA_TYPES.POPULATION);
    const [currentSourceId, setCurrentSourceId] = useState<number | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);

    useEffect(() => {
        fetch('/assets/population/syria_provinces.geojson')
            .then(res => res.json())
            .then(data => setGeoJsonData(data))
            .catch(err => console.error('Failed to load GeoJSON', err));
    }, []);

    useEffect(() => {
        const sources = initialData[currentDataType];
        if (sources && sources.length > 0) {
            setCurrentSourceId(sources[0].source_id);
        }
    }, [currentDataType, initialData]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsPanelOpen(true);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentSource = useMemo(() =>
        initialData[currentDataType].find(s => s.source_id === currentSourceId),
        [initialData, currentDataType, currentSourceId]
    );

    const populationData = currentSource ? currentSource.cities : null;
    const config = DATA_TYPE_CONFIG[currentDataType];

    const dynamicThresholds = useMemo(() => {
        if (!populationData) return config.thresholds;
        const values = Object.values(populationData).filter(v => v > 0);
        if (values.length === 0) return config.thresholds;
        const max = Math.max(...values);
        return [Math.floor(max * 0.1), Math.floor(max * 0.4), Math.floor(max * 0.7)];
    }, [populationData, config.thresholds]);

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(0) + 'K';
        return num.toString();
    };

    const toggleProvinceSelection = (province: string) => {
        setSelectedProvinces(prev => {
            if (prev.includes(province)) return prev.filter(p => p !== province);
            if (prev.length < 2) return [...prev, province];
            return [prev[1], province];
        });
    };

    const getProvinceStats = (provinceName: string) => {
        const stats: any = {};
        Object.values(DATA_TYPES).forEach(type => {
            const source = initialData[type][0]; // Compare using the primary source of each type
            stats[type] = source?.cities[provinceName] || 0;
        });
        return stats;
    };

    const comparisonData = useMemo(() => {
        if (selectedProvinces.length !== 2) return null;
        return {
            p1: { name: selectedProvinces[0], stats: getProvinceStats(selectedProvinces[0]) },
            p2: { name: selectedProvinces[1], stats: getProvinceStats(selectedProvinces[1]) }
        };
    }, [selectedProvinces, initialData]);

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative bg-background text-foreground" dir="rtl">
            
            {/* Comparison Modal */}
            {comparisonData && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-card border-2 border-primary rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-4 border-b border-border">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <BarChart3 className="text-primary" size={20} />
                            مقارنة المحافظات
                        </h3>
                        <button onClick={() => setSelectedProvinces([])} className="p-1 hover:bg-muted rounded-full">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="text-center font-bold text-lg text-primary">{comparisonData.p1.name}</div>
                            <div className="text-center text-muted-foreground text-sm self-center">مقابل</div>
                            <div className="text-center font-bold text-lg text-primary">{comparisonData.p2.name}</div>
                        </div>
                        <div className="space-y-6">
                            {Object.values(DATA_TYPES).map(type => {
                                const v1 = comparisonData.p1.stats[type];
                                const v2 = comparisonData.p2.stats[type];
                                const max = Math.max(v1, v2, 1);
                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span>{v1.toLocaleString()}</span>
                                            <span className="text-muted-foreground">{DATA_TYPE_CONFIG[type].labelAr}</span>
                                            <span>{v2.toLocaleString()}</span>
                                        </div>
                                        <div className="flex h-3 w-full gap-1 bg-muted rounded-full overflow-hidden">
                                            <div className="flex justify-end w-1/2">
                                                <div className="h-full bg-primary rounded-r-full" style={{ width: `${(v1 / max) * 100}%` }} />
                                            </div>
                                            <div className="flex justify-start w-1/2">
                                                <div className="h-full bg-primary/60 rounded-l-full" style={{ width: `${(v2 / max) * 100}%` }} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Map Area */}
            <div className="flex-grow relative z-0">
                <MapClient geoJsonData={geoJsonData} populationData={populationData} currentDataType={currentDataType} currentSourceId={currentSourceId} customThresholds={dynamicThresholds} />
                <div className="absolute bottom-6 right-6 z-[400] bg-card/90 backdrop-blur p-3 rounded shadow-lg border border-border text-sm min-w-[150px]">
                    <h4 className="font-bold mb-2 text-foreground">{config.labelAr}</h4>
                    {/* Legend Items... */}
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.none }}></span> لا توجد بيانات</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.low }}></span> أقل من {formatNumber(dynamicThresholds[1])}</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.medium }}></span> {formatNumber(dynamicThresholds[1])} – {formatNumber(dynamicThresholds[2])}</div>
                        <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{ backgroundColor: config.colors.high }}></span> أكثر من {formatNumber(dynamicThresholds[2])}</div>
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <div className={`absolute top-0 left-0 bottom-0 z-[500] w-80 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 ${isPanelOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
                <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="absolute -right-12 top-1/2 -translate-y-1/2 w-12 h-12 bg-card text-primary rounded-r-lg border-y border-r border-border flex items-center justify-center">
                    <Filter size={20} />
                </button>

                <div className="p-4 border-b border-border">
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Layers size={18} /> البيانات والمصادر</h2>
                    <div className="flex rounded-lg bg-muted p-1">
                        {Object.values(DATA_TYPES).map(type => (
                            <button key={type} onClick={() => setCurrentDataType(type)} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${currentDataType === type ? 'bg-card text-primary shadow-sm' : 'text-muted-foreground'}`}>
                                {DATA_TYPE_CONFIG[type].labelAr}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">المصادر المتوفرة</h3>
                    
                    {initialData[currentDataType].map(source => (
                        <div key={source.source_id} className={`rounded-lg border transition-all overflow-hidden ${currentSourceId === source.source_id ? 'border-primary ring-1 ring-primary' : 'border-border'}`}>
                            <button onClick={() => setCurrentSourceId(source.source_id)} className="w-full text-right p-3 bg-card hover:bg-muted/30">
                                <div className="font-semibold text-sm">{source.note || 'مصدر'} ({source.date})</div>
                                <div className="text-[10px] text-muted-foreground">معرف المصدر: {source.source_id}</div>
                            </button>

                            {currentSourceId === source.source_id && (
                                <div className="p-0 border-t border-border">
                                    <table className="w-full text-[11px] text-right">
                                        <thead className="bg-muted/50 text-muted-foreground">
                                            <tr>
                                                <th className="p-2 w-8">قارن</th>
                                                <th className="p-2">المحافظة</th>
                                                <th className="p-2 text-left">العدد</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border">
                                            {Object.entries(source.cities).sort(([, a], [, b]) => b - a).map(([city, pop]) => {
                                                const isSelected = selectedProvinces.includes(city);
                                                return (
                                                    <tr key={city} className={`hover:bg-primary/5 cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => toggleProvinceSelection(city)}>
                                                        <td className="p-2 text-center">
                                                            {isSelected ? <CheckSquare size={14} className="text-primary mx-auto" /> : <Square size={14} className="text-muted-foreground mx-auto" />}
                                                        </td>
                                                        <td className="p-2 font-medium">{city}</td>
                                                        <td className="p-2 text-left font-mono">{pop.toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}