import { DataType } from '../constants/data-config';

export interface CityData {
    [cityName: string]: number;
}

export interface DataSource {
    source_id: number;
    source_url: string;
    date: string;
    note: string;
    cities: CityData;
    data_type?: DataType;
}

export interface PopulationGroups {
    population: DataSource[];
    idp: DataSource[];
    idp_returnees: DataSource[];
    rainfall: DataSource[];
    environmental: DataSource[];
}

export interface EnvironmentalCityData {
    coordinates: {
        latitude: number;
        longitude: number;
    };
    population: number;
    current_conditions: {
        temperature_celsius: number;
        feels_like_celsius: number;
        humidity_percent: number;
        precipitation_mm: number;
        wind_speed_kmh: number;
        wind_direction_degrees: number;
        pressure_msl_hpa: number;
        pressure_surface_hpa: number;
        cloud_cover_percent: number;
        weather_description: string;
    };
    daily_forecast_summary: {
        tomorrow_max_temp_c: number;
        tomorrow_min_temp_c: number;
        tomorrow_precipitation_mm: number;
    };
    climate_trends?: {
        temperature_trend_celsius: number;
        temperature_change_rate_per_year: number;
        rainfall_trend_mm: number;
        average_annual_rainfall_mm: number;
        avg_surface_pressure_hpa: number;
    };
    air_quality: {
        estimated: boolean;
        method: string;
        factors: {
            wind_speed_m_s: number;
            humidity_percent: number;
            cloud_cover_percent: number;
            pressure_msl_hpa: number;
        };
        estimated_aqi: number;
        category: string;
        health_recommendation: string;
    };
    drought_risk?: {
        dry_season_months: number[];
        wet_season_months: number[];
        annual_precipitation_mm: number;
        drought_risk: string;
        classification: string;
    };
    historical_summary?: {
        period_start: string;
        period_end: string;
        avg_max_temp_c: number;
        avg_min_temp_c: number;
        total_precipitation_mm: number;
        max_wind_speed_kmh: number;
        avg_surface_pressure_hpa: number;
    };
}

export interface EnvironmentalData {
    metadata: {
        country: string;
        report_date: string;
        data_sources: string[];
        cities_analyzed: number;
    };
    cities: {
        [cityName: string]: EnvironmentalCityData;
    };
    country_level: {
        world_bank_climate_data: Record<string, unknown>;
        climate_context: {
            classification: string;
            main_climate_challenges: string[];
            key_water_basins: string[];
        };
    };
    summary: {
        total_cities_analyzed: number;
        data_collection_date: string;
        key_findings: string[];
        recommendations: string[];
    };
}