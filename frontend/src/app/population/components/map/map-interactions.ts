import L from 'leaflet';
import { DATA_TYPES, DATA_TYPE_CONFIG, CityData, RainfallData } from '../../types';
import { getCanonicalCityName } from '@/lib/city-name-standardizer';
import { findPopulation, findRainData } from '../../utils/data-finder';
import { generateRainChartHtml, generatePopulationTooltipHtml, generateEnvironmentalTooltipHtml } from './tooltip-generators';
import { getFeatureStyle, getHighlightStyle } from './map-styles';
import environmentalJson from '../../syria_environmental_data_report.json';

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

export function setupFeatureInteractions(
    feature: any,
    layer: L.Layer,
    currentDataType: DataType,
    populationData: CityData | null,
    rainfallData: RainfallData | undefined,
    customThresholds: number[],
    onFeatureClick?: (feature: any) => void
) {
    const name = feature.properties.province_name || feature.properties.ADM2_AR || feature.properties.ADM1_AR || feature.properties.Name;
    const nameAr = getCanonicalCityName(name);

    // Bind tooltip
    layer.bindTooltip(() => {
        if (currentDataType === DATA_TYPES.RAINFALL) {
            const rData = findRainData(feature, rainfallData);
            if (rData) {
                return generateRainChartHtml(nameAr, rData);
            }
            return `<div class="p-2 text-slate-300 text-xs text-right font-sans">لا توجد بيانات مطرية<br/><span class="font-bold text-white">${nameAr}</span></div>`;
        }

        if (currentDataType === DATA_TYPES.ENVIRONMENTAL) {
            const name = feature.properties.province_name || feature.properties.ADM2_AR || feature.properties.ADM1_AR || feature.properties.Name;
            const nameAr = getCanonicalCityName(name);
            const englishName = ARABIC_TO_ENGLISH_CITY_MAP[nameAr] || nameAr;
            const envData = (environmentalJson as any).cities?.[nameAr] || (environmentalJson as any).cities?.[englishName] || (environmentalJson as any).cities?.[name];
            if (envData) {
                return generateEnvironmentalTooltipHtml(nameAr, envData);
            }
            return `<div class="p-2 text-slate-300 text-xs text-right font-sans">لا توجد بيانات بيئية<br/><span class="font-bold text-white">${nameAr}</span></div>`;
        }

        const pop = findPopulation(name, populationData);
        const config = DATA_TYPE_CONFIG[currentDataType];
        return generatePopulationTooltipHtml(nameAr, pop, config.labelAr);
    }, {
        direction: 'top',
        sticky: true,
        className: currentDataType === DATA_TYPES.RAINFALL ? 'custom-tooltip-rain' : currentDataType === DATA_TYPES.ENVIRONMENTAL ? 'custom-tooltip-env' : 'custom-tooltip',
        opacity: 1,
        offset: [0, -10]
    });

    // Mouse events
    layer.on({
        mouseover: (e) => {
            const l = e.target;
            const highlightStyle = getHighlightStyle(currentDataType);
            l.setStyle(highlightStyle);

            if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
                l.bringToFront();
            }
        },
        mouseout: (e) => {
            const l = e.target;
            const style = getFeatureStyle(feature, currentDataType, populationData, rainfallData, customThresholds);
            l.setStyle(style);
        },
        click: () => {
            if (onFeatureClick) {
                onFeatureClick(feature);
            }
        }
    });
}