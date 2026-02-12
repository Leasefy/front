/** Reports, IPC data, and Renovaciones */
import type {
  ReportDefinition,
  ComisionesAgenteReport,
  ComisionAgente,
  OcupacionReport,
  OcupacionZone,
  VencimientosReport,
  VencimientoItem,
  FlujoCajaReport,
  FlujoCajaMonth,
  CarteraItem,
  CarteraReport,
  ExtractoPropietario,
  Renovacion,
  RenovacionStatus,
  RenovacionHistoryItem,
} from '@/lib/types/inmobiliaria';
import { MOCK_PROPIETARIOS, MOCK_AGENTES, MOCK_CONSIGNACIONES, getPropietarioById, getAgenteById } from './mock-inmobiliaria-core';
import { MOCK_COBROS, MOCK_DISPERSIONES, getCobrosForPropietario } from './mock-inmobiliaria-operations';

// ============================================================================
// Cartera & Extracto Reports
// ============================================================================

export function generateCarteraReport(): CarteraReport {
  const lateItems = MOCK_COBROS.filter(
    (c) => c.status === 'late' || (c.status === 'pending' && c.daysLate > 0)
  );

  const items: CarteraItem[] = lateItems.map((c) => {
    const agente = getAgenteById(c.agenteId);
    const propietario = getPropietarioById(c.propietarioId);

    return {
      cobroId: c.id,
      propertyTitle: c.propertyTitle,
      propertyAddress: c.propertyAddress,
      tenantName: c.tenantName,
      tenantPhone: c.tenantPhone,
      propietarioName: propietario?.name || 'N/A',
      agenteId: c.agenteId,
      agenteName: agente?.name || 'N/A',
      month: c.month,
      totalAmount: c.totalWithFees,
      paidAmount: c.paidAmount,
      pendingAmount: c.pendingAmount,
      daysLate: c.daysLate,
      bucket:
        c.daysLate <= 30
          ? '0-30'
          : c.daysLate <= 60
          ? '31-60'
          : c.daysLate <= 90
          ? '61-90'
          : '90+',
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: {
      totalPending: items.reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket0to30: items.filter((i) => i.bucket === '0-30').reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket31to60: items.filter((i) => i.bucket === '31-60').reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket61to90: items.filter((i) => i.bucket === '61-90').reduce((sum, i) => sum + i.pendingAmount, 0),
      bucket90plus: items.filter((i) => i.bucket === '90+').reduce((sum, i) => sum + i.pendingAmount, 0),
    },
  };
}

export function generateExtractoPropietario(
  propietarioId: string,
  month: string
): ExtractoPropietario | null {
  const propietario = getPropietarioById(propietarioId);
  if (!propietario) return null;

  const cobros = getCobrosForPropietario(propietarioId, month);
  const dispersion = MOCK_DISPERSIONES.find(
    (d) => d.propietarioId === propietarioId && d.month === month
  );

  return {
    propietarioId,
    propietarioName: propietario.name,
    month,
    generatedAt: new Date().toISOString(),
    properties: cobros.map((c) => {
      const consignacion = MOCK_CONSIGNACIONES.find((cons) => cons.id === c.consignacionId);
      const commissionPercent = consignacion?.commissionPercent || 10;
      const commissionAmount = Math.round(c.paidAmount * (commissionPercent / 100));

      return {
        propertyId: c.propertyId,
        propertyTitle: c.propertyTitle,
        propertyAddress: c.propertyAddress,
        tenantName: c.tenantName,
        rentAmount: c.rentAmount,
        adminAmount: c.adminAmount,
        totalCollected: c.paidAmount,
        commissionPercent,
        commissionAmount,
        netAmount: c.paidAmount - commissionAmount,
        paymentDate: c.paidDate,
        paymentStatus: c.status,
      };
    }),
    summary: {
      totalProperties: cobros.length,
      totalCollected: cobros.reduce((sum, c) => sum + c.paidAmount, 0),
      totalCommissions: dispersion?.totalCommission || 0,
      netToPropietario: dispersion?.netToPropietario || 0,
      paymentDate: dispersion?.processedAt,
      paymentReference: dispersion?.transferReference,
    },
  };
}

// ============================================================================
// Report Definitions (Centro de Reportes)
// ============================================================================

export const MOCK_REPORTS: ReportDefinition[] = [
  {
    id: 'extractos-propietarios',
    title: 'Extractos Propietarios',
    description: 'Extracto mensual detallado por propietario con cobros y comisiones',
    icon: 'FileText',
    category: 'financiero',
    format: 'pdf',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
    isFavorite: true,
  },
  {
    id: 'cartera-edades',
    title: 'Cartera por Edades',
    description: 'Analisis de mora segmentado por antiguedad (30/60/90+ dias)',
    icon: 'Clock',
    category: 'financiero',
    format: 'excel',
    frequency: 'weekly',
    lastGenerated: '2026-02-05',
    isFavorite: true,
  },
  {
    id: 'comisiones-agente',
    title: 'Comisiones por Agente',
    description: 'Desglose de comisiones generadas por cada agente',
    icon: 'Users',
    category: 'agentes',
    format: 'excel',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
  {
    id: 'ocupacion-portafolio',
    title: 'Ocupacion del Portafolio',
    description: 'Porcentaje de ocupacion por zona y tipo de propiedad',
    icon: 'ChartPie',
    category: 'operativo',
    format: 'pdf',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
  {
    id: 'vencimientos',
    title: 'Vencimientos de Contratos',
    description: 'Contratos proximos a vencer en los proximos 90 dias',
    icon: 'Calendar',
    category: 'operativo',
    format: 'excel',
    frequency: 'weekly',
    lastGenerated: '2026-02-03',
    isFavorite: true,
  },
  {
    id: 'rendimiento-agentes',
    title: 'Rendimiento de Agentes',
    description: 'KPIs comparativos de desempeno del equipo comercial',
    icon: 'ChartBar',
    category: 'agentes',
    format: 'pdf',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
  {
    id: 'flujo-caja',
    title: 'Flujo de Caja',
    description: 'Ingresos vs dispersiones con proyeccion mensual',
    icon: 'CurrencyDollar',
    category: 'financiero',
    format: 'excel',
    frequency: 'monthly',
    lastGenerated: '2026-02-01',
  },
];

// Helper to generate mock agent commission report data
export function generateComisionesAgenteReport(
  period: string // '2026-02' or '2026-Q1'
): ComisionesAgenteReport {
  const activeAgentes = MOCK_AGENTES.filter((a) => a.status === 'active');

  const agentes: ComisionAgente[] = activeAgentes.map((agente) => {
    const assignedConsignaciones = MOCK_CONSIGNACIONES.filter(
      (c) => c.agenteId === agente.id
    );
    const topProperty = assignedConsignaciones.find(
      (c) => c.availability === 'rented'
    )?.propertyTitle;

    const previousCommission = Math.round(agente.metrics.commissionsThisMonth * 0.9);
    const trend: 'up' | 'down' | 'stable' =
      agente.metrics.commissionsThisMonth > previousCommission ? 'up' :
      agente.metrics.commissionsThisMonth < previousCommission ? 'down' : 'stable';

    return {
      agenteId: agente.id,
      agenteName: agente.name,
      agenteAvatar: agente.avatar,
      closedDeals: agente.metrics.closedThisMonth,
      totalCommission: agente.metrics.commissionsThisMonth,
      avgCommissionPerDeal:
        agente.metrics.closedThisMonth > 0
          ? Math.round(
              agente.metrics.commissionsThisMonth /
                agente.metrics.closedThisMonth
            )
          : 0,
      topPropertyTitle: topProperty,
      previousPeriodCommission: previousCommission,
      trend,
    };
  });

  const totalCommissions = agentes.reduce((sum, a) => sum + a.totalCommission, 0);
  const totalClosedDeals = agentes.reduce((sum, a) => sum + a.closedDeals, 0);
  const topAgent = agentes.reduce((top, a) =>
    a.totalCommission > (top?.totalCommission || 0) ? a : top, agentes[0]
  );

  return {
    generatedAt: new Date().toISOString(),
    period,
    totalCommissions,
    avgCommissionPerAgent: agentes.length > 0 ? Math.round(totalCommissions / agentes.length) : 0,
    totalClosedDeals,
    topAgentName: topAgent?.agenteName || 'N/A',
    agentes,
  };
}

// Helper to generate occupancy report data
export function generateOcupacionReport(): OcupacionReport {
  // Group consignaciones by zone
  const zoneMap = new Map<
    string,
    { total: number; occupied: number; available: number; inProcess: number }
  >();

  MOCK_CONSIGNACIONES.filter((c) => c.status === 'active').forEach((c) => {
    const zone = c.propertyZone;
    const existing = zoneMap.get(zone) || {
      total: 0,
      occupied: 0,
      available: 0,
      inProcess: 0,
    };

    existing.total++;
    if (c.availability === 'rented') existing.occupied++;
    else if (c.availability === 'available') existing.available++;
    else if (c.availability === 'in_process') existing.inProcess++;

    zoneMap.set(zone, existing);
  });

  const zones: OcupacionZone[] = Array.from(zoneMap.entries()).map(([zone, data]) => ({
    zone,
    totalProperties: data.total,
    occupied: data.occupied,
    available: data.available,
    inProcess: data.inProcess,
    occupancyRate:
      data.total > 0 ? Math.round((data.occupied / data.total) * 100) : 0,
  }));

  const totalProperties = zones.reduce((sum, z) => sum + z.totalProperties, 0);
  const totalOccupied = zones.reduce((sum, z) => sum + z.occupied, 0);
  const totalInProcess = zones.reduce((sum, z) => sum + z.inProcess, 0);
  const totalAvailable = zones.reduce((sum, z) => sum + z.available, 0);
  const overallOccupancyRate =
    totalProperties > 0
      ? Math.round((totalOccupied / totalProperties) * 100)
      : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalProperties,
    totalOccupied,
    totalInProcess,
    totalAvailable,
    overallOccupancyRate,
    previousMonthOccupancyRate: overallOccupancyRate - 2, // Mock previous month
    zones,
  };
}

// Helper to generate lease expiration report data
export function generateVencimientosReport(): VencimientosReport {
  const today = new Date();

  const getBucket = (days: number): '0-30' | '31-60' | '61-90' | '90+' => {
    if (days <= 30) return '0-30';
    if (days <= 60) return '31-60';
    if (days <= 90) return '61-90';
    return '90+';
  };

  const items: VencimientoItem[] = MOCK_CONSIGNACIONES.filter(
    (c) => c.availability === 'rented' && c.leaseEndDate
  )
    .map((c) => {
      const leaseEnd = new Date(c.leaseEndDate!);
      const daysUntilExpiry = Math.ceil(
        (leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );
      const propietario = MOCK_PROPIETARIOS.find(
        (p) => p.id === c.propietarioId
      );

      return {
        consignacionId: c.id,
        propertyId: c.propertyId,
        propertyTitle: c.propertyTitle,
        propertyAddress: c.propertyAddress,
        tenantName: c.currentTenantName || 'N/A',
        tenantPhone: '+57 300 123 4567', // Mock phone
        propietarioName: propietario?.name || 'N/A',
        contractEndDate: c.leaseEndDate!,
        daysUntilExpiry,
        renewalStatus: 'pending' as const,
        bucket: getBucket(daysUntilExpiry),
      };
    })
    .filter((item) => item.daysUntilExpiry > 0 && item.daysUntilExpiry <= 120)
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  return {
    generatedAt: new Date().toISOString(),
    items,
    summary: {
      totalVencimientos: items.length,
      bucket0to30: items.filter((i) => i.bucket === '0-30').length,
      bucket31to60: items.filter((i) => i.bucket === '31-60').length,
      bucket61to90: items.filter((i) => i.bucket === '61-90').length,
      bucket90plus: items.filter((i) => i.bucket === '90+').length,
    },
  };
}

// Helper to generate cash flow report data
export function generateFlujoCajaReport(
  periodType: 'quarter' | 'semester' | 'year' = 'semester'
): FlujoCajaReport {
  // Generate months based on period
  const monthCount = periodType === 'quarter' ? 3 : periodType === 'semester' ? 6 : 12;
  const now = new Date();
  const baseIngresos = 85000000; // ~85M COP base

  const months: FlujoCajaMonth[] = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

    // Add some variance to make it realistic
    const variance = 1 + (Math.sin(i * 0.8) * 0.15);
    const ingresos = Math.round(baseIngresos * variance);
    const avgCommission = 0.095; // ~9.5% average commission
    const comisiones = Math.round(ingresos * avgCommission);
    const dispersiones = ingresos - comisiones;

    months.push({
      month: monthStr,
      ingresos,
      dispersiones,
      comisiones,
      balance: comisiones, // Net balance is the commission retained
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    period: periodType,
    months,
    totals: {
      totalIngresos: months.reduce((sum, m) => sum + m.ingresos, 0),
      totalDispersiones: months.reduce((sum, m) => sum + m.dispersiones, 0),
      totalComisiones: months.reduce((sum, m) => sum + m.comisiones, 0),
      netBalance: months.reduce((sum, m) => sum + m.balance, 0),
    },
  };
}

// Get all available zones from consignaciones
export function getAvailableZones(): string[] {
  const zones = new Set<string>();
  MOCK_CONSIGNACIONES.forEach((c) => {
    if (c.propertyZone) zones.add(c.propertyZone);
  });
  return Array.from(zones).sort();
}

// ============================================================================
// IPC Historical Data (DANE Colombia)
// ============================================================================

export interface IPCRecord {
  year: number;
  month: number; // 1-12
  rate: number; // Annual IPC rate as of that month
  description: string;
}

// Historical IPC rates from DANE Colombia (mock data based on real patterns)
export const IPC_HISTORICAL: IPCRecord[] = [
  { year: 2024, month: 12, rate: 5.20, description: 'Diciembre 2024' },
  { year: 2024, month: 11, rate: 5.41, description: 'Noviembre 2024' },
  { year: 2024, month: 10, rate: 5.60, description: 'Octubre 2024' },
  { year: 2024, month: 9, rate: 5.80, description: 'Septiembre 2024' },
  { year: 2024, month: 8, rate: 6.12, description: 'Agosto 2024' },
  { year: 2024, month: 7, rate: 6.86, description: 'Julio 2024' },
  { year: 2024, month: 6, rate: 7.18, description: 'Junio 2024' },
  { year: 2024, month: 5, rate: 7.26, description: 'Mayo 2024' },
  { year: 2024, month: 4, rate: 7.16, description: 'Abril 2024' },
  { year: 2024, month: 3, rate: 7.36, description: 'Marzo 2024' },
  { year: 2024, month: 2, rate: 7.74, description: 'Febrero 2024' },
  { year: 2024, month: 1, rate: 8.35, description: 'Enero 2024' },
  { year: 2023, month: 12, rate: 9.28, description: 'Diciembre 2023' },
  { year: 2023, month: 11, rate: 10.15, description: 'Noviembre 2023' },
  { year: 2023, month: 10, rate: 10.48, description: 'Octubre 2023' },
  { year: 2023, month: 9, rate: 10.99, description: 'Septiembre 2023' },
  { year: 2023, month: 8, rate: 11.43, description: 'Agosto 2023' },
  { year: 2023, month: 7, rate: 11.78, description: 'Julio 2023' },
  { year: 2023, month: 6, rate: 12.13, description: 'Junio 2023' },
  { year: 2023, month: 5, rate: 12.36, description: 'Mayo 2023' },
  { year: 2023, month: 4, rate: 12.82, description: 'Abril 2023' },
  { year: 2023, month: 3, rate: 13.12, description: 'Marzo 2023' },
  { year: 2023, month: 2, rate: 13.28, description: 'Febrero 2023' },
  { year: 2023, month: 1, rate: 13.25, description: 'Enero 2023' },
];

export function getCurrentIPC(): IPCRecord {
  return IPC_HISTORICAL[0];
}

export function getIPCForDate(year: number, month: number): IPCRecord | undefined {
  return IPC_HISTORICAL.find((r) => r.year === year && r.month === month);
}

export function calculateNewRent(currentRent: number, ipcRate: number): number {
  return Math.round(currentRent * (1 + ipcRate / 100));
}

// ============================================================================
// Renovaciones (Contract Renewals)
// ============================================================================

/**
 * Generate mock renovaciones data from consignaciones with expiring leases
 * Creates a realistic distribution of renewal statuses
 */
export function generateMockRenovaciones(): Renovacion[] {
  const statuses: RenovacionStatus[] = [
    'pending', 'notified', 'negotiating', 'approved', 'signed', 'completed', 'terminated'
  ];

  const renovaciones: Renovacion[] = [];
  const today = new Date();

  // Generate renovaciones for properties with leases ending soon
  MOCK_CONSIGNACIONES
    .filter(c => c.currentLeaseId && c.leaseEndDate && c.availability === 'rented')
    .forEach((consignacion, index) => {
      const leaseEnd = new Date(consignacion.leaseEndDate!);
      const daysUntil = Math.ceil((leaseEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Only create renovacion for contracts expiring in next 90 days or recently expired
      if (daysUntil <= 90 && daysUntil > -30) {
        const bucket: Renovacion['urgencyBucket'] = daysUntil <= 30 ? '0-30'
          : daysUntil <= 60 ? '31-60'
          : daysUntil <= 90 ? '61-90'
          : '90+';

        // Distribute statuses - more urgent = more likely to be in advanced status
        const statusIndex = bucket === '0-30'
          ? Math.min(index % 4 + 3, 6) // More advanced statuses for critical
          : bucket === '31-60'
          ? (index % 5) + 1 // Middle statuses
          : index % 3; // Earlier statuses for less urgent

        const status = statuses[statusIndex];
        const currentRent = consignacion.monthlyRent;
        const ipcRate = getCurrentIPC().rate; // Use current IPC
        const proposedRent = calculateNewRent(currentRent, ipcRate);

        const propietario = MOCK_PROPIETARIOS.find(p => p.id === consignacion.propietarioId);
        const agente = MOCK_AGENTES.find(a => a.id === consignacion.agenteId);

        renovaciones.push({
          id: `ren-${String(index + 1).padStart(3, '0')}`,
          consignacionId: consignacion.id,
          leaseId: consignacion.currentLeaseId!,
          propertyId: consignacion.propertyId,
          propietarioId: consignacion.propietarioId,
          tenantId: `tenant-${index + 1}`,
          agenteId: consignacion.agenteId,
          propertyTitle: consignacion.propertyTitle,
          propertyAddress: consignacion.propertyAddress,
          tenantName: consignacion.currentTenantName || 'Inquilino No Registrado',
          tenantPhone: `+57 3${String(index).padStart(2, '0')} ${String(100 + index * 7).padStart(3, '0')} ${String(4567 + index * 11).padStart(4, '0')}`,
          tenantEmail: `inquilino${index + 1}@email.com`,
          propietarioName: propietario?.name || 'Propietario',
          currentRent,
          leaseStartDate: new Date(leaseEnd.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          leaseEndDate: consignacion.leaseEndDate!,
          daysUntilExpiry: Math.max(0, daysUntil),
          urgencyBucket: bucket,
          ipcRate,
          proposedRent,
          negotiatedRent: status === 'negotiating'
            ? Math.round(proposedRent * 0.98) // 2% discount during negotiation
            : status === 'approved' || status === 'signed' || status === 'completed'
            ? Math.round(proposedRent * 0.99) // 1% final discount
            : undefined,
          status,
          history: generateRenovacionHistory(status),
          notifiedAt: ['notified', 'negotiating', 'approved', 'signed', 'completed'].includes(status)
            ? new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          approvedAt: ['approved', 'signed', 'completed'].includes(status)
            ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          signedAt: ['signed', 'completed'].includes(status)
            ? new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          completedAt: status === 'completed'
            ? new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
            : undefined,
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    });

  // Sort by urgency (most urgent first)
  return renovaciones.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
}

/**
 * Generate workflow history for a renovacion based on status
 */
function generateRenovacionHistory(status: RenovacionStatus): RenovacionHistoryItem[] {
  const history: RenovacionHistoryItem[] = [
    {
      date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Renovacion creada automaticamente',
      actor: 'system',
      notes: 'Contrato proximo a vencer detectado'
    },
  ];

  if (['notified', 'negotiating', 'approved', 'signed', 'completed'].includes(status)) {
    history.push({
      date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Inquilino notificado sobre renovacion',
      actor: 'agent',
      notes: 'Email y mensaje enviados con propuesta de renovacion'
    });
  }

  if (['negotiating', 'approved', 'signed', 'completed'].includes(status)) {
    history.push({
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Inquilino solicito revision del incremento',
      actor: 'tenant',
      notes: 'Solicita considerar un incremento menor al IPC'
    });
    history.push({
      date: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Propietario consultado sobre ajuste',
      actor: 'agent',
      notes: 'Se presento contrapropuesta del inquilino al propietario'
    });
  }

  if (['approved', 'signed', 'completed'].includes(status)) {
    history.push({
      date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Terminos aprobados por propietario',
      actor: 'owner',
      notes: 'Propietario acepta incremento del 99% del IPC'
    });
    history.push({
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Inquilino acepto terminos finales',
      actor: 'tenant',
    });
  }

  if (['signed', 'completed'].includes(status)) {
    history.push({
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Contrato de renovacion firmado',
      actor: 'agent',
      notes: 'Firmas electronicas completadas por ambas partes'
    });
  }

  if (status === 'completed') {
    history.push({
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Renovacion completada',
      actor: 'system',
      notes: 'Nuevo contrato registrado y vigente'
    });
  }

  if (status === 'terminated') {
    history.push({
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Inquilino informo que no renovara',
      actor: 'tenant',
      notes: 'Se mudara a otra ciudad por motivos laborales'
    });
    history.push({
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      action: 'Propiedad marcada como disponible proxima',
      actor: 'agent',
      notes: 'Se iniciara proceso de busqueda de nuevo inquilino'
    });
  }

  return history;
}

// Generate the mock data on module load
export const MOCK_RENOVACIONES: Renovacion[] = generateMockRenovaciones();
