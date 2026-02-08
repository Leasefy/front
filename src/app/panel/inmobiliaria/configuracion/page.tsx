'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Gear,
  Buildings,
  Palette,
  Users,
  ShieldCheck,
  Plugs,
  CreditCard,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import {
  ConfigPerfilAgencia,
  ConfigBranding,
  ConfigUsuarios,
  ConfigPermisos,
  ConfigIntegraciones,
  ConfigFacturacion,
} from '@/components/inmobiliaria';
import {
  MOCK_INMOBILIARIA_CONFIG_EXTENDED,
  MOCK_AGENCY_USERS,
  MOCK_INTEGRATIONS,
  MOCK_BILLING,
  MOCK_INVOICES,
} from '@/lib/data/mock-inmobiliaria';
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/types/inmobiliaria';
import type {
  InmobiliariaConfigExtended,
  AgencyBranding,
  AgencyUser,
  AgencyIntegration,
  RolePermissions,
  AgencyRole,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

type ConfigTab = 'perfil' | 'branding' | 'usuarios' | 'permisos' | 'integraciones' | 'facturacion';

interface TabConfig {
  id: ConfigTab;
  label: string;
  icon: React.ElementType;
  description: string;
}

// ============================================================================
// Constants
// ============================================================================

const TABS: TabConfig[] = [
  {
    id: 'perfil',
    label: 'Perfil',
    icon: Buildings,
    description: 'Informacion de la agencia',
  },
  {
    id: 'branding',
    label: 'Branding',
    icon: Palette,
    description: 'Logo, colores y estilo visual',
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: Users,
    description: 'Equipo y accesos',
  },
  {
    id: 'permisos',
    label: 'Permisos',
    icon: ShieldCheck,
    description: 'Roles y permisos',
  },
  {
    id: 'integraciones',
    label: 'Integraciones',
    icon: Plugs,
    description: 'Conexiones con servicios',
  },
  {
    id: 'facturacion',
    label: 'Facturacion',
    icon: CreditCard,
    description: 'Plan y pagos',
  },
];

// ============================================================================
// Main Component
// ============================================================================

/**
 * ConfiguracionPage - Agency configuration hub
 * Route: /panel/inmobiliaria/configuracion
 */
export default function ConfiguracionPage() {
  // State
  const [activeTab, setActiveTab] = useState<ConfigTab>('perfil');
  const [config, setConfig] = useState<InmobiliariaConfigExtended>(MOCK_INMOBILIARIA_CONFIG_EXTENDED);
  const [users, setUsers] = useState<AgencyUser[]>(MOCK_AGENCY_USERS);
  const [integrations, setIntegrations] = useState<AgencyIntegration[]>(MOCK_INTEGRATIONS);
  const [permissions, setPermissions] = useState<Record<AgencyRole, RolePermissions>>(
    DEFAULT_ROLE_PERMISSIONS
  );

  // -------------------------------------------------------------------------
  // Handlers - Perfil
  // -------------------------------------------------------------------------

  const handleSaveConfig = (newConfig: InmobiliariaConfigExtended) => {
    setConfig(newConfig);
    toast.success('Configuracion guardada', {
      description: 'Los cambios han sido aplicados correctamente',
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Branding
  // -------------------------------------------------------------------------

  const handleSaveBranding = (branding: AgencyBranding) => {
    setConfig((prev) => ({ ...prev, branding }));
    toast.success('Branding actualizado', {
      description: 'Los cambios de marca han sido guardados',
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Usuarios
  // -------------------------------------------------------------------------

  const handleInviteUser = () => {
    toast.info('Invitacion enviada', {
      description: 'Se ha enviado un email de invitacion al usuario',
    });
  };

  const handleUpdateRole = (userId: string, role: AgencyRole) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, role } : u))
    );
    toast.success('Rol actualizado');
  };

  const handleToggleStatus = (userId: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id !== userId) return u;
        const newStatus: AgencyUser['status'] = u.status === 'active' ? 'inactive' : 'active';
        return { ...u, status: newStatus };
      })
    );
    toast.success('Estado del usuario actualizado');
  };

  const handleResendInvite = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    toast.success('Invitacion reenviada', {
      description: user ? `Se reenvio la invitacion a ${user.email}` : 'Invitacion enviada',
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId));
    toast.success('Usuario eliminado');
  };

  // -------------------------------------------------------------------------
  // Handlers - Permisos
  // -------------------------------------------------------------------------

  const handleSavePermissions = (newPermissions: Record<AgencyRole, RolePermissions>) => {
    setPermissions(newPermissions);
    toast.success('Permisos actualizados', {
      description: 'Los cambios en los permisos han sido guardados',
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Integraciones
  // -------------------------------------------------------------------------

  const handleToggleIntegration = (integrationId: string, enabled: boolean) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === integrationId ? { ...i, isEnabled: enabled } : i))
    );
    toast.success(enabled ? 'Integracion activada' : 'Integracion desactivada');
  };

  const handleConfigureIntegration = (integrationId: string, config: Record<string, string>) => {
    const integration = integrations.find((i) => i.id === integrationId);
    toast.info('Configurar integracion', {
      description: `Abriendo configuracion de ${integration?.name || integrationId}`,
    });
  };

  // -------------------------------------------------------------------------
  // Handlers - Facturacion
  // -------------------------------------------------------------------------

  const handleUpdatePaymentMethod = () => {
    toast.info('Actualizar metodo de pago', {
      description: 'Abriendo formulario de pago',
    });
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
            <Gear className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          Configuracion
        </h1>
        <p className="text-muted-foreground mt-2">
          Administra la configuracion de tu inmobiliaria
        </p>
      </div>

      {/* Tabs Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-border pb-4">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className={cn('w-4 h-4', isActive && 'text-indigo-600 dark:text-indigo-400')} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content with Animation */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="min-h-[400px]"
      >
        {/* Perfil Tab */}
        {activeTab === 'perfil' && (
          <ConfigPerfilAgencia config={config} onSave={handleSaveConfig} />
        )}

        {/* Branding Tab */}
        {activeTab === 'branding' && (
          <ConfigBranding branding={config.branding} onSave={handleSaveBranding} />
        )}

        {/* Usuarios Tab */}
        {activeTab === 'usuarios' && (
          <ConfigUsuarios
            users={users}
            onInvite={handleInviteUser}
            onUpdateRole={handleUpdateRole}
            onToggleStatus={handleToggleStatus}
            onResendInvite={handleResendInvite}
            onDelete={handleDeleteUser}
          />
        )}

        {/* Permisos Tab */}
        {activeTab === 'permisos' && (
          <ConfigPermisos permissions={permissions} onSave={handleSavePermissions} />
        )}

        {/* Integraciones Tab */}
        {activeTab === 'integraciones' && (
          <ConfigIntegraciones
            integrations={integrations}
            onToggle={handleToggleIntegration}
            onConfigure={handleConfigureIntegration}
          />
        )}

        {/* Facturacion Tab */}
        {activeTab === 'facturacion' && (
          <ConfigFacturacion
            billing={MOCK_BILLING}
            invoices={MOCK_INVOICES}
            onUpdatePaymentMethod={handleUpdatePaymentMethod}
          />
        )}
      </motion.div>
    </div>
  );
}
