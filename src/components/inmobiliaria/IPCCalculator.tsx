'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Calculator,
  TrendUp,
  TrendDown,
  ArrowRight,
  Calendar,
  Info,
  CheckCircle,
  Buildings,
  CurrencyDollar,
  Percent,
  ArrowsClockwise,
  Link as LinkIcon,
} from '@phosphor-icons/react';
import { IPC_HISTORICAL, getCurrentIPC, calculateNewRent, type IPCRecord } from '@/lib/data/mock-inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

interface IPCCalculatorProps {
  currentRent?: number;
  onCalculate?: (result: {
    currentRent: number;
    newRent: number;
    ipcRate: number;
    increase: number;
  }) => void;
  mode?: 'single' | 'bulk';
  properties?: Array<{ id: string; title: string; currentRent: number }>;
  onBulkApply?: (updates: Array<{ id: string; newRent: number }>) => void;
}

// ============================================================================
// IPC Trend Chart (CSS-only)
// ============================================================================

function IPCTrendChart({ data }: { data: IPCRecord[] }) {
  const last12Months = data.slice(0, 12).reverse();
  const maxRate = Math.max(...last12Months.map((d) => d.rate));
  const minRate = Math.min(...last12Months.map((d) => d.rate));
  const range = maxRate - minRate || 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Tendencia IPC (12 meses)</span>
        <span className="flex items-center gap-1">
          <TrendDown className="h-3 w-3 text-emerald-600" />
          <span>En descenso</span>
        </span>
      </div>
      <div className="relative h-24 flex items-end gap-1">
        <TooltipProvider>
          {last12Months.map((record, index) => {
            const height = ((record.rate - minRate) / range) * 80 + 20;
            const isCurrentMonth = index === last12Months.length - 1;

            return (
              <Tooltip key={`${record.year}-${record.month}`}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 rounded-t-sm transition-colors cursor-pointer ${
                      isCurrentMonth
                        ? 'bg-emerald-500'
                        : 'bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-medium">{record.description}</p>
                  <p className="text-sm text-muted-foreground">{record.rate.toFixed(2)}%</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{last12Months[0]?.description.split(' ')[0] || ''}</span>
        <span>{last12Months[last12Months.length - 1]?.description.split(' ')[0] || ''}</span>
      </div>
    </div>
  );
}

// ============================================================================
// Current IPC Display
// ============================================================================

function CurrentIPCDisplay({ ipc }: { ipc: IPCRecord }) {
  const previousIPC = IPC_HISTORICAL[1];
  const change = ipc.rate - (previousIPC?.rate || ipc.rate);
  const isDown = change < 0;

  return (
    <div className="flex items-center gap-4">
      <div>
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-foreground">{ipc.rate.toFixed(2)}</span>
          <span className="text-xl text-muted-foreground">%</span>
        </div>
        <p className="text-sm text-muted-foreground">{ipc.description}</p>
      </div>
      <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-sm ${
        isDown
          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
          : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
      }`}>
        {isDown ? (
          <TrendDown className="h-4 w-4" weight="bold" />
        ) : (
          <TrendUp className="h-4 w-4" weight="bold" />
        )}
        <span>{Math.abs(change).toFixed(2)}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// Calculator Form
// ============================================================================

function CalculatorForm({
  initialRent = 0,
  ipcRate,
  onCalculate,
}: {
  initialRent?: number;
  ipcRate: number;
  onCalculate?: (result: {
    currentRent: number;
    newRent: number;
    ipcRate: number;
    increase: number;
  }) => void;
}) {
  const [currentRent, setCurrentRent] = useState<string>(
    initialRent ? initialRent.toLocaleString('es-CO') : ''
  );
  const [useCustomRate, setUseCustomRate] = useState(false);
  const [customRate, setCustomRate] = useState<string>(ipcRate.toFixed(2));
  const [effectiveDate, setEffectiveDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 2).padStart(2, '0')}-01`;
  });
  const [result, setResult] = useState<{
    currentRent: number;
    newRent: number;
    ipcRate: number;
    increase: number;
  } | null>(null);

  const activeRate = useCustomRate ? parseFloat(customRate) || 0 : ipcRate;

  const handleCurrentRentChange = (value: string) => {
    // Remove non-numeric characters except dots
    const numericValue = value.replace(/[^\d]/g, '');
    const formatted = numericValue ? parseInt(numericValue).toLocaleString('es-CO') : '';
    setCurrentRent(formatted);
  };

  const handleCalculate = () => {
    const rentValue = parseInt(currentRent.replace(/\./g, '')) || 0;
    if (rentValue <= 0) return;

    const newRent = calculateNewRent(rentValue, activeRate);
    const calcResult = {
      currentRent: rentValue,
      newRent,
      ipcRate: activeRate,
      increase: newRent - rentValue,
    };
    setResult(calcResult);
    onCalculate?.(calcResult);
  };

  return (
    <div className="space-y-4">
      {/* Current Rent Input */}
      <div className="space-y-2">
        <Label htmlFor="currentRent" className="flex items-center gap-2">
          <CurrencyDollar className="h-4 w-4 text-muted-foreground" />
          Canon actual
        </Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input
            id="currentRent"
            value={currentRent}
            onChange={(e) => handleCurrentRentChange(e.target.value)}
            placeholder="2.500.000"
            className="pl-8"
          />
        </div>
      </div>

      {/* IPC Rate */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="ipcRate" className="flex items-center gap-2">
            <Percent className="h-4 w-4 text-muted-foreground" />
            Tasa IPC
          </Label>
          <div className="flex items-center gap-2">
            <Label htmlFor="customRate" className="text-xs text-muted-foreground">
              Personalizar
            </Label>
            <Switch
              id="customRate"
              checked={useCustomRate}
              onCheckedChange={setUseCustomRate}
            />
          </div>
        </div>
        <Input
          id="ipcRate"
          type="number"
          step="0.01"
          value={useCustomRate ? customRate : ipcRate.toFixed(2)}
          onChange={(e) => setCustomRate(e.target.value)}
          disabled={!useCustomRate}
          className={!useCustomRate ? 'bg-muted' : ''}
        />
        {!useCustomRate && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" />
            IPC vigente DANE Colombia
          </p>
        )}
      </div>

      {/* Effective Date */}
      <div className="space-y-2">
        <Label htmlFor="effectiveDate" className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          Fecha efectiva
        </Label>
        <Input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
        />
      </div>

      {/* Calculate Button */}
      <Button onClick={handleCalculate} className="w-full" size="lg">
        <Calculator className="h-4 w-4 mr-2" />
        Calcular incremento
      </Button>

      {/* Result Display */}
      {result && (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Canon actual</p>
                <p className="text-lg font-semibold">{formatCurrency(result.currentRent)}</p>
              </div>
              <ArrowRight className="h-6 w-6 text-emerald-600" weight="bold" />
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Nuevo canon</p>
                <p className="text-2xl font-bold text-emerald-600">{formatCurrency(result.newRent)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-emerald-200 dark:border-emerald-800">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Incremento</p>
                <p className="text-lg font-semibold text-emerald-600">+{formatCurrency(result.increase)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Porcentaje</p>
                <p className="text-lg font-semibold text-emerald-600">+{result.ipcRate.toFixed(2)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================================================
// Bulk Calculator
// ============================================================================

function BulkCalculator({
  properties,
  ipcRate,
  onBulkApply,
}: {
  properties: Array<{ id: string; title: string; currentRent: number }>;
  ipcRate: number;
  onBulkApply?: (updates: Array<{ id: string; newRent: number }>) => void;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(properties.map((p) => p.id)));

  const calculations = useMemo(() => {
    return properties.map((property) => ({
      ...property,
      newRent: calculateNewRent(property.currentRent, ipcRate),
      increase: calculateNewRent(property.currentRent, ipcRate) - property.currentRent,
    }));
  }, [properties, ipcRate]);

  const selectedCalculations = calculations.filter((c) => selectedIds.has(c.id));
  const totalCurrentRent = selectedCalculations.reduce((sum, c) => sum + c.currentRent, 0);
  const totalNewRent = selectedCalculations.reduce((sum, c) => sum + c.newRent, 0);
  const totalIncrease = totalNewRent - totalCurrentRent;

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleAll = () => {
    if (selectedIds.size === properties.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(properties.map((p) => p.id)));
    }
  };

  const handleApply = () => {
    const updates = selectedCalculations.map((c) => ({
      id: c.id,
      newRent: c.newRent,
    }));
    onBulkApply?.(updates);
  };

  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-900/10">
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground mb-1">
                {selectedIds.size} inmuebles seleccionados
              </p>
              <p className="text-lg font-semibold">{formatCurrency(totalCurrentRent)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total incremento</p>
              <p className="text-lg font-semibold text-emerald-600">+{formatCurrency(totalIncrease)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Nuevo total</p>
              <p className="text-lg font-bold text-emerald-600">{formatCurrency(totalNewRent)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <input
                  type="checkbox"
                  checked={selectedIds.size === properties.length}
                  onChange={toggleAll}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Inmueble</TableHead>
              <TableHead className="text-right">Canon actual</TableHead>
              <TableHead className="text-right">Incremento</TableHead>
              <TableHead className="text-right">Nuevo canon</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {calculations.map((calc) => (
              <TableRow key={calc.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(calc.id)}
                    onChange={() => toggleSelect(calc.id)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell className="font-medium">{calc.title}</TableCell>
                <TableCell className="text-right">{formatCurrency(calc.currentRent)}</TableCell>
                <TableCell className="text-right text-emerald-600">
                  +{formatCurrency(calc.increase)}
                </TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(calc.newRent)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Apply Button */}
      <Button onClick={handleApply} className="w-full" size="lg" disabled={selectedIds.size === 0}>
        <ArrowsClockwise className="h-4 w-4 mr-2" />
        Aplicar a {selectedIds.size} inmueble{selectedIds.size !== 1 ? 's' : ''}
      </Button>
    </div>
  );
}

// ============================================================================
// Info Section
// ============================================================================

function InfoSection() {
  return (
    <Card className="bg-slate-50 dark:bg-slate-900/50">
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Incremento de arrendamiento</h4>
            <p className="text-sm text-muted-foreground">
              Segun la Ley 820 de 2003, el canon de arrendamiento de vivienda urbana puede
              incrementarse anualmente en un porcentaje que no supere el IPC del ano inmediatamente anterior.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <a
                href="https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-al-consumidor-ipc"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
              >
                <LinkIcon className="h-3 w-3" />
                Ver IPC oficial (DANE)
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function IPCCalculator({
  currentRent,
  onCalculate,
  mode = 'single',
  properties = [],
  onBulkApply,
}: IPCCalculatorProps) {
  const [activeMode, setActiveMode] = useState<'single' | 'bulk'>(
    mode === 'bulk' && properties.length > 0 ? 'bulk' : 'single'
  );
  const currentIPC = getCurrentIPC();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Calculator className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <CardTitle className="text-lg">Calculadora IPC</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Calcula el incremento de canon basado en el IPC
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800 dark:text-emerald-400">
              DANE Colombia
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CurrentIPCDisplay ipc={currentIPC} />
        </CardContent>
      </Card>

      {/* IPC Trend */}
      <Card>
        <CardContent className="pt-4">
          <IPCTrendChart data={IPC_HISTORICAL} />
        </CardContent>
      </Card>

      {/* Mode Toggle (if bulk mode is available) */}
      {properties.length > 0 && (
        <div className="flex rounded-lg border p-1 bg-muted/50">
          <button
            onClick={() => setActiveMode('single')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeMode === 'single'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Calculator className="h-4 w-4" />
            Individual
          </button>
          <button
            onClick={() => setActiveMode('bulk')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeMode === 'bulk'
                ? 'bg-background shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Buildings className="h-4 w-4" />
            Masivo ({properties.length})
          </button>
        </div>
      )}

      {/* Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {activeMode === 'single' ? 'Calcular incremento' : 'Aplicacion masiva'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeMode === 'single' ? (
            <CalculatorForm
              initialRent={currentRent}
              ipcRate={currentIPC.rate}
              onCalculate={onCalculate}
            />
          ) : (
            <BulkCalculator
              properties={properties}
              ipcRate={currentIPC.rate}
              onBulkApply={onBulkApply}
            />
          )}
        </CardContent>
      </Card>

      {/* Info Section */}
      <InfoSection />
    </div>
  );
}
