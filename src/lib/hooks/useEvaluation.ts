'use client';

import { useState, useEffect, useCallback } from 'react';
import type { TenantEvaluation } from '@/lib/types/evaluation';
import type { RiskScore } from '@/lib/types/risk-score';

const STORAGE_KEY = 'leasefy_evaluation';

function generateVerificationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateMockScore(): RiskScore {
  const numericScore = Math.floor(Math.random() * 15) + 82; // 82-96
  const level = numericScore >= 85 ? 'A' : 'B';

  return {
    level,
    numericScore,
    categories: [
      {
        name: 'financial_stability',
        label: 'Estabilidad financiera',
        score: Math.floor(Math.random() * 10) + 85,
        weight: 0.35,
        factors: ['Ingresos estables verificados', 'Ratio deuda-ingreso saludable', 'Historial crediticio positivo'],
      },
      {
        name: 'rental_history',
        label: 'Historial de arrendamiento',
        score: Math.floor(Math.random() * 15) + 78,
        weight: 0.25,
        factors: ['Sin reportes negativos de arrendadores anteriores', 'Permanencia promedio mayor a 18 meses'],
      },
      {
        name: 'personal_profile',
        label: 'Perfil personal',
        score: Math.floor(Math.random() * 10) + 80,
        weight: 0.2,
        factors: ['Empleo estable por más de 2 años', 'Referencias personales verificadas'],
      },
      {
        name: 'document_verification',
        label: 'Verificación documental',
        score: Math.floor(Math.random() * 5) + 90,
        weight: 0.2,
        factors: ['Identidad verificada', 'Comprobantes de ingreso validados', 'Documentos completos'],
      },
    ],
    drivers: [
      'Ingresos mensuales estables y verificables',
      'Sin antecedentes negativos en arrendamientos previos',
      'Documentación completa y verificada',
      'Ratio de endeudamiento bajo',
    ],
    flags: [],
    suggestedConditions: [],
    aiExplanation:
      'Este perfil demuestra una sólida estabilidad financiera con ingresos verificados y un historial de arrendamiento limpio. La documentación está completa y validada, lo que indica un inquilino confiable con bajo riesgo de incumplimiento.',
  };
}

export function useEvaluation() {
  const [evaluation, setEvaluation] = useState<TenantEvaluation | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setEvaluation(JSON.parse(stored));
      } catch {
        setEvaluation(null);
      }
    }
    setIsLoading(false);
  }, []);

  const purchaseEvaluation = useCallback(() => {
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + 90);

    const score = generateMockScore();
    const newEvaluation: TenantEvaluation = {
      id: `eval_${Date.now()}`,
      tenantId: 'tenant_current',
      status: 'paid',
      score,
      paidAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      verificationCode: generateVerificationCode(),
      createdAt: now.toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(newEvaluation));
    setEvaluation(newEvaluation);
    return newEvaluation;
  }, []);

  return {
    evaluation,
    isLoading,
    isPaid: evaluation?.status === 'paid',
    score: evaluation?.score ?? null,
    purchaseEvaluation,
  };
}
