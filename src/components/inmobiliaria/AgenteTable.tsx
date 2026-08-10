'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
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
import { IconButton } from '@leasefy/cadence';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import {
  DropdownList,
  DropdownListTrigger,
  DropdownListContent,
  DropdownListItem,
} from '@/components/ui/dropdown-menu';
import { useI18n } from '@/lib/i18n';
import type { Agente, AgenteRole, AgenteStatus } from '@/lib/types/inmobiliaria';
import { formatCurrency } from '@/lib/types/inmobiliaria';

type SortField = 'name' | 'role' | 'status' | 'assignedProperties' | 'closedThisMonth' | 'commissionsThisMonth' | 'commissionSplit';
type SortDirection = 'asc' | 'desc';

interface AgenteTableProps {
  agentes: Agente[];
  onView: (agente: Agente) => void;
  onEdit: (agente: Agente) => void;
}

// Role badge colors — usado por el avatar fallback (color-coded por rol).
const ROLE_STYLES: Record<AgenteRole, { bg: string; text: string }> = {
  agent: {
    bg: 'bg-primary-soft',
    text: 'text-primary',
  },
  coordinator: {
    bg: 'bg-surface-muted',
    text: 'text-fg-muted',
  },
  director: {
    bg: 'bg-warning-soft',
    text: 'text-warning',
  },
};

// Rol → variant del Badge de Cadence (pill de rol).
const ROLE_BADGE_VARIANT = {
  agent: 'default',
  coordinator: 'secondary',
  director: 'warning',
} as const;

// Estado → variant del Badge de Cadence (pill de estado).
const STATUS_BADGE_VARIANT = {
  active: 'success',
  inactive: 'secondary',
  on_leave: 'warning',
} as const;

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
  const { t } = useI18n();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

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

  const SortableHeader = ({
    field,
    children,
    className,
  }: {
    field: SortField;
    children: React.ReactNode;
    className?: string;
  }) => (
    <TableHead className={cn('text-left p-4', className)}>
      {/* allowlist: table column-sort trigger — no Cadence primitive (DataTable has no sort) */}
      <button
        onClick={() => handleSort(field)}
        className="inline-flex items-center gap-1.5 hover:text-fg"
      >
        {children}
        {sortField === field && <SortIcon className="w-3.5 h-3.5" />}
      </button>
    </TableHead>
  );

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
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow className="border-b border-border bg-bg">
            <SortableHeader field="name">{t('inmobiliaria.agente.agentLabel')}</SortableHeader>
            <SortableHeader field="role">{t('inmobiliaria.agente.role')}</SortableHeader>
            <SortableHeader field="status">{t('inmobiliaria.agente.status')}</SortableHeader>
            <TableHead className="text-left p-4 hidden lg:table-cell">
              {t('inmobiliaria.agente.zone')}
            </TableHead>
            <SortableHeader field="assignedProperties">{t('inmobiliaria.agente.propsShort')}</SortableHeader>
            <SortableHeader field="closedThisMonth" className="hidden md:table-cell">{t('inmobiliaria.agente.closings')}</SortableHeader>
            <SortableHeader field="commissionsThisMonth" className="hidden md:table-cell">{t('inmobiliaria.agente.commissions')}</SortableHeader>
            <SortableHeader field="commissionSplit" className="hidden lg:table-cell">Split %</SortableHeader>
            <TableHead className="w-12 p-4" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedAgentes.map((agente, index) => {
            const roleStyle = ROLE_STYLES[agente.role];
            const initials = getInitials(agente.name);

            return (
              <motion.tr
                key={agente.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
                onClick={() => onView(agente)}
                className="border-t border-border-faint hover:bg-muted/50 cursor-pointer transition-colors"
              >
                {/* Agent Name + Avatar */}
                <TableCell className="p-4">
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
                </TableCell>

                {/* Role */}
                <TableCell className="p-4">
                  <Badge variant={ROLE_BADGE_VARIANT[agente.role]}>
                    {ROLE_LABELS[agente.role]}
                  </Badge>
                </TableCell>

                {/* Status */}
                <TableCell className="p-4">
                  <Badge variant={STATUS_BADGE_VARIANT[agente.status]}>
                    {STATUS_LABELS[agente.status]}
                  </Badge>
                </TableCell>

                {/* Zone */}
                <TableCell className="p-4 hidden lg:table-cell">
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
                </TableCell>

                {/* Assigned Properties */}
                <TableCell className="p-4">
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    {agente.metrics.assignedProperties}
                  </span>
                </TableCell>

                {/* Closings this month */}
                <TableCell className="p-4 hidden md:table-cell">
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    {agente.metrics.closedThisMonth}
                  </span>
                </TableCell>

                {/* Commissions this month */}
                <TableCell className="p-4 hidden md:table-cell">
                  <span className="font-semibold font-mono tabular-nums text-foreground">
                    {formatCurrency(agente.metrics.commissionsThisMonth)}
                  </span>
                </TableCell>

                {/* Commission Split */}
                <TableCell className="p-4 hidden lg:table-cell">
                  <Badge variant="default" className="font-mono tabular-nums">
                    {agente.commissionSplit}%
                  </Badge>
                </TableCell>

                {/* Actions */}
                <TableCell className="p-4">
                  <DropdownList>
                    <DropdownListTrigger asChild>
                      <IconButton
                        variant="ghost"
                        size="sm"
                        icon={<DotsThree className="w-5 h-5" weight="bold" />}
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Acciones"
                      />
                    </DropdownListTrigger>
                    <DropdownListContent align="end" className="w-40">
                      <DropdownListItem onSelect={() => onView(agente)}>
                        <Eye className="w-4 h-4" />
                        <span className="text-sm">{t('inmobiliaria.agente.viewDetail')}</span>
                      </DropdownListItem>
                      <DropdownListItem onSelect={() => onEdit(agente)}>
                        <PencilSimple className="w-4 h-4" />
                        <span className="text-sm">{t('inmobiliaria.agente.edit')}</span>
                      </DropdownListItem>
                    </DropdownListContent>
                  </DropdownList>
                </TableCell>
              </motion.tr>
            );
          })}
        </TableBody>
      </Table>

      {/* Empty State */}
      {sortedAgentes.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-surface-muted flex items-center justify-center">
            <Users className="w-6 h-6 text-fg-muted" weight="duotone" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-fg">
              {t('inmobiliaria.agente.noAgentsFound')}
            </h3>
            <p className="max-w-sm text-sm text-fg-muted">
              {t('inmobiliaria.agente.adjustFiltersOrAdd')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default AgenteTable;
