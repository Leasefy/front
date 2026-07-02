'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Shield, CheckCircle, XCircle } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { RISK_LEVELS, getRiskBadgeVariant } from '@/lib/types/risk-score';
import type { TenantEvaluation } from '@/lib/types/evaluation';
import { cn } from '@/lib/utils';

/**
 * Public verification page — no auth required.
 * Anyone with a verification code can confirm a tenant's evaluation is authentic.
 *
 * TODO (Backend): Replace localStorage lookup with API call:
 *   GET /api/evaluation/verify/{code}
 *   Returns masked tenant data + score level (not full score)
 */

function maskName(name: string): string {
  const parts = name.split(' ');
  return parts
    .map((part) => {
      if (part.length <= 2) return part;
      return part.slice(0, 3) + '***';
    })
    .join(' ');
}

export default function VerificarPage() {
  const params = useParams();
  const code = params.code as string;
  const [status, setStatus] = useState<'loading' | 'verified' | 'not_found'>('loading');
  const [evaluation, setEvaluation] = useState<TenantEvaluation | null>(null);

  useEffect(() => {
    // Mock: check localStorage for matching verification code
    // TODO (Backend): Replace with API call to GET /api/evaluation/verify/{code}
    const timer = setTimeout(() => {
      const stored = localStorage.getItem('leasefy_evaluation');
      if (stored) {
        try {
          const eval_ = JSON.parse(stored) as TenantEvaluation;
          if (eval_.verificationCode === code && eval_.status === 'paid') {
            setEvaluation(eval_);
            setStatus('verified');
            return;
          }
        } catch {
          // ignore
        }
      }
      setStatus('not_found');
    }, 800);

    return () => clearTimeout(timer);
  }, [code]);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-[#0f0f10] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Branding */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground">Leasefy</h1>
          <p className="text-sm text-muted-foreground mt-1">Verificación de evaluación</p>
        </div>

        {/* Card */}
        <div className="rounded-[22px] bg-white dark:bg-[#1a1a1c] border border-neutral-200 dark:border-neutral-800 overflow-hidden">
          {status === 'loading' && (
            <div className="p-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-[#1A40FF]/30 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-muted-foreground">Verificando código...</p>
            </div>
          )}

          {status === 'verified' && evaluation?.score && (
            <>
              {/* Success Banner */}
              <div className="bg-[#E8F3EC] dark:bg-[#2C7A53]/15 px-6 py-4 flex items-center gap-3 border-b border-[#2C7A53]/30 dark:border-[#2C7A53]/40">
                <CheckCircle className="w-6 h-6 text-[#2C7A53]" weight="fill" />
                <div>
                  <p className="text-sm font-semibold text-[#2C7A53] dark:text-[#3EAE70]">
                    Evaluación verificada
                  </p>
                  <p className="text-xs text-[#2C7A53] dark:text-[#3EAE70]">
                    Este documento es auténtico y fue generado por Leasefy.
                  </p>
                </div>
              </div>

              {/* Score Info */}
              <div className="p-6 space-y-5">
                {/* Masked Name */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Inquilino</p>
                  <p className="text-lg font-semibold text-foreground">
                    {maskName('Nicolas Garcia')}
                  </p>
                </div>

                {/* Score */}
                <div className="flex items-center gap-4">
                  <div className={cn(
                    'w-16 h-16 rounded-xl flex items-center justify-center',
                    evaluation.score.level === 'A' && 'bg-[#E8F3EC] dark:bg-[#2C7A53]/15',
                    evaluation.score.level === 'B' && 'bg-[#EEF1FF] dark:bg-[#1A40FF]/15',
                    evaluation.score.level === 'C' && 'bg-[#F8F0E0] dark:bg-[#B7791F]/15',
                    evaluation.score.level === 'D' && 'bg-[#F8EAE7] dark:bg-[#C4503B]/15',
                  )}>
                    <span className={cn(
                      'text-3xl font-bold',
                      evaluation.score.level === 'A' && 'text-[#2C7A53] dark:text-[#3EAE70]',
                      evaluation.score.level === 'B' && 'text-[#1A40FF] dark:text-[#5570FF]',
                      evaluation.score.level === 'C' && 'text-[#B7791F] dark:text-[#D2992F]',
                      evaluation.score.level === 'D' && 'text-[#C4503B] dark:text-[#E0664D]',
                    )}>
                      {evaluation.score.level}
                    </span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground font-mono tabular-nums">
                      {evaluation.score.numericScore} / 100
                    </p>
                    <Badge variant={getRiskBadgeVariant(evaluation.score.level)} className="mt-1">
                      {RISK_LEVELS[evaluation.score.level].label}
                    </Badge>
                  </div>
                </div>

                {/* Details */}
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Código</span>
                    <span className="font-mono font-medium text-foreground">{code}</span>
                  </div>
                  {evaluation.paidAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Fecha de evaluación</span>
                      <span className="text-foreground">
                        {new Date(evaluation.paidAt).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                  {evaluation.expiresAt && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Válido hasta</span>
                      <span className="text-foreground">
                        {new Date(evaluation.expiresAt).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {status === 'not_found' && (
            <div className="p-10 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-xl bg-[#F8EAE7] dark:bg-[#C4503B]/15 flex items-center justify-center">
                <XCircle className="w-7 h-7 text-[#C4503B]" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground mb-1">
                  Código no encontrado
                </p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  El código de verificación <span className="font-mono font-medium">{code}</span> no corresponde a ninguna evaluación activa.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Leasefy — Plataforma de gestión de arriendos
        </p>
      </div>
    </div>
  );
}
