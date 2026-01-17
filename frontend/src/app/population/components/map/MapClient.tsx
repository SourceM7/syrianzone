"use client";

import React from 'react';
import { MapContainer, GeoJSON } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DATA_TYPES, CityData, RainfallData } from '../../types';
import { getFeatureStyle } from './map-styles';
import { setupFeatureInteractions } from './map-interactions';
import MapUpdater from './MapUpdater';

type DataType = typeof DATA_TYPES[keyof typeof DATA_TYPES];

// Fix for Leaflet icons
// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapClientProps {
    geoJsonData: any;
    populationData: CityData | null;
    rainfallData?: RainfallData;
    // Add this prop
    environmentalData?: any;
    currentDataType: DataType;
    currentSourceId: number | null;
    customThresholds: number[];
    onFeatureClick?: (feature: any) => void;
}

export default function MapClient({ 
    geoJsonData, 
    populationData, 
    rainfallData, 
    environmentalData, // Destructure this
    currentDataType, 
    currentSourceId, 
    customThresholds, 
    onFeatureClick 
}: MapClientProps) {

    const style = (feature: any) => {
        // Pass environmentalData here
        return getFeatureStyle(feature, currentDataType, populationData, rainfallData, environmentalData, customThresholds);
    };

    const onEachFeature = (feature: any, layer: L.Layer) => {
        // Pass environmentalData here
        setupFeatureInteractions(
            feature,
            layer,
            currentDataType,
            populationData,
            rainfallData,
            environmentalData,
            customThresholds,
            onFeatureClick
        );
    };

    if (!geoJsonData) return null;

    return (
        <div className="w-full h-full relative">
            <style jsx global>{`
                .leaflet-container {
                    -webkit-tap-highlight-color: transparent;
                    outline: none;
                    background: ${currentDataType === DATA_TYPES.RAINFALL ? '#111827' : currentDataType === DATA_TYPES.ENVIRONMENTAL ? '#0f172a' : '#24292F'} !important;
                    transition: background 0.5s ease;
                }
                .leaflet-interactive {
                    outline: none !important;
                    transition: fill 0.3s ease, stroke 0.2s ease, stroke-width 0.2s ease;
                }
                path.leaflet-interactive:focus {
                    outline: none;
                }
                .custom-tooltip-rain {
                    background-color: rgba(15, 23, 42, 0.95);
                    border: 1px solid #334155;
                    color: #f8fafc;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                    border-radius: 8px;
                    padding: 8px 12px;
                }
                .custom-tooltip-rain:before {
                    border-top-color: rgba(15, 23, 42, 0.95);
                }
                .custom-tooltip-env {
                    background: linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%);
                    border: 1px solid rgba(34, 211, 238, 0.3);
                    color: #f8fafc;
                    box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.6), 0 0 20px rgba(34, 211, 238, 0.1);
                    border-radius: 12px;
                    padding: 12px;
                    backdrop-filter: blur(12px);
                    min-width: 200px;
                }
                .custom-tooltip-env:before {
                    border-top-color: rgba(15, 23, 42, 0.98) !important;
                }
                .custom-tooltip {
                    background-color: white;
                    border: 1px solid #ccc;
                    color: #333;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                    border-radius: 4px;
                    padding: 6px;
                }
            `}</style>

            <MapContainer
                center={[35.0, 38.5]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
                zoomControl={false}
                scrollWheelZoom={false}
                doubleClickZoom={false}
                attributionControl={false}
            >
                <MapUpdater geoJsonData={geoJsonData} />
                <GeoJSON
                    key={`${currentDataType}-${currentSourceId}`}
                    data={geoJsonData}
                    style={style}
                    onEachFeature={onEachFeature}
                />
            </MapContainer>
        </div>
    );
}