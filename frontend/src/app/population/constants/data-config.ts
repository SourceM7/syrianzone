export const DATA_TYPES = {
    POPULATION: 'population',
    IDP: 'idp',
    IDP_RETURNEES: 'idp_returnees',
    RAINFALL: 'rainfall',
    ENVIRONMENTAL: 'environmental'
} as const;

export type DataType = typeof DATA_TYPES[keyof typeof DATA_TYPES];

export const DATA_TYPE_CONFIG = {
    [DATA_TYPES.POPULATION]: {
        label: 'عدد السكان',
        labelAr: 'السكان',
        colors: { none: '#2a3033', low: '#235A82', medium: '#388BFD', high: '#84B9FF' },
        thresholds: [100000, 500000, 1000000],
        legend: [
            { label: 'لا توجد بيانات', color: '#2a3033' },
            { label: 'أقل من ١٠٠ ألف', color: '#235A82' },
            { label: '١٠٠ ألف – ٥٠٠ ألف', color: '#388BFD' },
            { label: 'أكثر من مليون', color: '#84B9FF' }
        ]
    },
    [DATA_TYPES.IDP]: {
        label: 'النازحين داخلياً',
        labelAr: 'النازحين',
        colors: { none: '#2a3033', low: '#A0522D', medium: '#D2691E', high: '#FF7F50' },
        thresholds: [100000, 500000, 1000000],
        legend: [
            { label: 'لا توجد بيانات', color: '#2a3033' },
            { label: 'أقل من ١٠٠ ألف', color: '#A0522D' },
            { label: '١٠٠ ألف – ٥٠٠ ألف', color: '#D2691E' },
            { label: 'أكثر من ٥٠٠ ألف', color: '#FF7F50' }
        ]
    },
    [DATA_TYPES.IDP_RETURNEES]: {
        label: 'العائدون من النزوح',
        labelAr: 'العائدون',
        colors: { none: '#2a3033', low: '#006400', medium: '#228B22', high: '#32CD32' },
        thresholds: [50000, 100000, 200000],
        legend: [
            { label: 'لا توجد بيانات', color: '#2a3033' },
            { label: 'أقل من ٥٠ ألف', color: '#006400' },
            { label: '٥٠ ألف – ١٠٠ ألف', color: '#228B22' },
            { label: 'أكثر من ١٠٠ ألف', color: '#32CD32' }
        ]
    },
    [DATA_TYPES.RAINFALL]: {
        label: 'معدل الهطول المطري',
        labelAr: 'الأمطار',
        colors: { none: '#2a3033', low: '#b4d7e6', medium: '#66b2d6', high: '#006994' },
        thresholds: [100, 300, 500],
        legend: [
            { label: 'لا توجد بيانات', color: '#2a3033' },
            { label: 'أقل من 100 مم', color: '#b4d7e6' },
            { label: '100 - 500 مم', color: '#66b2d6' },
            { label: 'أكثر من 500 مم', color: '#006994' }
        ]
    },

    [DATA_TYPES.ENVIRONMENTAL]: {
        label: 'البيئة والمناخ',
        labelAr: 'المناخ',
        colors: { none: '#2a3033', low: '#065f46', medium: '#059669', high: '#10b981' },
        thresholds: [1, 2, 3], // Adjust based on your logic
        legend: [
            { label: 'بيانات المناخ', color: '#10b981' },
            { label: 'لا توجد بيانات', color: '#2a3033' }
        ]
    }
};