"use client";

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { PopulationGroups, DATA_TYPES, DATA_TYPE_CONFIG, RainfallData, DataSource } from './types';
import {
    Layers, Info, Filter, X, BarChart3, CheckSquare, Square, ExternalLink,
    CloudRain, RefreshCw, ThermometerSun, Wind, Droplets, Gauge,
    Activity, AlertTriangle, TrendingDown, Calendar, Cloud, Navigation,
    History, Users, Heart, MapPin, Clock
} from 'lucide-react';
import { sortCitiesByOrder, getCanonicalCityName } from '@/lib/city-name-standardizer';

type DataType = typeof DATA_TYPES[keyof typeof DATA_TYPES];

const MapClient = dynamic(() => import('./components/map/MapClient'), {
    ssr: false,
    loading: () => <div className="h-full w-full flex items-center justify-center bg-card text-muted-foreground">جاري تحميل الخريطة...</div>
});

const ARABIC_TO_ENGLISH_CITY_MAP: { [key: string]: string } = {
    'دمشق': 'Damascus', 'حلب': 'Aleppo', 'ريف دمشق': 'Rif Dimashq', 'حمص': 'Homs',
    'حماة': 'Hama', 'اللاذقية': 'Latakia', 'إدلب': 'Idlib', 'الحسكة': 'Al-Hasakah',
    'دير الزور': 'Deir ez-Zor', 'طرطوس': 'Tartus', 'الرقة': 'Raqqa', 'درعا': 'Daraa',
    'السويداء': 'As-Suwayda', 'القنيطرة': 'Quneitra'
};

