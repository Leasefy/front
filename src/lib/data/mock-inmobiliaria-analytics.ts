/** Analytics data: KPIs, charts, trends, forecasting */

import type {
  AdvancedKPI,
  AnalyticsChart,
  AnalyticsData,
  SparklinePoint,
  TrendAnalysis,
  ForecastData,
  TrendDataPoint,
  ForecastDataPoint,
  TrendDirection,
} from '@/lib/types/inmobiliaria';

function generateSparkline(days: number, baseValue: number, variance: number): SparklinePoint[] {
  const points: SparklinePoint[] = [];
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const randomVariance = (Math.random() - 0.5) * 2 * variance;
    points.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(baseValue + randomVariance),
    });
  }

  return points;
}

export function generateAdvancedKPIs(): AdvancedKPI[] {
  return [
    {
      id: 'kpi-revenue',
      label: 'Ingresos del Mes',
      value: 125400000,
      formattedValue: '$125.4M',
      trend: { direction: 'up', percentage: 12.5, previousValue: 111500000, currentValue: 125400000 },
      sparkline: generateSparkline(30, 4000000, 800000),
      target: 130000000,
      targetLabel: 'Meta: $130M',
      category: 'financial',
      description: 'Total de comisiones y fees del mes',
    },
    {
      id: 'kpi-occupancy',
      label: 'Tasa de Ocupacion',
      value: 92.3,
      formattedValue: '92.3%',
      unit: '%',
      trend: { direction: 'up', percentage: 2.1, previousValue: 90.4, currentValue: 92.3 },
      sparkline: generateSparkline(30, 91, 3),
      target: 95,
      targetLabel: 'Meta: 95%',
      category: 'operational',
      description: 'Porcentaje de propiedades arrendadas',
    },
    {
      id: 'kpi-collection',
      label: 'Recaudo del Mes',
      value: 98.5,
      formattedValue: '98.5%',
      unit: '%',
      trend: { direction: 'up', percentage: 1.2, previousValue: 97.3, currentValue: 98.5 },
      sparkline: generateSparkline(30, 97, 2),
      target: 100,
      targetLabel: 'Meta: 100%',
      category: 'financial',
    },
    {
      id: 'kpi-days-to-rent',
      label: 'Dias Promedio para Arrendar',
      value: 18,
      formattedValue: '18 dias',
      unit: 'dias',
      trend: { direction: 'down', percentage: -15.0, previousValue: 21, currentValue: 18 },
      sparkline: generateSparkline(30, 20, 5),
      target: 15,
      targetLabel: 'Meta: 15 dias',
      category: 'performance',
      description: 'Tiempo promedio desde publicacion hasta arriendo',
    },
    {
      id: 'kpi-renewals',
      label: 'Tasa de Renovacion',
      value: 78.2,
      formattedValue: '78.2%',
      unit: '%',
      trend: { direction: 'up', percentage: 5.3, previousValue: 74.3, currentValue: 78.2 },
      sparkline: generateSparkline(12, 75, 8),
      target: 85,
      targetLabel: 'Meta: 85%',
      category: 'operational',
    },
    {
      id: 'kpi-nps',
      label: 'NPS Propietarios',
      value: 72,
      formattedValue: '72',
      trend: { direction: 'stable', percentage: 0.5, previousValue: 71.6, currentValue: 72 },
      sparkline: generateSparkline(12, 70, 5),
      target: 80,
      targetLabel: 'Meta: 80',
      category: 'performance',
      description: 'Net Promoter Score de propietarios',
    },
    {
      id: 'kpi-late-payments',
      label: 'Cartera Vencida',
      value: 8500000,
      formattedValue: '$8.5M',
      trend: { direction: 'down', percentage: -18.2, previousValue: 10400000, currentValue: 8500000 },
      sparkline: generateSparkline(30, 9000000, 1500000),
      category: 'financial',
      description: 'Total en mora mayor a 30 dias',
    },
    {
      id: 'kpi-agent-productivity',
      label: 'Productividad Agentes',
      value: 4.2,
      formattedValue: '4.2',
      unit: 'contratos/agente',
      trend: { direction: 'up', percentage: 10.5, previousValue: 3.8, currentValue: 4.2 },
      sparkline: generateSparkline(12, 4, 0.5),
      target: 5,
      targetLabel: 'Meta: 5/agente',
      category: 'performance',
    },
  ];
}

