'use client';

import { useState, useEffect, useRef } from 'react';
import { Bed, Bathtub, CornersOut, Car, Building, Calendar, Stack, ArrowsOut, CaretDown } from '@phosphor-icons/react';
import { usePublish } from '@/lib/context/PublishContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface NumberInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  icon: React.ReactNode;
  suffix?: string;
  step?: number;
}

function NumberInput({ label, value, onChange, min = 0, max = 99, icon, suffix, step = 1 }: NumberInputProps) {
  const [localValue, setLocalValue] = useState(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync from parent when not focused
  useEffect(() => {
    if (!isFocused) setLocalValue(String(value));
  }, [value, isFocused]);

  const commit = (raw: string) => {
    const num = parseInt(raw);
    if (isNaN(num) || raw === "") {
      setLocalValue(String(value));
    } else {
      const clamped = Math.min(max, Math.max(min, num));
      onChange(clamped);
      setLocalValue(String(clamped));
    }
  };

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-neutral-900 dark:text-white">
        {icon}
        {label}
      </Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - step))}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-[#2a2a2c] transition-colors"
        >
          -
        </button>
        <div className="flex-1 relative">
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={localValue}
            onFocus={(e) => {
              setIsFocused(true);
              e.target.select();
            }}
            onChange={(e) => {
              const raw = e.target.value.replace(/[^0-9]/g, "");
              setLocalValue(raw);
            }}
            onBlur={() => {
              setIsFocused(false);
              commit(localValue);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                commit(localValue);
                (e.target as HTMLInputElement).blur();
              }
            }}
            className="text-center rounded-xl border-neutral-200 dark:border-neutral-700"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-neutral-500 dark:text-neutral-400">
              {suffix}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + step))}
          disabled={value >= max}
          className="w-10 h-10 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-500 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30 disabled:cursor-not-allowed bg-white dark:bg-[#2a2a2c] transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function YearPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) setLocalValue(String(value));
  }, [value, open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        commit(localValue);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, localValue]);

  // Scroll to selected year when grid opens + trap scroll inside dropdown
  useEffect(() => {
    if (!open || !gridRef.current) return;
    const el = gridRef.current;
    const selected = el.querySelector('[data-selected="true"]');
    if (selected) selected.scrollIntoView({ block: "center", behavior: "instant" });

    const handleWheel = (e: WheelEvent) => {
      const { scrollTop, scrollHeight, clientHeight } = el;
      const atTop = scrollTop <= 0 && e.deltaY < 0;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 1 && e.deltaY > 0;
      if (atTop || atBottom) {
        e.preventDefault();
      }
      e.stopPropagation();
    };
    const handleTouch = (e: TouchEvent) => { e.stopPropagation(); };
    el.addEventListener('wheel', handleWheel, { passive: false });
    el.addEventListener('touchmove', handleTouch, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      el.removeEventListener('touchmove', handleTouch);
    };
  }, [open]);

  const commit = (raw: string) => {
    const num = parseInt(raw);
    if (isNaN(num) || raw === "") {
      setLocalValue(String(value));
    } else {
      const clamped = Math.min(currentYear, Math.max(1900, num));
      onChange(clamped);
      setLocalValue(String(clamped));
    }
  };

  // Generate years from current year down to 1900
  const years = Array.from({ length: currentYear - 1900 + 1 }, (_, i) => currentYear - i);

  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2 text-neutral-900 dark:text-white">
        <Calendar className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
        Año de construcción
      </Label>
      <div ref={containerRef} className="relative max-w-[200px]">
        <Input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={localValue}
          onFocus={(e) => {
            setOpen(true);
            e.target.select();
          }}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9]/g, "").slice(0, 4);
            setLocalValue(raw);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              commit(localValue);
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
            if (e.key === "Escape") {
              setOpen(false);
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="text-center pr-9 rounded-xl border-neutral-200 dark:border-neutral-700"
        />
        <CaretDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />

        {open && (
          <div
            ref={gridRef}
            className="absolute z-20 top-full mt-1 left-0 right-0 bg-white dark:bg-[#222224] border border-neutral-200 dark:border-neutral-700 shadow-lg max-h-[240px] overflow-y-auto overscroll-contain p-2 rounded-xl"
          >
            <div className="grid grid-cols-4 gap-1">
              {years.map((year) => (
                <button
                  key={year}
                  type="button"
                  data-selected={year === value}
                  onClick={() => {
                    onChange(year);
                    setLocalValue(String(year));
                    setOpen(false);
                  }}
                  className={cn(
                    "py-1.5 text-[13px] font-medium transition-colors rounded-lg",
                    year === value
                      ? "bg-primary text-white uppercase tracking-wide font-mono"
                      : "text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700"
                  )}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function StepDetails() {
  const { draft, updateDraft } = usePublish();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-medium text-neutral-900 dark:text-white mb-1">
          Características del inmueble
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Describe las especificaciones de tu propiedad
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <NumberInput
          label="Habitaciones"
          value={draft.bedrooms}
          onChange={(value) => updateDraft({ bedrooms: value })}
          min={1}
          max={8}
          icon={<Bed className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
        />

        <NumberInput
          label="Baños"
          value={draft.bathrooms}
          onChange={(value) => updateDraft({ bathrooms: value })}
          min={1}
          max={6}
          icon={<Bathtub className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
        />

        <NumberInput
          label="Área"
          value={draft.area}
          onChange={(value) => updateDraft({ area: value })}
          min={15}
          max={500}
          icon={<ArrowsOut className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
          suffix="m²"
          step={5}
        />

        <NumberInput
          label="Parqueaderos"
          value={draft.parkingSpaces}
          onChange={(value) => updateDraft({ parkingSpaces: value })}
          min={0}
          max={4}
          icon={<Car className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
        />

        <NumberInput
          label="Piso"
          value={draft.floor}
          onChange={(value) => updateDraft({ floor: value })}
          min={1}
          max={30}
          icon={<Building className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
        />

        <NumberInput
          label="Estrato"
          value={draft.stratum}
          onChange={(value) => updateDraft({ stratum: value })}
          min={1}
          max={6}
          icon={<Stack className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />}
        />
      </div>

      <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
        <YearPicker
          value={draft.yearBuilt}
          onChange={(value) => updateDraft({ yearBuilt: value })}
        />
      </div>
    </div>
  );
}
