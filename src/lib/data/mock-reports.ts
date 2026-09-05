/**
 * Mock data for advanced report components.
 * Used by OccupancyReport, CollectionsReport, and AgentPerformanceReport.
 * All monetary amounts in COP (Colombian Pesos).
 */

// ============================================================================
// Occupancy Report Types & Data
// ============================================================================

export interface OccupancySummary {
  totalProperties: number;
  rented: number;
  vacant: number;
  vacancyRate: number;
  /**
   * Días promedio vacante. `null` cuando no se puede calcular: el back no
   * guarda desde cuándo está vacío un inmueble. Antes el adaptador ponía un
   * `0` fijo y la tarjeta decía «Prom. 0 días vacante», que se lee como una
   * medición perfecta en vez de como un dato que falta.
   */
  avgDaysVacant: number | null;
}

export interface OccupancyProperty {
  id: string;
  title: string;
  zone: string;
  status: 'rented' | 'vacant';
  daysVacant?: number;
  tenant?: string;
  rentAmount: number;
}

export interface OccupancyByZone {
  zone: string;
  total: number;
  rented: number;
  vacant: number;
  vacancyRate: number;
}

export interface OccupancyMonthlyTrend {
  month: string;
  occupancyRate: number;
}

export interface OccupancyData {
  summary: OccupancySummary;
  byProperty: OccupancyProperty[];
  byZone: OccupancyByZone[];
  monthlyTrend: OccupancyMonthlyTrend[];
}

// ============================================================================
// Collections Report Types & Data
// ============================================================================

export interface CollectionsSummary {
  totalExpected: number;
  totalCollected: number;
  totalLate: number;
  moraRate: number;
  avgDaysLate: number;
  recoveryRate: number;
}

export interface CollectionsByMonth {
  month: string;
  expected: number;
  collected: number;
  late: number;
  moraRate: number;
}

export interface CollectionsDelinquent {
  tenantName: string;
  propertyTitle: string;
  daysLate: number;
  amount: number;
  attempts: number;
}

export interface CollectionsData {
  summary: CollectionsSummary;
  byMonth: CollectionsByMonth[];
  topDelinquents: CollectionsDelinquent[];
}

// ============================================================================
// Agent Performance Types & Data
// ============================================================================

export interface AgentPerformance {
  id: string;
  name: string;
  closings: number;
  avgDaysToClose: number;
  conversionRate: number;
  totalRevenue: number;
  activeLeads: number;
}

export interface AgentTeamSummary {
  totalClosings: number;
  avgConversion: number;
  totalRevenue: number;
  avgDaysToClose: number;
}

export interface AgentPerformanceData {
  agents: AgentPerformance[];
  teamSummary: AgentTeamSummary;
}

// ============================================================================
// Executive Report Types & Data
// ============================================================================

export interface ExecutiveMetric {
  id: string;
  labelEs: string;
  labelEn: string;
  currentValue: number;
  /**
   * El valor del período anterior. OPCIONAL: sin él no hay variación que
   * mostrar. `GET /reports/flujo-caja` no devuelve el mes previo, y el
   * adaptador ponía `previousValue: 0` — un «0,0 %» de variación que nadie
   * midió, sobre un mes anterior inventado.
   */
  previousValue?: number;
  format: 'percent' | 'currency' | 'number' | 'days';
  higherIsBetter: boolean;
}

export interface ExecutiveMonthlySummary {
  month: string;
  revenue: number;
  expenses: number;
  netIncome: number;
}

export interface ExecutiveData {
  healthScore: number;
  healthLevel: 'excellent' | 'good' | 'warning' | 'critical';
  metrics: ExecutiveMetric[];
  monthlySummary: ExecutiveMonthlySummary[];
}

// ============================================================================
// Mock Data
// ============================================================================

