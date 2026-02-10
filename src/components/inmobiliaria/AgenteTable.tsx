'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SortAscending,
  SortDescending,
  DotsThree,
  Eye,
  PencilSimple,
  MapPin,
  Users,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n/use-translation';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'name' | 'role' | 'status' | 'assignedProperties' | 'closedThisMonth' | 'commissionsThisMonth' | 'commissionSplit';
type SortDirection = 'asc' | 'desc';

interface AgenteTableProps {
  agentes: Agente[];
  onView: (agente: Agente) => void;
  onEdit: (agente: Agente) => void;
}

// Role badge colors (labels moved inside component for i18n)
const ROLE_STYLES: Record<AgenteRole, { bg: string; text: string }> = {
  agent: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
  },
  coordinator: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
  },
  director: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
};

// Status badge colors (labels moved inside component for i18n)
const STATUS_STYLES: Record<AgenteStatus, { bg: string; text: string }> = {
  active: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  inactive: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-400',
  },
  on_leave: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
  },
};

// Role order for sorting
const ROLE_ORDER: Record<AgenteRole, number> = {
  director: 1,
  coordinator: 2,
  agent: 3,
};

// Status order for sorting
const STATUS_ORDER: Record<AgenteStatus, number> = {
  active: 1,
  on_leave: 2,
  inactive: 3,
};

/**
 * AgenteTable - Full-featured data table for agents
 * Includes sorting and row actions
 */
export function AgenteTable({
  agentes,
  onView,
  onEdit,
}: AgenteTableProps) {
  const { t } = useTranslation();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const ROLE_LABELS: Record<AgenteRole, string> = {
    agent: t('inmobiliaria.agente.roleAgent'),
    coordinator: t('inmobiliaria.agente.roleCoordinator'),
    director: t('inmobiliaria.agente.roleDirector'),
  };

  const STATUS_LABELS: Record<AgenteStatus, string> = {
    active: t('inmobiliaria.agente.statusActive'),
    inactive: t('inmobiliaria.agente.statusInactive'),
    on_leave: t('inmobiliaria.agente.statusOnLeaveShort'),
  };

  // Sort agentes
  const sortedAgentes = useMemo(() => {
    const result = [...agentes];

    result.sort((a, b) => {
      let aVal: string | number = '';
      let bVal: string | number = '';

      switch (sortField) {
        case 'name':
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case 'role':
          aVal = ROLE_ORDER[a.role];
          bVal = ROLE_ORDER[b.role];
          break;
        case 'status':
          aVal = STATUS_ORDER[a.status];
          bVal = STATUS_ORDER[b.status];
          break;
        case 'assignedProperties':
          aVal = a.metrics.assignedProperties;
          bVal = b.metrics.assignedProperties;
          break;
        case 'closedThisMonth':
          aVal = a.metrics.closedThisMonth;
          bVal = b.metrics.closedThisMonth;
          break;
        case 'commissionsThisMonth':
          aVal = a.metrics.commissionsThisMonth;
          bVal = b.metrics.commissionsThisMonth;
          break;
        case 'commissionSplit':
          aVal = a.commissionSplit;
          bVal = b.commissionSplit;
          break;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [agentes, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = sortDirection === 'asc' ? SortAscending : SortDescending;

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {t('inmobiliaria.agente.agentLabel')}
                {sortField === 'name' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('role')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {t('inmobiliaria.agente.role')}
                {sortField === 'role' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('status')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {t('inmobiliaria.agente.status')}
                {sortField === 'status' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden lg:table-cell">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {t('inmobiliaria.agente.zone')}
              </span>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('assignedProperties')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {t('inmobiliaria.agente.propsShort')}
                {sortField === 'assignedProperties' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden md:table-cell">
              <button
                onClick={() => handleSort('closedThisMonth')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {t('inmobiliaria.agente.closings')}
                {sortField === 'closedThisMonth' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden md:table-cell">
              <button
                onClick={() => handleSort('commissionsThisMonth')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                {t('inmobiliaria.agente.commissions')}
                {sortField === 'commissionsThisMonth' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden lg:table-cell">
              <button
                onClick={() => handleSort('commissionSplit')}
                className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground"
              >
                Split %
                {sortField === 'commissionSplit' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="w-12 p-4"></th>
          </tr>
        </thead>
        <tbody>
          {sortedAgentes.map((agente, index) => {
            const roleStyle = ROLE_STYLES[agente.role];
            const statusStyle = STATUS_STYLES[agente.status];
            const initials = getInitials(agente.name);

            return (
              <motion.tr
                key={agente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onView(agente)}
                className="hover:bg-muted/50 cursor-pointer transition-colors"
              >
                {/* Agent Name + Avatar */}
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    {agente.avatar ? (
                      <img
                        src={agente.avatar}
                        alt={agente.name}
                        className="w-10 h-10 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        roleStyle.bg
                      )}>
                        <span className={cn('text-sm font-semibold', roleStyle.text)}>
                          {initials}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-foreground truncate max-w-[200px]">
                        {agente.name}
                      </p>
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {agente.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="p-4">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', roleStyle.bg, roleStyle.text)}>
                    {ROLE_LABELS[agente.role]}
                  </span>
                </td>

                {/* Status */}
                <td className="p-4">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', statusStyle.bg, statusStyle.text)}>
                    {STATUS_LABELS[agente.status]}
                  </span>
                </td>

                {/* Zone */}
                <td className="p-4 hidden lg:table-cell">
                  {agente.zone ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-foreground truncate max-w-[120px]">
                        {agente.zone}
                      </span>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">-</span>
                  )}
                </td>

                {/* Assigned Properties */}
                <td className="p-4">
                  <span className="font-semibold text-foreground">
                    {agente.metrics.assignedProperties}
                  </span>
                </td>

                {/* Closings this month */}
                <td className="p-4 hidden md:table-cell">
                  <span className="font-semibold text-foreground">
                    {agente.metrics.closedThisMonth}
                  </span>
                </td>

                {/* Commissions this month */}
                <td className="p-4 hidden md:table-cell">
                  <span className="font-semibold text-foreground">
                    {formatCurrency(agente.metrics.commissionsThisMonth)}
                  </span>
                </td>

                {/* Commission Split */}
                <td className="p-4 hidden lg:table-cell">
                  <span className="inline-flex px-2.5 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm font-medium">
                    {agente.commissionSplit}%
                  </span>
                </td>

                {/* Actions */}
                <td className="p-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === agente.id ? null : agente.id);
                      }}
                      className="p-2 rounded-lg hover:bg-muted transition-colors"
                    >
                      <DotsThree className="w-5 h-5 text-muted-foreground" weight="bold" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === agente.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-40 p-2 rounded-xl border border-border bg-card shadow-xl z-10"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(agente);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.agente.viewDetail')}</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(agente);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-foreground hover:bg-muted transition-colors"
                          >
                            <PencilSimple className="w-4 h-4" />
                            <span className="text-sm">{t('inmobiliaria.agente.edit')}</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>

      {/* Empty State */}
      {sortedAgentes.length === 0 && (
        <div className="p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-1">
            {t('inmobiliaria.agente.noAgentsFound')}
          </h3>
          <p className="text-muted-foreground">
            {t('inmobiliaria.agente.adjustFiltersOrAdd')}
          </p>
        </div>
      )}
    </div>
  );
}

export default AgenteTable;