export function generateAnalyticsCharts(): AnalyticsChart[] {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'];

  return [
    {
      id: 'chart-revenue-trend',
      title: 'Tendencia de Ingresos',
      description: 'Comisiones mensuales del ultimo semestre',
      type: 'area',
      labels: months,
      datasets: [
        {
          label: 'Comisiones',
          data: [98, 105, 112, 108, 118, 125],
          color: '#10B981',
        },
        {
          label: 'Meta',
          data: [100, 105, 110, 115, 120, 125],
          color: '#6B7280',
          type: 'line',
        },
      ],
      period: 'quarter',
    },
    {
      id: 'chart-occupancy-by-zone',
      title: 'Ocupacion por Zona',
      type: 'bar',
      labels: ['Zona Norte', 'Chapinero', 'Usaquen', 'El Poblado', 'Zona Centro'],
      datasets: [
        {
          label: 'Ocupacion %',
          data: [95, 88, 92, 90, 85],
          color: '#6366F1',
        },
      ],
      period: 'month',
    },
    {
      id: 'chart-collection-status',
      title: 'Estado de Cartera',
      type: 'donut',
      labels: ['Al dia', '1-30 dias', '31-60 dias', '61-90 dias', '+90 dias'],
      datasets: [
        {
          label: 'Monto',
          data: [85, 8, 4, 2, 1],
          color: '#10B981',
        },
      ],
      period: 'month',
    },
    {
      id: 'chart-agent-performance',
      title: 'Rendimiento de Agentes',
      type: 'bar',
      labels: ['Maria L.', 'Carlos G.', 'Ana M.', 'Pedro R.', 'Laura S.'],
      datasets: [
        {
          label: 'Contratos Cerrados',
          data: [8, 6, 7, 5, 4],
          color: '#8B5CF6',
        },
        {
          label: 'Meta',
          data: [5, 5, 5, 5, 5],
          color: '#E5E7EB',
        },
      ],
      period: 'month',
    },
  ];
}

export function generateAnalyticsData(): AnalyticsData {
  return {
    kpis: generateAdvancedKPIs(),
    charts: generateAnalyticsCharts(),
    lastUpdated: new Date().toISOString(),
  };
}

export const MOCK_ANALYTICS_DATA = generateAnalyticsData();

// ============================================================================
// Trend & Forecast Data (Phase 10 - Plan 07)
// ============================================================================

function generateTrendDataPoints(months: number, baseValue: number, growthRate: number): TrendDataPoint[] {
  const data: TrendDataPoint[] = [];
  const today = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setMonth(date.getMonth() - i);
    const seasonalFactor = 1 + (Math.sin((date.getMonth() / 12) * 2 * Math.PI) * 0.1);
    const noise = (Math.random() - 0.5) * 0.1;
    const value = baseValue * Math.pow(1 + growthRate, months - i) * seasonalFactor * (1 + noise);

    data.push({
      date: date.toISOString().split('T')[0],
      value: Math.round(value),
      label: date.toLocaleDateString('es-CL', { month: 'short', year: '2-digit' }),
    });
  }

  return data;
}

function generateForecastPoints(months: number, lastValue: number, growthRate: number): ForecastDataPoint[] {
  const data: ForecastDataPoint[] = [];
  const today = new Date();

  for (let i = 1; i <= months; i++) {
    const date = new Date(today);
    date.setMonth(date.getMonth() + i);
    const predicted = lastValue * Math.pow(1 + growthRate, i);
    const uncertainty = 0.05 * i;

    data.push({
      date: date.toISOString().split('T')[0],
      predicted: Math.round(predicted),
      lowerBound: Math.round(predicted * (1 - uncertainty)),
      upperBound: Math.round(predicted * (1 + uncertainty)),
      confidence: Math.max(0.5, 0.95 - (i * 0.05)),
    });
  }

  return data;
}