export default function PopulationClient() {
    const [geoJsonData, setGeoJsonData] = useState<any>(null);
    const [currentDataType, setCurrentDataType] = useState<DataType>(DATA_TYPES.POPULATION);
    const [currentSourceId, setCurrentSourceId] = useState<number | null>(null);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    // Comparison tool state
    const [selectedProvinces, setSelectedProvinces] = useState<string[]>([]);

    // Detail States
    const [selectedRainfallProvince, setSelectedRainfallProvince] = useState<{ name: string, data: any[] } | null>(null);
    const [selectedEnvProvince, setSelectedEnvProvince] = useState<{ name: string, data: any } | null>(null);

    // Data fetching state
    const [rainfallData, setRainfallData] = useState<RainfallData>({});
    const [environmentalData, setEnvironmentalData] = useState<any>(null);

    const [livePopulationData, setLivePopulationData] = useState<PopulationGroups>({
        population: [],
        idp: [],
        idp_returnees: [],
        rainfall: [],
        environmental: []
    });
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetch('/assets/population/syr_admin1.geojson')
            .then(res => res.json())
            .then(data => setGeoJsonData(data))
            .catch(err => console.error('Failed to load GeoJSON', err));
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setIsLoading(true);
                setError(null);

                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

                const masterResponse = await fetch(`${apiUrl}/api/population/master`);
                if (!masterResponse.ok) throw new Error('Failed to fetch master data');
                const masterData = await masterResponse.json();

                setLivePopulationData(masterData.groups);
                setRainfallData(masterData.rainfall_data);

                const envResponse = await fetch(`${apiUrl}/api/population/env-report`);
                if (!envResponse.ok) throw new Error('Failed to fetch environmental data');
                const envData = await envResponse.json();
                setEnvironmentalData(envData);

            } catch (err) {
                console.error('Failed to fetch population data:', err);
                setError('Failed to load population atlas data. Please try again later.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (currentDataType === DATA_TYPES.RAINFALL) {
            setCurrentSourceId(999);
        } else if (currentDataType === DATA_TYPES.ENVIRONMENTAL) {
            const sources = livePopulationData[currentDataType];
            if (sources && sources.length > 0) {
                setCurrentSourceId(sources[0].source_id);
            } else {
                setCurrentSourceId(null);
            }
        } else {
            const sources = livePopulationData[currentDataType];
            if (sources && sources.length > 0) {
                setCurrentSourceId(sources[0].source_id);
            } else {
                setCurrentSourceId(null);
            }
        }
    }, [currentDataType, livePopulationData]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 768) setIsPanelOpen(true);
        };
        window.addEventListener('resize', handleResize);
        handleResize();
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const currentSource = useMemo(() => {
        if (currentDataType === DATA_TYPES.RAINFALL) return null;
        const sources = livePopulationData[currentDataType];
        if (!sources || sources.length === 0) return null;
        return sources.find(s => s.source_id === currentSourceId);
    }, [livePopulationData, currentDataType, currentSourceId]);

    const populationData = currentSource ? currentSource.cities : null;
    const config = DATA_TYPE_CONFIG[currentDataType as keyof typeof DATA_TYPE_CONFIG];

    const dynamicThresholds = useMemo(() => {
        if (currentDataType === DATA_TYPES.RAINFALL || currentDataType === DATA_TYPES.ENVIRONMENTAL) return config.thresholds;
        if (!populationData) return config.thresholds;

        const values = Object.values(populationData).filter(v => v > 0);
        if (values.length === 0) return config.thresholds;

        const max = Math.max(...values);
        return [Math.floor(max * 0.1), Math.floor(max * 0.4), Math.floor(max * 0.7)];
    }, [populationData, config.thresholds, currentDataType]);

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
            if (type === DATA_TYPES.RAINFALL || type === DATA_TYPES.ENVIRONMENTAL) return;

            let source;
            if (type === currentDataType && currentSource) {
                source = currentSource;
            } else {
                source = livePopulationData[type]?.[0];
            }
            if (source) {
                stats[type] = source.cities[provinceName] ?? 0;
            } else {
                stats[type] = 0;
            }
        });
        return stats;
    };

    const comparisonData = useMemo(() => {
        if (selectedProvinces.length !== 2) return null;
        return {
            p1: { name: selectedProvinces[0], stats: getProvinceStats(selectedProvinces[0]) },
            p2: { name: selectedProvinces[1], stats: getProvinceStats(selectedProvinces[1]) }
        };
    }, [selectedProvinces, livePopulationData, currentDataType, currentSource]);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-background text-foreground gap-6">
                <RefreshCw className="animate-spin text-primary" size={64} />
                <div className="text-center">
                    <h2 className="text-2xl font-bold mb-2">جاري تحميل بيانات الأطلس</h2>
                    <p className="text-muted-foreground">قد يستغرق هذا بضع ثوان...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] bg-background text-foreground gap-6 px-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 mb-4">
                        <Info size={64} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-foreground">خطأ في تحميل البيانات</h2>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 rounded-lg font-medium transition-colors"
                    >
                        <RefreshCw size={20} />
                        إعادة المحاولة
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative bg-background text-foreground" dir="rtl">

            {/* Comparison Pop-up */}
            {comparisonData && currentDataType !== DATA_TYPES.RAINFALL && currentDataType !== DATA_TYPES.ENVIRONMENTAL && (
                <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-[1000] w-[90%] max-w-2xl bg-card border-2 border-primary rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center p-4 border-b border-border">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <BarChart3 className="text-primary" size={20} />
                            مقارنة المحافظات
                        </h3>
                        <button onClick={() => setSelectedProvinces([])} className="p-1 hover:bg-muted rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-3 gap-4 mb-8">
                            <div className="text-center font-bold text-lg text-primary truncate">{comparisonData.p1.name}</div>
                            <div className="text-center text-muted-foreground text-sm self-center">مقابل</div>
                            <div className="text-center font-bold text-lg text-primary truncate">{comparisonData.p2.name}</div>
                        </div>

                        <div className="space-y-8">
                            {Object.values(DATA_TYPES).filter(t => t !== DATA_TYPES.RAINFALL && t !== DATA_TYPES.ENVIRONMENTAL).map(type => {
                                const v1 = comparisonData.p1.stats[type];
                                const v2 = comparisonData.p2.stats[type];
                                const max = Math.max(v1, v2, 1);
                                const label = DATA_TYPE_CONFIG[type as keyof typeof DATA_TYPE_CONFIG].labelAr;

                                return (
                                    <div key={type} className="space-y-2">
                                        <div className="flex justify-between text-xs font-medium mb-1 px-1">
                                            <span>{v1.toLocaleString()}</span>
                                            <span className="text-muted-foreground">{label}</span>
                                            <span>{v2.toLocaleString()}</span>
                                        </div>
                                        <div className="flex h-4 w-full gap-1 bg-muted rounded-full overflow-hidden">
                                            <div className="flex justify-end w-1/2">
                                                <div
                                                    className="h-full bg-primary transition-all duration-500 rounded-r-full"
                                                    style={{ width: `${(v1 / max) * 100}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-start w-1/2">
                                                <div
                                                    className="h-full bg-primary/60 transition-all duration-500 rounded-l-full"
                                                    style={{ width: `${(v2 / max) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Header Overlay */}
            <div className="absolute top-4 right-4 z-[400] pointer-events-none">
                <div className="bg-card/90 backdrop-blur p-4 rounded-lg shadow-lg border border-border pointer-events-auto max-w-sm">
                    <h1 className="text-xl font-bold text-foreground mb-1">أطلس سوريا</h1>
                    <p className="text-sm text-muted-foreground">
                        {currentDataType === DATA_TYPES.RAINFALL
                            ? 'عرض بيانات الهطولات المطرية السنوية (2021-2025)'
                            : currentDataType === DATA_TYPES.ENVIRONMENTAL
                                ? 'بيانات المناخ وجودة الهواء المباشرة'
                                : 'خريطة تفاعلية للبيانات السكانية والإنسانية'}
                    </p>
                </div>
            </div>

            {/* Map Area */}
            <div className="flex-grow relative z-0">
                <MapClient
                    geoJsonData={geoJsonData}
                    populationData={populationData}
                    rainfallData={rainfallData}
                    environmentalData={environmentalData}
                    currentDataType={currentDataType}
                    currentSourceId={currentSourceId}
                    customThresholds={dynamicThresholds}
                    onFeatureClick={(feature) => {
                        const name = feature.properties.province_name || feature.properties.ADM2_AR || feature.properties.ADM1_AR || feature.properties.Name;
                        const nameAr = getCanonicalCityName(name);

                        // --- HANDLE RAINFALL CLICK ---
                        if (currentDataType === DATA_TYPES.RAINFALL) {
                            const props = feature.properties;
                            const codeKeys = ['ADM1_PCODE', 'ADM2_PCODE', 'admin1Pcode', 'admin2Pcode', 'code', 'id', 'PCODE'];
                            let rData = null;

                            for (const key of codeKeys) {
                                if (props[key] && rainfallData[props[key]]) {
                                    rData = rainfallData[props[key]];
                                    break;
                                }
                            }

                            if (!rData) {
                                const nameKeys = ['province_name', 'ADM1_EN', 'ADM1_AR', 'name', 'Name', 'NAME', 'admin1Name_en'];
                                for (const key of nameKeys) {
                                    if (props[key]) {
                                        const normalized = props[key].trim().replace(/['`]/g, '').replace(/Ḥ/g, 'H').toLowerCase();
                                        const PROVINCE_TO_PCODE: { [key: string]: string } = {
                                            'damascus': 'SY01', 'aleppo': 'SY02', 'rural damascus': 'SY03', 'rif dimashq': 'SY03',
                                            'homs': 'SY04', 'hama': 'SY05', 'lattakia': 'SY06', 'latakia': 'SY06',
                                            'idlib': 'SY07', 'idleb': 'SY07', 'al hasakah': 'SY08', 'hasakah': 'SY08',
                                            'deir ez-zor': 'SY09', 'deir ezzor': 'SY09', 'tartous': 'SY10', 'tartus': 'SY10',
                                            'ar raqqah': 'SY11', 'raqqa': 'SY11', 'daraa': 'SY12', 'dar\'a': 'SY12',
                                            'as suwayda': 'SY13', 'as suwayda\'': 'SY13', 'sweida': 'SY13',
                                            'quneitra': 'SY14', 'al qunaytirah': 'SY14',
                                            'دمشق': 'SY01', 'حلب': 'SY02', 'ريف دمشق': 'SY03', 'حمص': 'SY04', 'حماة': 'SY05',
                                            'اللاذقية': 'SY06', 'إدلب': 'SY07', 'الحسكة': 'SY08', 'دير الزور': 'SY09',
                                            'طرطوس': 'SY10', 'الرقة': 'SY11', 'درعا': 'SY12', 'السويداء': 'SY13', 'القنيطرة': 'SY14'
                                        };
                                        const mappedCode = PROVINCE_TO_PCODE[normalized];
                                        if (mappedCode && rainfallData[mappedCode]) {
                                            rData = rainfallData[mappedCode];
                                            break;
                                        }
                                    }
                                }
                            }

                            if (rData) {
                                setSelectedRainfallProvince({ name: nameAr, data: rData });
                                if (window.innerWidth < 768) setIsPanelOpen(true);
                            }
                        }

                        // --- HANDLE ENVIRONMENTAL CLICK ---
                        else if (currentDataType === DATA_TYPES.ENVIRONMENTAL) {
                            if (environmentalData && environmentalData.cities) {
                                const englishName = ARABIC_TO_ENGLISH_CITY_MAP[nameAr] || nameAr;
                                const data = environmentalData.cities[nameAr] || environmentalData.cities[englishName] || environmentalData.cities[name];

                                if (data) {
                                    setSelectedEnvProvince({ name: nameAr, data: data });
                                    setIsPanelOpen(true);
                                }
                            }
                        }
                    }}
                />

                {/* Legend Overlay */}
                <div className="absolute bottom-6 right-6 z-[400] bg-card/90 backdrop-blur p-3 rounded shadow-lg border border-border text-sm min-w-[150px]">
                    <h4 className="font-bold mb-2 text-foreground flex items-center gap-2">
                        {currentDataType === DATA_TYPES.RAINFALL && <CloudRain size={16} className="text-primary" />}
                        {currentDataType === DATA_TYPES.ENVIRONMENTAL && <ThermometerSun size={16} className="text-primary" />}
                        {config.labelAr}
                    </h4>
                    <div className="space-y-1.5">
                        {config.legend.map((item: { label: string; color: string }, idx: number) => (
                            <div key={idx} className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                                <span className="text-muted-foreground text-xs">{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Side Panel */}
            <div className={`absolute top-0 left-0 bottom-0 z-[500] w-80 bg-card border-r border-border shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${isPanelOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <button onClick={() => setIsPanelOpen(!isPanelOpen)} className="absolute -right-12 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-card text-primary rounded-r-lg shadow-md flex items-center justify-center hover:bg-accent border-y border-r border-border">
                    <Filter size={20} />
                </button>

                <div className="p-4 border-b border-border bg-card">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold text-foreground flex items-center gap-2"><Layers size={18} /> البيانات</h2>
                    </div>

                    <div className="grid grid-cols-2 gap-2 p-1">
                        {Object.values(DATA_TYPES).map(type => (
                            <button
                                key={type}
                                onClick={() => {
                                    setCurrentDataType(type);
                                    if (type === DATA_TYPES.RAINFALL) {
                                        setSelectedProvinces([]);
                                    } else {
                                        setSelectedRainfallProvince(null);
                                        setSelectedEnvProvince(null);
                                    }
                                }}
                                className={`py-2 px-3 text-xs font-medium rounded-md transition-all flex items-center justify-center gap-2 border
                                    ${currentDataType === type
                                        ? 'bg-primary/10 text-primary border-primary/20 shadow-sm'
                                        : 'bg-muted/50 text-muted-foreground border-transparent hover:bg-muted hover:text-foreground'}`}
                            >
                                {type === DATA_TYPES.RAINFALL && <CloudRain size={14} />}
                                {type === DATA_TYPES.ENVIRONMENTAL && <ThermometerSun size={14} />}
                                {DATA_TYPE_CONFIG[type as keyof typeof DATA_TYPE_CONFIG].labelAr}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-card">

                    {/* OPTION 1: RAINFALL DETAILS */}
                    {currentDataType === DATA_TYPES.RAINFALL ? (
                        <div className="flex flex-col h-full">
                            {selectedRainfallProvince ? (
                                <div className="space-y-6 animate-in fade-in slide-in-from-left-4 duration-300">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-foreground">{selectedRainfallProvince.name}</h3>
                                            <p className="text-xs text-muted-foreground mt-1">تفاصيل الهطولات المطرية السنوية</p>
                                        </div>
                                        <button onClick={() => setSelectedRainfallProvince(null)} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground"><X size={18} /></button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3">
                                        {[...selectedRainfallProvince.data].sort((a, b) => b.year - a.year).map((item, idx) => (
                                            <div key={idx} className="bg-muted/40 p-3 rounded-lg border border-border/50 flex justify-between items-center group hover:bg-muted/60 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-xs text-muted-foreground">السنة</span>
                                                    <span className="font-bold text-lg">{item.year}</span>
                                                </div>
                                                <div className="flex gap-6">
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-muted-foreground">الهطول (ملم)</span>
                                                        <span className="font-mono font-bold text-cyan-500">{item.rainfall.toFixed(1)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center h-full text-muted-foreground py-10 px-4">
                                    <CloudRain className="opacity-50 mb-4" size={48} />
                                    <h3 className="font-bold text-foreground mb-2">خريطة الأمطار</h3>
                                    <p className="text-sm leading-relaxed mb-6">اختر محافظة من الخريطة لعرض إحصائيات الأمطار التاريخية والمتوسط السنوي.</p>
                                </div>
                            )}
                        </div>
                    ) : currentDataType === DATA_TYPES.ENVIRONMENTAL ? (
                        /* OPTION 2: ENVIRONMENTAL DETAILS */
                        <div className="flex flex-col h-full">
                            {selectedEnvProvince ? (
                                <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
                                    {/* Header with Temperature */}
                                    <div className="flex justify-between items-start border-b border-border pb-4">
                                        <div>
                                            <h3 className="text-2xl font-bold text-foreground">{selectedEnvProvince.name}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <div className="text-3xl font-mono text-primary font-bold">{selectedEnvProvince.data.current_conditions?.temperature_celsius}°</div>
                                                <div className="text-xs text-muted-foreground flex flex-col">
                                                    <span>{selectedEnvProvince.data.current_conditions?.weather_description}</span>
                                                    <span>محسوسة: {selectedEnvProvince.data.current_conditions?.feels_like_celsius}°</span>
                                                </div>
                                            </div>
                                            {/* Population & Last Update */}
                                            {selectedEnvProvince.data.population && (
                                                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                                                    <span className="flex items-center gap-1">
                                                        <Users size={12} />
                                                        {selectedEnvProvince.data.population?.toLocaleString('ar-SY')} نسمة
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <button onClick={() => setSelectedEnvProvince(null)} className="p-1 hover:bg-muted rounded-md transition-colors text-muted-foreground"><X size={18} /></button>
                                    </div>

                                    {/* Weather Grid - Extended */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Droplets size={12} /> الرطوبة</div>
                                            <div className="font-bold text-base">{selectedEnvProvince.data.current_conditions?.humidity_percent}%</div>
                                        </div>
                                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Wind size={12} /> الرياح</div>
                                            <div className="font-bold text-base">{selectedEnvProvince.data.current_conditions?.wind_speed_kmh} <span className="text-[10px] font-normal">كم/س</span></div>
                                        </div>
                                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Navigation size={12} /> الاتجاه</div>
                                            <div className="font-bold text-base">{selectedEnvProvince.data.current_conditions?.wind_direction_degrees}°</div>
                                        </div>
                                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Gauge size={12} /> الضغط</div>
                                            <div className="font-bold text-base">{selectedEnvProvince.data.current_conditions?.pressure_msl_hpa?.toFixed(0)} <span className="text-[10px] font-normal">hPa</span></div>
                                        </div>
                                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><Cloud size={12} /> الغيوم</div>
                                            <div className="font-bold text-base">{selectedEnvProvince.data.current_conditions?.cloud_cover_percent}%</div>
                                        </div>
                                        <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                                            <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] mb-0.5"><CloudRain size={12} /> الهطول</div>
                                            <div className="font-bold text-base">{selectedEnvProvince.data.current_conditions?.precipitation_mm} <span className="text-[10px] font-normal">mm</span></div>
                                        </div>
                                    </div>

                                    {/* Air Quality Card - Enhanced */}
                                    <div className={`p-3 rounded-xl border ${(selectedEnvProvince.data.air_quality?.estimated_aqi || 0) <= 50
                                            ? 'bg-emerald-500/10 border-emerald-500/20'
                                            : (selectedEnvProvince.data.air_quality?.estimated_aqi || 0) <= 75
                                                ? 'bg-yellow-500/10 border-yellow-500/20'
                                                : 'bg-red-500/10 border-red-500/20'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 font-bold text-sm">
                                                <Activity size={16} className={`${(selectedEnvProvince.data.air_quality?.estimated_aqi || 0) <= 50
                                                        ? 'text-emerald-500'
                                                        : (selectedEnvProvince.data.air_quality?.estimated_aqi || 0) <= 75
                                                            ? 'text-yellow-500'
                                                            : 'text-red-500'
                                                    }`} />
                                                جودة الهواء
                                            </div>
                                            <div className={`font-bold text-lg ${(selectedEnvProvince.data.air_quality?.estimated_aqi || 0) <= 50
                                                    ? 'text-emerald-500'
                                                    : (selectedEnvProvince.data.air_quality?.estimated_aqi || 0) <= 75
                                                        ? 'text-yellow-500'
                                                        : 'text-red-500'
                                                }`}>
                                                {selectedEnvProvince.data.air_quality?.estimated_aqi} AQI
                                            </div>
                                        </div>
                                        <div className="text-xs text-muted-foreground space-y-1">
                                            <div className="flex items-center justify-between">
                                                <span>التصنيف:</span>
                                                <span className="font-medium">{selectedEnvProvince.data.air_quality?.category}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span>طريقة التقدير:</span>
                                                <span className="font-medium">{selectedEnvProvince.data.air_quality?.method === 'Weather-based estimation' ? 'تقدير معتمد على الطقس' : selectedEnvProvince.data.air_quality?.method}</span>
                                            </div>
                                            {selectedEnvProvince.data.air_quality?.health_recommendation && (
                                                <div className="flex items-start gap-1.5 mt-2 p-2 bg-background/50 rounded-lg">
                                                    <Heart size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
                                                    <span className="text-[10px] leading-relaxed">{selectedEnvProvince.data.air_quality.health_recommendation}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Drought Risk - Enhanced */}
                                    <div className="bg-orange-500/10 p-3 rounded-xl border border-orange-500/20">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2 text-orange-600 font-bold text-sm">
                                                <AlertTriangle size={16} />
                                                مخاطر الجفاف
                                            </div>
                                            <span className="font-bold text-orange-500">{selectedEnvProvince.data.drought_risk?.drought_risk}</span>
                                        </div>
                                        <div className="text-xs space-y-1.5">
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>التصنيف المناخي:</span>
                                                <span className="font-medium text-foreground">{selectedEnvProvince.data.drought_risk?.classification}</span>
                                            </div>
                                            <div className="flex justify-between text-muted-foreground">
                                                <span>معدل الأمطار السنوي:</span>
                                                <span className="font-mono text-foreground">{selectedEnvProvince.data.drought_risk?.annual_precipitation_mm?.toFixed(1)} mm</span>
                                            </div>
                                            {selectedEnvProvince.data.drought_risk?.dry_season_months && selectedEnvProvince.data.drought_risk.dry_season_months.length > 0 && (
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>أشهر الجفاف:</span>
                                                    <span className="font-mono text-foreground">{selectedEnvProvince.data.drought_risk.dry_season_months.join('، ')}</span>
                                                </div>
                                            )}
                                            {selectedEnvProvince.data.drought_risk?.wet_season_months && selectedEnvProvince.data.drought_risk.wet_season_months.length > 0 && (
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>أشهر الأمطار:</span>
                                                    <span className="font-mono text-foreground">{selectedEnvProvince.data.drought_risk.wet_season_months.join('، ')}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Forecast - Fixed key from daily_forecast_summary to forecast_summary */}
                                    <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                                        <div className="flex items-center gap-2 text-foreground mb-2 font-bold text-sm">
                                            <Calendar size={16} />
                                            توقعات الغد
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <div className="text-center">
                                                <div className="text-muted-foreground text-[10px] mb-0.5">العظمى</div>
                                                <div className="font-bold">{selectedEnvProvince.data.daily_forecast_summary?.tomorrow_max_temp_c ?? selectedEnvProvince.data.forecast_summary?.tomorrow_max_temp_c}°</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-muted-foreground text-[10px] mb-0.5">الصغرى</div>
                                                <div className="font-bold">{selectedEnvProvince.data.daily_forecast_summary?.tomorrow_min_temp_c ?? selectedEnvProvince.data.forecast_summary?.tomorrow_min_temp_c}°</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-muted-foreground text-[10px] mb-0.5">أمطار</div>
                                                <div className="font-bold text-blue-400">{selectedEnvProvince.data.daily_forecast_summary?.tomorrow_precipitation_mm ?? selectedEnvProvince.data.forecast_summary?.tomorrow_precipitation_mm}mm</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Climate Trends - Enhanced */}
                                    {selectedEnvProvince.data.climate_trends && Object.keys(selectedEnvProvince.data.climate_trends).length > 0 && (
                                        <div className="bg-muted/20 p-3 rounded-xl border border-border/50">
                                            <div className="flex items-center gap-2 text-foreground mb-2 font-bold text-sm">
                                                <TrendingDown size={16} />
                                                التغير المناخي (5 سنوات)
                                            </div>
                                            <div className="space-y-1.5 text-xs">
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>تغير الحرارة</span>
                                                    <span className="font-mono text-foreground dir-ltr">{selectedEnvProvince.data.climate_trends.temperature_trend_celsius > 0 ? '+' : ''}{selectedEnvProvince.data.climate_trends.temperature_trend_celsius}°C</span>
                                                </div>
                                                {selectedEnvProvince.data.climate_trends.temperature_change_rate_per_year && (
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>معدل التغير السنوي</span>
                                                        <span className="font-mono text-foreground dir-ltr">{selectedEnvProvince.data.climate_trends.temperature_change_rate_per_year > 0 ? '+' : ''}{selectedEnvProvince.data.climate_trends.temperature_change_rate_per_year}°C/سنة</span>
                                                    </div>
                                                )}
                                                <div className="flex justify-between text-muted-foreground">
                                                    <span>تغير الأمطار</span>
                                                    <span className="font-mono text-foreground dir-ltr">{selectedEnvProvince.data.climate_trends.rainfall_trend_mm > 0 ? '+' : ''}{selectedEnvProvince.data.climate_trends.rainfall_trend_mm}mm</span>
                                                </div>
                                                {selectedEnvProvince.data.climate_trends.average_annual_rainfall_mm && (
                                                    <div className="flex justify-between text-muted-foreground">
                                                        <span>معدل الأمطار السنوي</span>
                                                        <span className="font-mono text-foreground">{selectedEnvProvince.data.climate_trends.average_annual_rainfall_mm}mm</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Historical Summary - NEW */}
                                    {selectedEnvProvince.data.historical_summary && Object.keys(selectedEnvProvince.data.historical_summary).length > 0 && (
                                        <div className="bg-blue-500/5 p-3 rounded-xl border border-blue-500/20">
                                            <div className="flex items-center gap-2 text-foreground mb-2 font-bold text-sm">
                                                <History size={16} className="text-blue-500" />
                                                ملخص البيانات التاريخية
                                            </div>
                                            <div className="text-xs text-muted-foreground mb-2">
                                                {selectedEnvProvince.data.historical_summary.period_start} إلى {selectedEnvProvince.data.historical_summary.period_end}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="bg-background/50 p-2 rounded-lg">
                                                    <div className="text-muted-foreground text-[10px]">متوسط الحرارة العظمى</div>
                                                    <div className="font-bold">{selectedEnvProvince.data.historical_summary.avg_max_temp_c}°C</div>
                                                </div>
                                                <div className="bg-background/50 p-2 rounded-lg">
                                                    <div className="text-muted-foreground text-[10px]">متوسط الحرارة الصغرى</div>
                                                    <div className="font-bold">{selectedEnvProvince.data.historical_summary.avg_min_temp_c}°C</div>
                                                </div>
                                                <div className="bg-background/50 p-2 rounded-lg">
                                                    <div className="text-muted-foreground text-[10px]">إجمالي الهطول</div>
                                                    <div className="font-bold text-blue-400">{selectedEnvProvince.data.historical_summary.total_precipitation_mm}mm</div>
                                                </div>
                                                <div className="bg-background/50 p-2 rounded-lg">
                                                    <div className="text-muted-foreground text-[10px]">أقصى سرعة رياح</div>
                                                    <div className="font-bold">{selectedEnvProvince.data.historical_summary.max_wind_speed_kmh} كم/س</div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center h-full text-muted-foreground py-10 px-4">
                                    <ThermometerSun className="opacity-50 mb-4" size={48} />
                                    <h3 className="font-bold text-foreground mb-2">بيانات المناخ</h3>
                                    <p className="text-sm leading-relaxed mb-6">اختر محافظة من الخريطة لعرض تفاصيل الطقس، جودة الهواء، ومؤشرات الجفاف والتغير المناخي.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* OPTION 3: POPULATION LIST (Existing) */
                        livePopulationData[currentDataType]?.map((source: DataSource) => {
                            const isExpanded = currentSourceId === source.source_id;

                            return (
                                <div key={source.source_id} className={`rounded-lg border transition-all duration-200 ${isExpanded ? 'border-primary bg-card shadow-md' : 'border-border bg-card/50 hover:bg-muted/50'}`}>
                                    <div
                                        className="p-3 flex flex-col gap-3 cursor-pointer select-none"
                                        onClick={() => setCurrentSourceId(source.source_id)}
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <span className="font-bold text-sm">
                                                {source.note || DATA_TYPE_CONFIG[currentDataType as keyof typeof DATA_TYPE_CONFIG].labelAr}
                                            </span>
                                            {source.date && (
                                                <span className="text-xs text-muted-foreground">{source.date}</span>
                                            )}
                                        </div>
                                    </div>
                                    {isExpanded && (
                                        <div className="px-3 pb-3 pt-0 animate-in slide-in-from-top-2 duration-200">
                                            <div className="mb-2 flex justify-between items-center px-1">
                                                <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">قائمة المحافظات</h3>
                                                {selectedProvinces.length > 0 && (
                                                    <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                                                        تم اختيار {selectedProvinces.length}/2
                                                    </span>
                                                )}
                                            </div>

                                            <div className="overflow-hidden rounded-md border border-border/50">
                                                <table className="w-full text-xs text-right">
                                                    <thead className="bg-muted/50 text-muted-foreground">
                                                        <tr>
                                                            <th className="py-2 px-2 text-center w-8"></th>
                                                            <th className="py-2 px-2 font-medium">المحافظة</th>
                                                            <th className="py-2 px-2 text-left font-medium">العدد</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/50 bg-card">
                                                        {sortCitiesByOrder(Object.entries(source.cities)).map(([city, pop]) => {
                                                            const isSelected = selectedProvinces.includes(city);
                                                            return (
                                                                <tr
                                                                    key={city}
                                                                    className={`hover:bg-muted/50 transition-colors cursor-pointer ${isSelected ? 'bg-primary/5' : ''}`}
                                                                    onClick={() => toggleProvinceSelection(city)}
                                                                >
                                                                    <td className="py-1.5 px-2 text-center">
                                                                        <div className="flex justify-center">
                                                                            {isSelected ?
                                                                                <CheckSquare size={14} className="text-primary fill-primary/10" /> :
                                                                                <Square size={14} className="text-muted-foreground" />
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 px-2 font-medium">{city}</td>
                                                                    <td className="py-1.5 px-2 text-left font-mono text-muted-foreground">
                                                                        {pop.toLocaleString('en-US')}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>

                {currentDataType !== DATA_TYPES.RAINFALL && currentDataType !== DATA_TYPES.ENVIRONMENTAL && (
                    <div className="p-4 bg-muted border-t border-border text-xs text-muted-foreground">
                        <p className="flex items-center gap-1 mb-1">
                            <Info size={14} /> اختر محافظتين للمقارنة بينهما
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}