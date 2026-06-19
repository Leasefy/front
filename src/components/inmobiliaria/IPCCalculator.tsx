'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  CurrencyDollar,
  Percent,
  Link as LinkIcon,
} from '@phosphor-icons/react';
import { IPC_HISTORICAL, getCurrentIPC, calculateNewRent, type IPCRecord } from '@/lib/constants/inmobiliaria-data';
import { formatCurrency } from '@/lib/types/inmobiliaria';
import { useI18n } from '@/lib/i18n';

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
}

// ============================================================================
// IPC Trend Chart (CSS-only)
// ============================================================================

function IPCTrendChart({ data, t }: { data: IPCRecord[]; t: (key: string) => string }) {
  const last12Months = data.slice(0, 12).reverse();
  const maxRate = Math.max(...last12Months.map((d) => d.rate));
  const minRate = Math.min(...last12Months.map((d) => d.rate));
  const range = maxRate - minRate || 1;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">{t('inmobiliaria.finance.ipc.trend12m')}</span>
        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#E8F3EC] dark:bg-[#2C7A53]/15 text-xs font-medium text-[#2C7A53] dark:text-[#3EAE70]">
          <TrendDown className="h-3.5 w-3.5" weight="bold" />
          <span>{t('inmobiliaria.finance.ipc.decreasing')}</span>
        </span>
      </div>
      <div className="relative h-28 flex items-end gap-2 p-3 rounded-xl bg-muted/30">
        <TooltipProvider>
          {last12Months.map((record, index) => {
            const height = ((record.rate - minRate) / range) * 75 + 25;
            const isCurrentMonth = index === last12Months.length - 1;

            return (
              <Tooltip key={`${record.year}-${record.month}`}>
                <TooltipTrigger asChild>
                  <div
                    className={`flex-1 rounded-full transition-all cursor-pointer hover:scale-105 ${
                      isCurrentMonth
                        ? 'bg-[#1A40FF]'
                        : 'bg-[#EEF1FF] hover:bg-[#1A40FF] dark:bg-[#1A40FF] dark:hover:opacity-90'
                    }`}
                    style={{ height: `${height}%` }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{record.description}</p>
                  <p className="text-sm text-[#1A40FF] dark:text-[#5570FF]">{record.rate.toFixed(2)}%</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
      <div className="flex justify-between text-xs font-medium text-muted-foreground px-1">
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
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
          <Percent className="h-7 w-7 text-[#1A40FF] dark:text-[#5570FF]" weight="bold" />
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-foreground tracking-tight">{ipc.rate.toFixed(2)}</span>
            <span className="text-xl font-semibold text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground">{ipc.description}</p>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
        isDown
          ? 'bg-[#E8F3EC] text-[#2C7A53] dark:bg-[#2C7A53]/15 dark:text-[#3EAE70]'
          : 'bg-[#F8EAE7] text-[#C4503B] dark:bg-[#C4503B]/15 dark:text-[#E0664D]'
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
  t,
  locale,
}: {
  initialRent?: number;
  ipcRate: number;
  onCalculate?: (result: {
    currentRent: number;
    newRent: number;
    ipcRate: number;
    increase: number;
  }) => void;
  t: (key: string) => string;
  locale: string;
}) {
  const [currentRent, setCurrentRent] = useState<string>(
    initialRent ? initialRent.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : ''
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
    const formatted = numericValue ? parseInt(numericValue).toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') : '';
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
    <div className="space-y-5">
      {/* Current Rent Input */}
      <div className="space-y-2.5">
        <Label htmlFor="currentRent" className="flex items-center gap-2 text-sm font-medium">
          <div className="w-6 h-6 rounded-sm bg-[#E8F3EC] dark:bg-[#2C7A53]/15 flex items-center justify-center">
            <CurrencyDollar className="h-3.5 w-3.5 text-[#2C7A53] dark:text-[#3EAE70]" />
          </div>
          {t('inmobiliaria.finance.ipc.currentRent')}
        </Label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">$</span>
          <Input
            id="currentRent"
            value={currentRent}
            onChange={(e) => handleCurrentRentChange(e.target.value)}
            placeholder="2.500.000"
            className="pl-10 h-12 text-lg font-medium"
          />
        </div>
      </div>

      {/* IPC Rate */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <div className="w-6 h-6 rounded-sm bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
              <Percent className="h-3.5 w-3.5 text-[#1A40FF] dark:text-[#5570FF]" />
            </div>
            {t('inmobiliaria.finance.ipc.ipcRate')}
          </Label>
          <button
            type="button"
            onClick={() => setUseCustomRate(!useCustomRate)}
            className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
              useCustomRate
                ? 'bg-[#EEF1FF] text-[#1A40FF] dark:bg-[#1A40FF]/15 dark:text-[#5570FF] dark:bg-[#1A40FF]/40 dark:text-[#1A40FF]'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            {useCustomRate ? t('inmobiliaria.finance.ipc.useOfficial') : t('inmobiliaria.finance.ipc.customize')}
          </button>
        </div>
        {useCustomRate ? (
          <Input
            id="ipcRate"
            type="number"
            step="0.01"
            value={customRate}
            onChange={(e) => setCustomRate(e.target.value)}
            className="h-12 text-lg font-medium"
            placeholder="Ej: 5.20"
          />
        ) : (
          <div className="h-12 px-4 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40 flex items-center justify-between">
            <span className="text-xl font-bold text-[#1A40FF] dark:text-[#5570FF]">{ipcRate.toFixed(2)}%</span>
            <span className="text-xs font-medium text-[#1A40FF]/70 dark:text-[#1A40FF]/70 flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5" />
              DANE Colombia
            </span>
          </div>
        )}
      </div>

      {/* Effective Date */}
      <div className="space-y-2.5">
        <Label htmlFor="effectiveDate" className="flex items-center gap-2 text-sm font-medium">
          <div className="w-6 h-6 rounded-sm bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-[#1A40FF] dark:text-[#5570FF]" />
          </div>
          {t('inmobiliaria.finance.ipc.effectiveDate')}
        </Label>
        <Input
          id="effectiveDate"
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          className="h-12"
        />
      </div>

      {/* Calculate Button */}
      <Button onClick={handleCalculate} className="w-full h-12 text-base font-medium bg-[#1A40FF] hover:opacity-90" size="lg">
        <Calculator className="h-5 w-5 mr-2" />
        {t('inmobiliaria.finance.ipc.calculateIncrease')}
      </Button>

      {/* Result Display */}
      {result && (
        <div className="p-5 rounded-xl border border-border bg-muted/20">
          <div className="flex items-center justify-center gap-4 mb-5">
            <div className="text-center p-4 rounded-xl bg-card border border-border flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-1">{t('inmobiliaria.finance.ipc.currentRent')}</p>
              <p className="text-xl font-bold text-foreground">{formatCurrency(result.currentRent)}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#1A40FF] flex items-center justify-center shrink-0">
              <ArrowRight className="h-5 w-5 text-white" weight="bold" />
            </div>
            <div className="text-center p-4 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex-1 border border-[#1A40FF]/30 dark:border-[#1A40FF]/40">
              <p className="text-xs font-medium text-[#1A40FF] dark:text-[#5570FF] mb-1">{t('inmobiliaria.finance.ipc.newRent')}</p>
              <p className="text-2xl font-bold text-[#1A40FF] dark:text-[#5570FF]">{formatCurrency(result.newRent)}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('inmobiliaria.finance.ipc.increase')}</p>
              <p className="text-lg font-bold text-[#1A40FF] dark:text-[#5570FF]">+{formatCurrency(result.increase)}</p>
            </div>
            <div className="text-center p-3 rounded-xl bg-card border border-border">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">{t('inmobiliaria.finance.ipc.percentage')}</p>
              <p className="text-lg font-bold text-[#1A40FF] dark:text-[#5570FF]">+{result.ipcRate.toFixed(2)}%</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Info Section
// ============================================================================

function InfoSection({ t }: { t: (key: string) => string }) {
  return (
    <div className="p-5 rounded-xl border border-border bg-muted/20">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-[#EEF1FF] dark:bg-[#1A40FF]/15 flex items-center justify-center shrink-0">
          <Info className="h-5 w-5 text-[#1A40FF] dark:text-[#5570FF]" />
        </div>
        <div className="space-y-2">
          <h4 className="font-semibold text-foreground">{t('inmobiliaria.finance.ipc.rentIncrease')}</h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {t('inmobiliaria.finance.ipc.legalInfo')}
          </p>
          <a
            href="https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-precios-al-consumidor-ipc"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#1A40FF] dark:text-[#5570FF] hover:text-[#1A40FF] dark:hover:text-[#1A40FF] transition-colors"
          >
            <LinkIcon className="h-4 w-4" />
            {t('inmobiliaria.finance.ipc.viewOfficialIPC')}
            <ArrowRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function IPCCalculator({
  currentRent,
  onCalculate,
}: IPCCalculatorProps) {
  const { t, locale } = useI18n();
  const currentIPC = getCurrentIPC();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="rounded-xl">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-[#E8F3EC] dark:bg-[#2C7A53]/15">
                <Calculator className="h-6 w-6 text-[#2C7A53] dark:text-[#3EAE70]" />
              </div>
              <div>
                <CardTitle className="text-lg">{t('inmobiliaria.finance.ipc.calculator')}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {t('inmobiliaria.finance.ipc.calculatorDesc')}
                </p>
              </div>
            </div>
            <Badge variant="outline" className="bg-[#E8F3EC] border-[#2C7A53]/30 text-[#2C7A53] dark:bg-[#2C7A53]/30 dark:border-[#2C7A53]/30 dark:text-[#2C7A53]">
              DANE Colombia
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <CurrentIPCDisplay ipc={currentIPC} />
        </CardContent>
      </Card>

      {/* IPC Trend */}
      <Card className="rounded-xl">
        <CardContent className="pt-4">
          <IPCTrendChart data={IPC_HISTORICAL} t={t} />
        </CardContent>
      </Card>

      {/* Calculator */}
      <Card className="rounded-xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-[#E8F3EC] dark:bg-[#2C7A53]/15">
              <Calculator className="h-5 w-5 text-[#2C7A53] dark:text-[#3EAE70]" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('inmobiliaria.finance.ipc.calculateIncrease')}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {t('inmobiliaria.finance.ipc.calculateDesc')}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <CalculatorForm
            initialRent={currentRent}
            ipcRate={currentIPC.rate}
            onCalculate={onCalculate}
            t={t}
            locale={locale}
          />
        </CardContent>
      </Card>

      {/* Info Section */}
      <InfoSection t={t} />
    </div>
  );
}