export function generateMockTrendAnalysis(): TrendAnalysis[] {
  return [
    {
      metricId: 'revenue',
      metricLabel: 'Ingresos Mensuales',
      data: generateTrendDataPoints(12, 100000000, 0.02),
      comparison: {
        current: { label: 'Este mes', startDate: '2026-02-01', endDate: '2026-02-28', value: 125400000 },
        previous: { label: 'Mes anterior', startDate: '2026-01-01', endDate: '2026-01-31', value: 118200000 },
        change: { absolute: 7200000, percentage: 6.1, direction: 'up' as TrendDirection },
      },
      seasonalPatterns: [
        { month: 1, monthName: 'Enero', averageValue: 95, deviation: -5, isHighSeason: false },
        { month: 2, monthName: 'Febrero', averageValue: 98, deviation: -2, isHighSeason: false },
        { month: 3, monthName: 'Marzo', averageValue: 102, deviation: 2, isHighSeason: false },
        { month: 4, monthName: 'Abril', averageValue: 100, deviation: 0, isHighSeason: false },
        { month: 5, monthName: 'Mayo', averageValue: 105, deviation: 5, isHighSeason: false },
        { month: 6, monthName: 'Junio', averageValue: 110, deviation: 10, isHighSeason: true, notes: 'Temporada alta por cambio de ano escolar' },
        { month: 7, monthName: 'Julio', averageValue: 115, deviation: 15, isHighSeason: true },
        { month: 8, monthName: 'Agosto', averageValue: 108, deviation: 8, isHighSeason: true },
        { month: 9, monthName: 'Septiembre', averageValue: 100, deviation: 0, isHighSeason: false },
        { month: 10, monthName: 'Octubre', averageValue: 98, deviation: -2, isHighSeason: false },
        { month: 11, monthName: 'Noviembre', averageValue: 92, deviation: -8, isHighSeason: false },
        { month: 12, monthName: 'Diciembre', averageValue: 88, deviation: -12, isHighSeason: false, notes: 'Baja por festivos' },
      ],
      anomalies: [
        {
          date: '2025-11-15',
          value: 85000000,
          expectedValue: 115000000,
          deviationPercent: -26,
          severity: 'high',
          description: 'Caida inusual por evento de mercado',
        },
        {
          date: '2025-07-20',
          value: 145000000,
          expectedValue: 120000000,
          deviationPercent: 21,
          severity: 'medium',
          description: 'Pico por renovaciones masivas',
        },
      ],
      trendLine: { slope: 0.02, direction: 'up' as TrendDirection, confidence: 0.87 },
      insights: [
        'Crecimiento consistente de 2% mensual en el ultimo ano',
        'Junio-Julio son los meses mas fuertes (temporada escolar)',
        'Diciembre presenta caida estacional del 12%',
        'La tendencia general es positiva con 87% de confianza',
      ],
    },
    {
      metricId: 'occupancy',
      metricLabel: 'Tasa de Ocupacion',
      data: generateTrendDataPoints(12, 88000000, 0.003).map(d => ({ ...d, value: Math.min(100, Math.max(75, d.value / 1000000)) })),
      comparison: {
        current: { label: 'Este mes', startDate: '2026-02-01', endDate: '2026-02-28', value: 92.3 },
        previous: { label: 'Mes anterior', startDate: '2026-01-01', endDate: '2026-01-31', value: 91.1 },
        change: { absolute: 1.2, percentage: 1.3, direction: 'up' as TrendDirection },
      },
      seasonalPatterns: [
        { month: 1, monthName: 'Enero', averageValue: 90, deviation: 0, isHighSeason: false },
        { month: 2, monthName: 'Febrero', averageValue: 91, deviation: 1, isHighSeason: false },
        { month: 6, monthName: 'Junio', averageValue: 95, deviation: 5, isHighSeason: true },
        { month: 7, monthName: 'Julio', averageValue: 96, deviation: 6, isHighSeason: true },
        { month: 12, monthName: 'Diciembre', averageValue: 87, deviation: -3, isHighSeason: false },
      ],
      anomalies: [],
      trendLine: { slope: 0.003, direction: 'up' as TrendDirection, confidence: 0.92 },
      insights: [
        'Ocupacion estable con tendencia ligeramente positiva',
        'Meta de 95% alcanzable para Q3 si se mantiene el ritmo',
        'Mejor desempeno en temporada alta (junio-agosto)',
      ],
    },
    {
      metricId: 'collections',
      metricLabel: 'Tasa de Recaudo',
      data: generateTrendDataPoints(12, 94000000, 0.005).map(d => ({ ...d, value: Math.min(100, Math.max(85, d.value / 1000000)) })),
      comparison: {
        current: { label: 'Este mes', startDate: '2026-02-01', endDate: '2026-02-28', value: 96.8 },
        previous: { label: 'Mes anterior', startDate: '2026-01-01', endDate: '2026-01-31', value: 95.2 },
        change: { absolute: 1.6, percentage: 1.7, direction: 'up' as TrendDirection },
      },
      seasonalPatterns: [
        { month: 1, monthName: 'Enero', averageValue: 92, deviation: -3, isHighSeason: false, notes: 'Bajo por gastos de fin de ano' },
        { month: 12, monthName: 'Diciembre', averageValue: 89, deviation: -6, isHighSeason: false, notes: 'Bajo por vacaciones' },
      ],
      anomalies: [
        {
          date: '2025-12-10',
          value: 82,
          expectedValue: 94,
          deviationPercent: -13,
          severity: 'medium',
          description: 'Retrasos por temporada de fin de ano',
        },
      ],
      trendLine: { slope: 0.005, direction: 'up' as TrendDirection, confidence: 0.89 },
      insights: [
        'Tasa de recaudo mejorando consistentemente',
        'Enero y diciembre son meses criticos para seguimiento',
        'Implementar recordatorios anticipados reduce mora',
      ],
    },
  ];
}

