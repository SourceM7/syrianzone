import { DATA_TYPES } from '../../types';
import { getColor } from '../../utils/color-calculator';
import { findPopulation, findRainData } from '../../utils/data-finder';
import { CityData, RainfallData } from '../../types';
import environmentalJson from '../../syria_environmental_data_report.json';
import { getCanonicalCityName } from '@/lib/city-name-standardizer';
type DataType = typeof DATA_TYPES[keyof typeof DATA_TYPES];

const ARABIC_TO_ENGLISH_CITY_MAP: { [key: string]: string } = {
    'دمشق': 'Damascus',
    'حلب': 'Aleppo',
    'ريف دمشق': 'Rif Dimashq',
    'حمص': 'Homs',
    'حماة': 'Hama',
    'اللاذقية': 'Latakia',
    'إدلب': 'Idlib',
    'الحسكة': 'Al-Hasakah',
    'دير الزور': 'Deir ez-Zor',
    'طرطوس': 'Tartus',
    'الرقة': 'Raqqa',
    'درعا': 'Daraa',
    'السويداء': 'As-Suwayda',
    'القنيطرة': 'Quneitra'
};

// Get temperature-based color for environmental mode
function getTemperatureColor(temp: number): string {
    if (temp <= 5) return '#3b82f6';      // Cold - blue
    if (temp <= 10) return '#06b6d4';     // Cool - cyan
    if (temp <= 15) return '#14b8a6';     // Mild - teal
    if (temp <= 20) return '#22c55e';     // Pleasant - green
    if (temp <= 25) return '#eab308';     // Warm - yellow
    if (temp <= 30) return '#f97316';     // Hot - orange
    return '#ef4444';                      // Very hot - red
}

export function getFeatureStyle(
    feature: any,
    currentDataType: DataType,
    populationData: CityData | null,
    rainfallData: RainfallData | undefined,
    customThresholds: number[]
) {
    let value = 0;

    if (currentDataType === DATA_TYPES.RAINFALL) {
        const rData = findRainData(feature, rainfallData);
        if (rData && rData.length > 0) {
            const target = rData.find((x: any) => x.year === 2024) || rData[rData.length - 1];
            value = target.rainfall;
        }
    } else if (currentDataType === DATA_TYPES.ENVIRONMENTAL) {
        const name = feature.properties.province_name || feature.properties.ADM2_AR || feature.properties.ADM1_AR || feature.properties.Name;
        const nameAr = getCanonicalCityName(name);
        const englishName = ARABIC_TO_ENGLISH_CITY_MAP[nameAr] || nameAr;
        const envData = (environmentalJson as any).cities?.[nameAr] || (environmentalJson as any).cities?.[englishName] || (environmentalJson as any).cities?.[name];

        if (envData) {
            const temp = envData.current_conditions?.temperature_celsius || 15;
            return {
                fillColor: getTemperatureColor(temp),
                weight: 2,
                opacity: 1,
                color: '#0f172a',
                fillOpacity: 0.75
            };
        }

        return {
            fillColor: '#1e293b',
            weight: 1.5,
            opacity: 1,
            color: '#334155',
            fillOpacity: 0.5
        };
    } else {
        value = findPopulation(feature.properties.province_name, populationData);
    }

    const baseStyle = {
        fillColor: getColor(value, currentDataType, customThresholds),
        weight: 1.5,
        opacity: 1,
        fillOpacity: 0.85
    };

    if (currentDataType === DATA_TYPES.RAINFALL) {
        return {
            ...baseStyle,
            color: '#164e63',
            fillOpacity: 0.8
        };
    }

    return {
        ...baseStyle,
        color: '#0D1117'
    };
}

export function getHighlightStyle(currentDataType: DataType) {
    if (currentDataType === DATA_TYPES.RAINFALL) {
        return {
            weight: 3,
            color: '#67e8f9',
            fillOpacity: 1
        };
    }

    if (currentDataType === DATA_TYPES.ENVIRONMENTAL) {
        return {
            weight: 4,
            color: '#22d3ee',
            fillOpacity: 0.9,
            dashArray: ''
        };
    }

    return {
        weight: 3,
        color: '#E6EDF3',
        fillOpacity: 1
    };
}