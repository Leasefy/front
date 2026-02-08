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
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'name' | 'role' | 'status' | 'assignedProperties' | 'closedThisMonth' | 'commissionsThisMonth' | 'commissionSplit';
type SortDirection = 'asc' | 'desc';

interface AgenteTableProps {
  agentes: Agente[];
  onView: (agente: Agente) => void;
  onEdit: (agente: Agente) => void;
}

// Role badge colors
const ROLE_COLORS: Record<AgenteRole, { bg: string; text: string; label: string }> = {
  agent: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Agente',
  },
  coordinator: {
    bg: 'bg-purple-100 dark:bg-purple-900/30',
    text: 'text-purple-700 dark:text-purple-400',
    label: 'Coordinador',
  },
  director: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Director',
  },
};

// Status badge colors
const STATUS_COLORS: Record<AgenteStatus, { bg: string; text: string; label: string }> = {
  active: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    text: 'text-emerald-700 dark:text-emerald-400',
    label: 'Activo',
  },
  inactive: {
    bg: 'bg-neutral-100 dark:bg-neutral-800',
    text: 'text-neutral-600 dark:text-neutral-400',
    label: 'Inactivo',
  },
  on_leave: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Licencia',
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
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c]">
      <table className="w-full min-w-[900px]">
        <thead>
          <tr className="border-b border-neutral-100 dark:border-neutral-800">
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('name')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Agente
                {sortField === 'name' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('role')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Rol
                {sortField === 'role' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('status')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Estado
                {sortField === 'status' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden lg:table-cell">
              <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Zona
              </span>
            </th>
            <th className="text-left p-4">
              <button
                onClick={() => handleSort('assignedProperties')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Props.
                {sortField === 'assignedProperties' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden md:table-cell">
              <button
                onClick={() => handleSort('closedThisMonth')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Cierres
                {sortField === 'closedThisMonth' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden md:table-cell">
              <button
                onClick={() => handleSort('commissionsThisMonth')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
              >
                Comisiones
                {sortField === 'commissionsThisMonth' && <SortIcon className="w-3.5 h-3.5" />}
              </button>
            </th>
            <th className="text-left p-4 hidden lg:table-cell">
              <button
                onClick={() => handleSort('commissionSplit')}
                className="flex items-center gap-2 text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider hover:text-neutral-700 dark:hover:text-neutral-200"
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
            const role = ROLE_COLORS[agente.role];
            const status = STATUS_COLORS[agente.status];
            const initials = getInitials(agente.name);

            return (
              <motion.tr
                key={agente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onView(agente)}
                className="border-b border-neutral-50 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-[#141416] cursor-pointer transition-colors"
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
                        role.bg
                      )}>
                        <span className={cn('text-sm font-semibold', role.text)}>
                          {initials}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900 dark:text-white truncate max-w-[200px]">
                        {agente.name}
                      </p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate max-w-[200px]">
                        {agente.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Role */}
                <td className="p-4">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', role.bg, role.text)}>
                    {role.label}
                  </span>
                </td>

                {/* Status */}
                <td className="p-4">
                  <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-medium', status.bg, status.text)}>
                    {status.label}
                  </span>
                </td>

                {/* Zone */}
                <td className="p-4 hidden lg:table-cell">
                  {agente.zone ? (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-neutral-400 shrink-0" />
                      <span className="text-neutral-700 dark:text-neutral-300 truncate max-w-[120px]">
                        {agente.zone}
                      </span>
                    </div>
                  ) : (
                    <span className="text-neutral-400">-</span>
                  )}
                </td>

                {/* Assigned Properties */}
                <td className="p-4">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {agente.metrics.assignedProperties}
                  </span>
                </td>

                {/* Closings this month */}
                <td className="p-4 hidden md:table-cell">
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {agente.metrics.closedThisMonth}
                  </span>
                </td>

                {/* Commissions this month */}
                <td className="p-4 hidden md:table-cell">
                  <span className="font-semibold text-neutral-900 dark:text-white">
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
                      className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    >
                      <DotsThree className="w-5 h-5 text-neutral-500" weight="bold" />
                    </button>

                    <AnimatePresence>
                      {openMenuId === agente.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="absolute right-0 top-full mt-1 w-40 p-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] shadow-xl z-10"
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onView(agente);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span className="text-sm">Ver detalle</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(agente);
                              setOpenMenuId(null);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                          >
                            <PencilSimple className="w-4 h-4" />
                            <span className="text-sm">Editar</span>
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center">
            <Users className="w-8 h-8 text-neutral-400" />
          </div>
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">
            No se encontraron agentes
          </h3>
          <p className="text-neutral-500 dark:text-neutral-400">
            Ajusta los filtros o agrega un nuevo agente
          </p>
        </div>
      )}
    </div>
  );
}

export default AgenteTable;