export function generateMockForecastData(): ForecastData[] {
  return [
    {
      metricId: 'revenue',
      metricLabel: 'Proyeccion de Ingresos',
      unit: 'COP',
      historical: generateTrendDataPoints(12, 100000000, 0.02),
      baseline: generateForecastPoints(6, 125400000, 0.015),
      scenarios: [
        {
          id: 'optimistic',
          name: 'Escenario Optimista',
          description: 'Expansion de portafolio + mejora en ocupacion',
          assumptions: ['10 propiedades nuevas', 'Ocupacion al 95%', 'Incremento promedio de canon 8%'],
          data: generateForecastPoints(6, 125400000, 0.03),
          probability: 0.25,
        },
        {
          id: 'conservative',
          name: 'Escenario Conservador',
          description: 'Mantener operacion actual sin expansion',
          assumptions: ['Sin nuevas propiedades', 'Ocupacion estable', 'Incremento canon igual a IPC'],
          data: generateForecastPoints(6, 125400000, 0.008),
          probability: 0.50,
        },
        {
          id: 'pessimistic',
          name: 'Escenario Pesimista',
          description: 'Contraccion del mercado',
          assumptions: ['Perdida de 5 propiedades', 'Ocupacion baja a 85%', 'Presion en precios'],
          data: generateForecastPoints(6, 125400000, -0.01),
          probability: 0.25,
        },
      ],
      factors: [
        { name: 'Crecimiento del mercado', impact: 'positive', weight: 0.3 },
        { name: 'Nuevas consignaciones', impact: 'positive', weight: 0.25 },
        { name: 'Competencia', impact: 'negative', weight: 0.2 },
        { name: 'Condiciones economicas', impact: 'neutral', weight: 0.25 },
      ],
      lastUpdated: new Date().toISOString(),
    },
    {
      metricId: 'occupancy',
      metricLabel: 'Proyeccion de Ocupacion',
      unit: '%',
      historical: generateTrendDataPoints(12, 88000000, 0.003).map(d => ({ ...d, value: Math.min(100, Math.max(75, d.value / 1000000)) })),
      baseline: generateForecastPoints(6, 92, 0.005).map(d => ({
        ...d,
        predicted: Math.min(100, 92 + (d.predicted / 125400000 - 1) * 10),
        lowerBound: Math.min(100, 90 + (d.lowerBound / 125400000 - 1) * 10),
        upperBound: Math.min(100, 94 + (d.upperBound / 125400000 - 1) * 10),
      })),
      scenarios: [
        {
          id: 'optimistic',
          name: 'Escenario Optimista',
          description: 'Alta demanda sostenida',
          assumptions: ['Mercado inmobiliario fuerte', 'Pocas vacantes', 'Renovaciones exitosas'],
          data: generateForecastPoints(6, 92, 0.008).map(d => ({
            ...d,
            predicted: Math.min(98, 94 + (d.predicted / 125400000 - 1) * 10),
            lowerBound: Math.min(96, 92 + (d.lowerBound / 125400000 - 1) * 10),
            upperBound: Math.min(100, 96 + (d.upperBound / 125400000 - 1) * 10),
          })),
          probability: 0.30,
        },
        {
          id: 'conservative',
          name: 'Escenario Conservador',
          description: 'Condiciones normales de mercado',
          assumptions: ['Demanda estable', 'Rotacion normal', 'Sin cambios significativos'],
          data: generateForecastPoints(6, 92, 0.003).map(d => ({
            ...d,
            predicted: Math.min(96, 92 + (d.predicted / 125400000 - 1) * 8),
            lowerBound: Math.min(94, 89 + (d.lowerBound / 125400000 - 1) * 8),
            upperBound: Math.min(98, 94 + (d.upperBound / 125400000 - 1) * 8),
          })),
          probability: 0.50,
        },
        {
          id: 'pessimistic',
          name: 'Escenario Pesimista',
          description: 'Desaceleracion economica',
          assumptions: ['Menor demanda', 'Mayor rotacion', 'Presion de precios'],
          data: generateForecastPoints(6, 92, -0.005).map(d => ({
            ...d,
            predicted: Math.max(80, 88 + (d.predicted / 125400000 - 1) * 5),
            lowerBound: Math.max(75, 82 + (d.lowerBound / 125400000 - 1) * 5),
            upperBound: Math.max(85, 90 + (d.upperBound / 125400000 - 1) * 5),
          })),
          probability: 0.20,
        },
      ],
      factors: [
        { name: 'Demanda del mercado', impact: 'positive', weight: 0.4 },
        { name: 'Calidad del portafolio', impact: 'positive', weight: 0.35 },
        { name: 'Tiempos de respuesta', impact: 'positive', weight: 0.25 },
      ],
      lastUpdated: new Date().toISOString(),
    },
    {
      metricId: 'commissions',
      metricLabel: 'Proyeccion de Comisiones',
      unit: 'COP',
      historical: generateTrendDataPoints(12, 10000000, 0.02),
      baseline: generateForecastPoints(6, 12500000, 0.015),
      scenarios: [],
      factors: [
        { name: 'Ingresos totales', impact: 'positive', weight: 0.5 },
        { name: 'Mix de servicios', impact: 'positive', weight: 0.3 },
        { name: 'Eficiencia operativa', impact: 'positive', weight: 0.2 },
      ],
      lastUpdated: new Date().toISOString(),
    },
  ];
}

export const MOCK_TREND_ANALYSIS = generateMockTrendAnalysis();
export const MOCK_FORECAST_DATA = generateMockForecastData();