export const mockOccupancyData: OccupancyData = {
  summary: {
    totalProperties: 48,
    rented: 41,
    vacant: 7,
    vacancyRate: 14.6,
    avgDaysVacant: 23,
  },
  byProperty: [
    { id: 'p1', title: 'Apto 301 Ed. Monterrey', zone: 'Chapinero', status: 'rented', tenant: 'Carlos Mendoza', rentAmount: 2800000 },
    { id: 'p2', title: 'Apto 502 Torres del Parque', zone: 'Chapinero', status: 'rented', tenant: 'Ana Gutierrez', rentAmount: 3200000 },
    { id: 'p3', title: 'Casa 12 Conj. Los Robles', zone: 'Usaquen', status: 'vacant', daysVacant: 18, rentAmount: 4500000 },
    { id: 'p4', title: 'Apto 1201 Ed. Altavista', zone: 'Usaquen', status: 'rented', tenant: 'Maria Torres', rentAmount: 3800000 },
    { id: 'p5', title: 'Apto 804 Ed. Mirador', zone: 'Suba', status: 'rented', tenant: 'Jorge Ramirez', rentAmount: 1900000 },
    { id: 'p6', title: 'Apto 203 Ed. San Felipe', zone: 'Suba', status: 'vacant', daysVacant: 35, rentAmount: 1600000 },
    { id: 'p7', title: 'Local 101 CC Plaza Norte', zone: 'Suba', status: 'vacant', daysVacant: 42, rentAmount: 3500000 },
    { id: 'p8', title: 'Apto 605 Ed. Cedritos Park', zone: 'Cedritos', status: 'rented', tenant: 'Laura Diaz', rentAmount: 2200000 },
    { id: 'p9', title: 'Apto 402 Ed. Provenza', zone: 'Laureles', status: 'rented', tenant: 'Andres Velez', rentAmount: 2600000 },
    { id: 'p10', title: 'Casa 8 Conj. Alameda', zone: 'Cedritos', status: 'vacant', daysVacant: 12, rentAmount: 3100000 },
    { id: 'p11', title: 'Apto 901 Ed. El Retiro', zone: 'Chapinero', status: 'rented', tenant: 'Sofia Castro', rentAmount: 4200000 },
    { id: 'p12', title: 'Apto 103 Ed. Santa Barbara', zone: 'Usaquen', status: 'rented', tenant: 'Diego Herrera', rentAmount: 5100000 },
    { id: 'p13', title: 'Apto 710 Ed. Nogal', zone: 'Chapinero', status: 'rented', tenant: 'Valentina Ruiz', rentAmount: 3600000 },
    { id: 'p14', title: 'Local 205 CC El Retiro', zone: 'Chapinero', status: 'vacant', daysVacant: 8, rentAmount: 6200000 },
    { id: 'p15', title: 'Apto 306 Ed. Laureles Sur', zone: 'Laureles', status: 'rented', tenant: 'Pablo Mejia', rentAmount: 2100000 },
    { id: 'p16', title: 'Apto 1502 Ed. Bosque Verde', zone: 'Suba', status: 'vacant', daysVacant: 28, rentAmount: 2400000 },
    { id: 'p17', title: 'Apto 408 Ed. Colina Norte', zone: 'Usaquen', status: 'rented', tenant: 'Camila Ortiz', rentAmount: 3900000 },
    { id: 'p18', title: 'Apto 202 Ed. Primavera', zone: 'Cedritos', status: 'vacant', daysVacant: 19, rentAmount: 2000000 },
  ],
  byZone: [
    { zone: 'Chapinero', total: 12, rented: 11, vacant: 1, vacancyRate: 8.3 },
    { zone: 'Usaquen', total: 10, rented: 8, vacant: 2, vacancyRate: 20.0 },
    { zone: 'Suba', total: 11, rented: 8, vacant: 3, vacancyRate: 27.3 },
    { zone: 'Cedritos', total: 8, rented: 7, vacant: 1, vacancyRate: 12.5 },
    { zone: 'Laureles', total: 7, rented: 7, vacant: 0, vacancyRate: 0.0 },
  ],
  monthlyTrend: [
    { month: 'Abr 2025', occupancyRate: 89 },
    { month: 'May 2025', occupancyRate: 91 },
    { month: 'Jun 2025', occupancyRate: 88 },
    { month: 'Jul 2025', occupancyRate: 86 },
    { month: 'Ago 2025', occupancyRate: 84 },
    { month: 'Sep 2025', occupancyRate: 87 },
    { month: 'Oct 2025', occupancyRate: 90 },
    { month: 'Nov 2025', occupancyRate: 92 },
    { month: 'Dic 2025', occupancyRate: 88 },
    { month: 'Ene 2026', occupancyRate: 85 },
    { month: 'Feb 2026', occupancyRate: 83 },
    { month: 'Mar 2026', occupancyRate: 85 },
  ],
};

export const mockCollectionsData: CollectionsData = {
  summary: {
    totalExpected: 142500000,
    totalCollected: 128250000,
    totalLate: 14250000,
    moraRate: 10.0,
    avgDaysLate: 18,
    recoveryRate: 72.0,
  },
  byMonth: [
    { month: 'Abr 2025', expected: 138000000, collected: 131100000, late: 6900000, moraRate: 5.0 },
    { month: 'May 2025', expected: 139500000, collected: 130530000, late: 8970000, moraRate: 6.4 },
    { month: 'Jun 2025', expected: 140200000, collected: 129384000, late: 10816000, moraRate: 7.7 },
    { month: 'Jul 2025', expected: 140200000, collected: 126180000, late: 14020000, moraRate: 10.0 },
    { month: 'Ago 2025', expected: 141000000, collected: 125490000, late: 15510000, moraRate: 11.0 },
    { month: 'Sep 2025', expected: 141000000, collected: 128310000, late: 12690000, moraRate: 9.0 },
    { month: 'Oct 2025', expected: 141500000, collected: 130180000, late: 11320000, moraRate: 8.0 },
    { month: 'Nov 2025', expected: 142000000, collected: 132660000, late: 9340000, moraRate: 6.6 },
    { month: 'Dic 2025', expected: 142000000, collected: 127800000, late: 14200000, moraRate: 10.0 },
    { month: 'Ene 2026', expected: 142500000, collected: 125400000, late: 17100000, moraRate: 12.0 },
    { month: 'Feb 2026', expected: 142500000, collected: 126825000, late: 15675000, moraRate: 11.0 },
    { month: 'Mar 2026', expected: 142500000, collected: 128250000, late: 14250000, moraRate: 10.0 },
  ],
  topDelinquents: [
    { tenantName: 'Ricardo Salazar', propertyTitle: 'Apto 305 Ed. Nogal', daysLate: 45, amount: 3200000, attempts: 5 },
    { tenantName: 'Patricia Gomez', propertyTitle: 'Casa 7 Conj. Los Pinos', daysLate: 32, amount: 4500000, attempts: 4 },
    { tenantName: 'Fernando Lopez', propertyTitle: 'Apto 1102 Ed. Altamira', daysLate: 28, amount: 2800000, attempts: 3 },
    { tenantName: 'Carmen Rivera', propertyTitle: 'Apto 601 Ed. San Martin', daysLate: 21, amount: 1900000, attempts: 3 },
    { tenantName: 'Alejandro Vargas', propertyTitle: 'Local 3 CC Bulevar', daysLate: 15, amount: 5200000, attempts: 2 },
    { tenantName: 'Isabel Moreno', propertyTitle: 'Apto 204 Ed. Primavera', daysLate: 12, amount: 2100000, attempts: 2 },
    { tenantName: 'Roberto Acosta', propertyTitle: 'Apto 803 Ed. Mirador Norte', daysLate: 8, amount: 3400000, attempts: 1 },
  ],
};

export const mockAgentPerformanceData: AgentPerformanceData = {
  agents: [
    { id: 'a1', name: 'Carolina Martinez', closings: 12, avgDaysToClose: 14, conversionRate: 68, totalRevenue: 48000000, activeLeads: 8 },
    { id: 'a2', name: 'Santiago Restrepo', closings: 9, avgDaysToClose: 18, conversionRate: 52, totalRevenue: 36000000, activeLeads: 11 },
    { id: 'a3', name: 'Daniela Ochoa', closings: 15, avgDaysToClose: 11, conversionRate: 75, totalRevenue: 62000000, activeLeads: 6 },
    { id: 'a4', name: 'Miguel Torres', closings: 7, avgDaysToClose: 22, conversionRate: 41, totalRevenue: 28000000, activeLeads: 14 },
    { id: 'a5', name: 'Valentina Rios', closings: 11, avgDaysToClose: 15, conversionRate: 63, totalRevenue: 44000000, activeLeads: 9 },
  ],
  teamSummary: {
    totalClosings: 54,
    avgConversion: 59.8,
    totalRevenue: 218000000,
    avgDaysToClose: 16,
  },
};

export const mockExecutiveData: ExecutiveData = {
  healthScore: 82,
  healthLevel: 'good',
  metrics: [
    {
      id: 'occupancy',
      labelEs: 'Tasa de ocupacion',
      labelEn: 'Occupancy rate',
      currentValue: 87,
      previousValue: 84,
      format: 'percent',
      higherIsBetter: true,
    },
    {
      id: 'monthly-collections',
      labelEs: 'Recaudo mensual',
      labelEn: 'Monthly collections',
      currentValue: 45200000,
      previousValue: 42800000,
      format: 'currency',
      higherIsBetter: true,
    },
    {
      id: 'mora-rate',
      labelEs: 'Tasa de mora',
      labelEn: 'Delinquency rate',
      currentValue: 4.2,
      previousValue: 5.1,
      format: 'percent',
      higherIsBetter: false,
    },
    {
      id: 'avg-vacancy-days',
      labelEs: 'Dias prom. vacancia',
      labelEn: 'Avg vacancy days',
      currentValue: 12,
      previousValue: 15,
      format: 'days',
      higherIsBetter: false,
    },
    {
      id: 'commissions',
      labelEs: 'Comisiones generadas',
      labelEn: 'Commissions earned',
      currentValue: 5400000,
      previousValue: 4900000,
      format: 'currency',
      higherIsBetter: true,
    },
    {
      id: 'maintenance-requests',
      labelEs: 'Solicitudes mantenimiento',
      labelEn: 'Maintenance requests',
      currentValue: 8,
      previousValue: 11,
      format: 'number',
      higherIsBetter: false,
    },
  ],
  monthlySummary: [
    { month: 'Oct 2025', revenue: 128500000, expenses: 38200000, netIncome: 90300000 },
    { month: 'Nov 2025', revenue: 132000000, expenses: 39800000, netIncome: 92200000 },
    { month: 'Dic 2025', revenue: 127800000, expenses: 41500000, netIncome: 86300000 },
    { month: 'Ene 2026', revenue: 125400000, expenses: 37600000, netIncome: 87800000 },
    { month: 'Feb 2026', revenue: 131200000, expenses: 38900000, netIncome: 92300000 },
    { month: 'Mar 2026', revenue: 135600000, expenses: 40100000, netIncome: 95500000 },
  ],
};
