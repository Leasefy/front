'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Settings,
  User,
  Bell,
  CreditCard,
  Shield,
  Users,
  Building2,
  Mail,
  Phone,
  Globe,
  Moon,
  Sun,
  ChevronRight,
  Check,
  Crown,
  Zap,
  X,
  Loader2,
  Monitor,
  AlertTriangle,
  Trash2,
  Camera,
  Copy,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getPlanById, MOCK_SUBSCRIPTION, PLANS } from '@/lib/data/mock-subscriptions';
import { getTeamMembers } from '@/lib/data/mock-team';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { toast } from 'sonner';

// Modal Component
function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
}) {
  if (!open) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={cn('relative bg-white w-full mx-4 shadow-xl', sizeClasses[size])}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-plan-border">
          <h3 className="text-lg font-semibold text-plan-primary">{title}</h3>
          <button onClick={onClose} className="text-plan-secondary hover:text-plan-primary">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// Mock sessions
const mockSessions = [
  { id: '1', device: 'Chrome en MacOS', location: 'Bogotá, Colombia', current: true, lastActive: 'Ahora' },
  { id: '2', device: 'App iOS', location: 'Bogotá, Colombia', current: false, lastActive: 'Hace 2 horas' },
];

type SettingsSection = 'profile' | 'notifications' | 'subscription' | 'team' | 'security' | 'preferences';

export default function ConfiguracionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');
  const [notifications, setNotifications] = useState({
    email_new_application: true,
    email_payment_received: true,
    email_contract_reminder: true,
    push_new_message: true,
    push_application_status: true,
    sms_urgent: false,
  });

  // Modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [sessions, setSessions] = useState(mockSessions);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '+57 310 123 4567',
    city: 'Bogotá, Colombia',
    bio: 'Propietario con más de 5 años de experiencia en el mercado inmobiliario de Bogotá.',
  });
  const [preferences, setPreferences] = useState({
    language: 'es-co',
    timezone: 'America/Bogota',
    currency: 'COP',
    theme: 'light',
  });

  const currentPlan = getPlanById(MOCK_SUBSCRIPTION.planId);
  const [teamMembersList, setTeamMembersList] = useState(getTeamMembers());

  // Handlers
  const handleSaveProfile = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Perfil actualizado correctamente');
  };

  const handlePhotoUpload = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setShowPhotoModal(false);
    toast.success('Foto de perfil actualizada');
  };

  const handlePasswordChange = async () => {
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('Las contraseñas no coinciden');
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setShowPasswordModal(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    toast.success('Contraseña actualizada correctamente');
  };

  const handleEnable2FA = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setTwoFactorEnabled(true);
    setShow2FAModal(false);
    toast.success('Autenticación de dos factores activada');
  };

  const handleInviteMember = async () => {
    if (!inviteForm.email) {
      toast.error('Ingresa un correo electrónico');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'viewer' });
    toast.success(`Invitación enviada a ${inviteForm.email}`);
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembersList(prev => prev.filter(m => m.id !== memberId));
    toast.success('Miembro eliminado del equipo');
  };

  const handleCloseSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    toast.success('Sesión cerrada correctamente');
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Preferencias guardadas');
  };

  const handleCancelSubscription = () => {
    toast.info('Para cancelar tu suscripción, contacta a soporte');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    toast.success('Cuenta eliminada. Serás redirigido...');
    setTimeout(() => router.push('/'), 2000);
  };

  const menuItems = [
    { id: 'profile', label: 'Perfil', icon: User },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'subscription', label: 'Suscripción', icon: CreditCard },
    { id: 'team', label: 'Equipo', icon: Users },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'preferences', label: 'Preferencias', icon: Settings },
  ];

  const ToggleSwitch = ({
    enabled,
    onToggle,
  }: {
    enabled: boolean;
    onToggle: () => void;
  }) => (
    <button
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer border-2 border-transparent transition-colors duration-200 ease-in-out',
        enabled ? 'bg-plan-primary' : 'bg-border'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 transform bg-white shadow-lg ring-0 transition duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  );

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">Configuración</h1>
          <p className="mt-1 text-plan-secondary">
            Administra tu cuenta y preferencias
          </p>
        </div>

        <div className="flex gap-6">
          {/* Sidebar Menu */}
          <div className="w-64 flex-shrink-0">
            <nav className="bg-white border border-plan-border">
              {menuItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id as SettingsSection)}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors border-b border-border last:border-0',
                      activeSection === item.id
                        ? 'bg-muted text-plan-primary font-medium'
                        : 'text-plan-secondary hover:bg-muted hover:text-plan-primary'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                    {activeSection === item.id && (
                      <ChevronRight className="w-4 h-4 ml-auto" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 bg-white border border-plan-border">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-plan-primary mb-6">Información del Perfil</h2>

                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-20 h-20 bg-muted flex items-center justify-center text-2xl font-semibold text-plan-secondary">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <button
                        onClick={() => setShowPhotoModal(true)}
                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-plan-primary text-white rounded-full flex items-center justify-center hover:bg-foreground"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => setShowPhotoModal(true)}
                        className="px-4 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground transition-colors"
                      >
                        Cambiar foto
                      </button>
                      <p className="text-xs text-plan-secondary mt-1">JPG, PNG. Max 2MB</p>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Nombre completo
                      </label>
                      <input
                        type="text"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Correo electrónico
                      </label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Biografía
                    </label>
                    <textarea
                      rows={3}
                      value={profileForm.bio}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, bio: e.target.value }))}
                      className="w-full px-4 py-3 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="px-6 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Guardando...' : 'Guardar cambios'}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-plan-primary mb-6">Preferencias de Notificaciones</h2>

                <div className="space-y-6">
                  {/* Email Notifications */}
                  <div>
                    <h3 className="text-sm font-medium text-plan-primary mb-4 flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Notificaciones por correo
                    </h3>
                    <div className="space-y-4">
                      {[
                        { key: 'email_new_application', label: 'Nueva aplicación recibida', desc: 'Cuando un candidato aplica a una de tus propiedades' },
                        { key: 'email_payment_received', label: 'Pago recibido', desc: 'Cuando recibes un pago de arriendo' },
                        { key: 'email_contract_reminder', label: 'Recordatorios de contratos', desc: 'Alertas sobre vencimientos de contratos' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                          <div>
                            <p className="text-sm font-medium text-plan-primary">{item.label}</p>
                            <p className="text-xs text-plan-secondary">{item.desc}</p>
                          </div>
                          <ToggleSwitch
                            enabled={notifications[item.key as keyof typeof notifications]}
                            onToggle={() => setNotifications(prev => ({
                              ...prev,
                              [item.key]: !prev[item.key as keyof typeof notifications]
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Push Notifications */}
                  <div>
                    <h3 className="text-sm font-medium text-plan-primary mb-4 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Notificaciones push
                    </h3>
                    <div className="space-y-4">
                      {[
                        { key: 'push_new_message', label: 'Nuevos mensajes', desc: 'Cuando recibes un mensaje de un inquilino o candidato' },
                        { key: 'push_application_status', label: 'Estado de aplicaciones', desc: 'Actualizaciones sobre el proceso de aplicación' },
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                          <div>
                            <p className="text-sm font-medium text-plan-primary">{item.label}</p>
                            <p className="text-xs text-plan-secondary">{item.desc}</p>
                          </div>
                          <ToggleSwitch
                            enabled={notifications[item.key as keyof typeof notifications]}
                            onToggle={() => setNotifications(prev => ({
                              ...prev,
                              [item.key]: !prev[item.key as keyof typeof notifications]
                            }))}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* SMS Notifications */}
                  <div>
                    <h3 className="text-sm font-medium text-plan-primary mb-4 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Notificaciones SMS
                    </h3>
                    <div className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-plan-primary">Alertas urgentes</p>
                        <p className="text-xs text-plan-secondary">Solo para situaciones críticas (pagos vencidos, emergencias)</p>
                      </div>
                      <ToggleSwitch
                        enabled={notifications.sms_urgent}
                        onToggle={() => setNotifications(prev => ({ ...prev, sms_urgent: !prev.sms_urgent }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Subscription Section */}
            {activeSection === 'subscription' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-plan-primary mb-6">Tu Suscripción</h2>

                {/* Current Plan */}
                <div className="p-4 border border-plan-border mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-12 h-12 flex items-center justify-center',
                        MOCK_SUBSCRIPTION.planId === 'free' ? 'bg-muted' : 'bg-plan-primary'
                      )}>
                        {MOCK_SUBSCRIPTION.planId === 'free' ? (
                          <Zap className="w-6 h-6 text-plan-secondary" />
                        ) : (
                          <Crown className="w-6 h-6 text-plan-accent" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-plan-primary">Plan {currentPlan.name}</p>
                        <p className="text-sm text-plan-secondary">
                          {MOCK_SUBSCRIPTION.planId === 'free'
                            ? 'Plan gratuito'
                            : `${formatCurrency(currentPlan.price.monthly)}/mes`}
                        </p>
                      </div>
                    </div>
                    {MOCK_SUBSCRIPTION.planId !== 'business' && (
                      <Link
                        href="/panel/upgrade"
                        className="px-4 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground transition-colors"
                      >
                        Mejorar Plan
                      </Link>
                    )}
                  </div>

                  {/* Features */}
                  <div className="grid grid-cols-2 gap-2">
                    {currentPlan.features.map((feature) => (
                      <div key={feature.id} className="flex items-center gap-2">
                        <div className={cn(
                          'w-4 h-4 flex items-center justify-center',
                          feature.included ? 'bg-plan-status-green-bg text-green-800' : 'bg-muted text-plan-muted'
                        )}>
                          <Check className="w-3 h-3" />
                        </div>
                        <span className={cn(
                          'text-sm',
                          feature.included ? 'text-foreground' : 'text-plan-muted line-through'
                        )}>
                          {feature.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Billing Info */}
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-plan-primary">Información de facturación</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-plan-secondary">Próximo cobro</p>
                      <p className="font-medium text-plan-primary">1 de febrero, 2026</p>
                    </div>
                    <div>
                      <p className="text-plan-secondary">Método de pago</p>
                      <p className="font-medium text-plan-primary">•••• 4242</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setShowPaymentModal(true)}
                      className="text-sm text-plan-primary font-medium hover:underline"
                    >
                      Gestionar método de pago
                    </button>
                    <button
                      onClick={handleCancelSubscription}
                      className="text-sm text-plan-secondary hover:text-destructive"
                    >
                      Cancelar suscripción
                    </button>
                  </div>
                </div>

                {/* Invoices */}
                <div className="mt-6 pt-6 border-t border-plan-border">
                  <h3 className="text-sm font-medium text-plan-primary mb-4">Historial de facturación</h3>
                  <div className="space-y-2">
                    {[
                      { date: 'Ene 1, 2026', amount: '$99.900', status: 'Pagado' },
                      { date: 'Dic 1, 2025', amount: '$99.900', status: 'Pagado' },
                      { date: 'Nov 1, 2025', amount: '$99.900', status: 'Pagado' },
                    ].map((invoice, i) => (
                      <div key={i} className="flex items-center justify-between py-2 text-sm">
                        <div className="flex items-center gap-4">
                          <span className="text-plan-secondary">{invoice.date}</span>
                          <span className="font-medium text-plan-primary">{invoice.amount}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-0.5 bg-plan-status-green-bg text-green-800 text-xs">{invoice.status}</span>
                          <button className="text-plan-secondary hover:text-plan-primary">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Team Section */}
            {activeSection === 'team' && (
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-plan-primary">Miembros del Equipo</h2>
                  <button
                    onClick={() => setShowInviteModal(true)}
                    className="px-4 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground transition-colors"
                  >
                    Invitar miembro
                  </button>
                </div>

                <div className="space-y-3">
                  {teamMembersList.map((member) => (
                    <div key={member.id} className="flex items-center justify-between p-4 border border-plan-border group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-muted flex items-center justify-center text-plan-secondary font-medium">
                          {(member.name || member.email).charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-plan-primary">{member.name || member.email}</p>
                          <p className="text-xs text-plan-secondary">{member.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={cn(
                          'px-2 py-1 text-xs font-medium',
                          member.role === 'admin' ? 'bg-plan-primary text-white' :
                          member.role === 'manager' ? 'bg-plan-status-blue-bg text-blue-800' :
                          'bg-muted text-plan-secondary'
                        )}>
                          {member.role === 'admin' ? 'Administrador' :
                           member.role === 'manager' ? 'Gerente' :
                           member.role === 'accountant' ? 'Contador' : 'Visualizador'}
                        </span>
                        <span className={cn(
                          'px-2 py-1 text-xs',
                          member.status === 'accepted' ? 'bg-plan-status-green-bg text-green-800' : 'bg-plan-status-yellow-bg text-yellow-800'
                        )}>
                          {member.status === 'accepted' ? 'Activo' : 'Pendiente'}
                        </span>
                        {member.role !== 'admin' && (
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-plan-muted hover:text-destructive transition-all"
                            title="Eliminar miembro"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {teamMembersList.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-plan-secondary">No hay miembros en tu equipo</p>
                    <button
                      onClick={() => setShowInviteModal(true)}
                      className="mt-4 text-sm text-plan-primary font-medium hover:underline"
                    >
                      Invitar al primer miembro
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-plan-primary mb-6">Seguridad de la Cuenta</h2>

                <div className="space-y-6">
                  {/* Password */}
                  <div className="p-4 border border-plan-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-plan-primary">Contraseña</p>
                        <p className="text-sm text-plan-secondary">Última actualización hace 30 días</p>
                      </div>
                      <button
                        onClick={() => setShowPasswordModal(true)}
                        className="px-4 py-2 border border-plan-border text-sm font-medium text-plan-primary hover:bg-muted transition-colors"
                      >
                        Cambiar contraseña
                      </button>
                    </div>
                  </div>

                  {/* 2FA */}
                  <div className="p-4 border border-plan-border">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-plan-primary">Autenticación de dos factores</p>
                        <p className="text-sm text-plan-secondary">
                          {twoFactorEnabled ? 'Protección activada' : 'Añade una capa extra de seguridad'}
                        </p>
                      </div>
                      {twoFactorEnabled ? (
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-1 bg-plan-status-green-bg text-green-800 text-xs font-medium">Activado</span>
                          <button
                            onClick={() => setShow2FAModal(true)}
                            className="px-4 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted transition-colors"
                          >
                            Gestionar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShow2FAModal(true)}
                          className="px-4 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground transition-colors"
                        >
                          Activar
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="p-4 border border-plan-border">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-medium text-plan-primary">Sesiones activas</p>
                        <p className="text-sm text-plan-secondary">{sessions.length} dispositivos conectados</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {sessions.map((session) => (
                        <div key={session.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-3">
                            <Monitor className="w-5 h-5 text-plan-secondary" />
                            <div>
                              <p className="text-sm font-medium text-plan-primary">{session.device}</p>
                              <p className="text-xs text-plan-secondary">{session.location} • {session.lastActive}</p>
                            </div>
                          </div>
                          {session.current ? (
                            <span className="px-2 py-1 bg-plan-status-green-bg text-green-800 text-xs">Actual</span>
                          ) : (
                            <button
                              onClick={() => handleCloseSession(session.id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Cerrar sesión
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    {sessions.length > 1 && (
                      <button
                        onClick={() => {
                          setSessions(prev => prev.filter(s => s.current));
                          toast.success('Todas las otras sesiones han sido cerradas');
                        }}
                        className="mt-4 w-full py-2 border border-red-300 text-red-800 text-sm font-medium hover:bg-red-50"
                      >
                        Cerrar todas las otras sesiones
                      </button>
                    )}
                  </div>

                  {/* Danger Zone */}
                  <div className="p-4 border border-red-200 bg-red-50/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-red-800">Eliminar cuenta</p>
                        <p className="text-sm text-destructive">Esta acción es permanente y no se puede deshacer</p>
                      </div>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="px-4 py-2 border border-red-300 text-red-800 text-sm font-medium hover:bg-plan-status-red-bg transition-colors"
                      >
                        Eliminar cuenta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Section */}
            {activeSection === 'preferences' && (
              <div className="p-6">
                <h2 className="text-lg font-semibold text-plan-primary mb-6">Preferencias</h2>

                <div className="space-y-6">
                  {/* Language */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Idioma
                    </label>
                    <select
                      value={preferences.language}
                      onChange={(e) => setPreferences(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full max-w-xs h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                    >
                      <option value="es-co">Español (Colombia)</option>
                      <option value="es-es">Español (España)</option>
                      <option value="en">English</option>
                    </select>
                  </div>

                  {/* Timezone */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Zona horaria
                    </label>
                    <select
                      value={preferences.timezone}
                      onChange={(e) => setPreferences(prev => ({ ...prev, timezone: e.target.value }))}
                      className="w-full max-w-xs h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                    >
                      <option value="America/Bogota">América/Bogotá (GMT-5)</option>
                      <option value="America/Lima">América/Lima (GMT-5)</option>
                      <option value="America/Mexico_City">América/Mexico_City (GMT-6)</option>
                    </select>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      Moneda
                    </label>
                    <select
                      value={preferences.currency}
                      onChange={(e) => setPreferences(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full max-w-xs h-10 px-4 bg-muted border border-plan-border text-sm focus:outline-none focus:ring-1 focus:ring-plan-primary"
                    >
                      <option value="COP">COP - Peso Colombiano</option>
                      <option value="USD">USD - Dólar Estadounidense</option>
                    </select>
                  </div>

                  {/* Theme */}
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-3">
                      Tema de la aplicación
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'light' }))}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                          preferences.theme === 'light'
                            ? 'bg-plan-primary text-white'
                            : 'border border-plan-border text-plan-secondary hover:bg-muted'
                        )}
                      >
                        <Sun className="w-4 h-4" />
                        Claro
                      </button>
                      <button
                        onClick={() => setPreferences(prev => ({ ...prev, theme: 'dark' }))}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                          preferences.theme === 'dark'
                            ? 'bg-plan-primary text-white'
                            : 'border border-plan-border text-plan-secondary hover:bg-muted'
                        )}
                      >
                        <Moon className="w-4 h-4" />
                        Oscuro
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleSavePreferences}
                    disabled={isLoading}
                    className="px-6 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    {isLoading ? 'Guardando...' : 'Guardar preferencias'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Photo Upload Modal */}
      <Modal open={showPhotoModal} onClose={() => setShowPhotoModal(false)} title="Cambiar foto de perfil">
        <div className="space-y-4">
          <div className="border-2 border-dashed border-plan-border rounded-sm p-8 text-center">
            <Camera className="w-12 h-12 text-plan-muted mx-auto mb-4" />
            <p className="text-sm text-plan-secondary mb-2">Arrastra una imagen o haz clic para seleccionar</p>
            <input type="file" accept="image/*" className="hidden" id="photo-upload" />
            <label
              htmlFor="photo-upload"
              className="inline-block px-4 py-2 bg-muted text-sm font-medium text-foreground cursor-pointer hover:bg-muted"
            >
              Seleccionar archivo
            </label>
            <p className="text-xs text-plan-muted mt-2">JPG, PNG. Máximo 2MB</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowPhotoModal(false)}
              className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handlePhotoUpload}
              disabled={isLoading}
              className="flex-1 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? 'Subiendo...' : 'Guardar foto'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Password Modal */}
      <Modal open={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Cambiar contraseña">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Contraseña actual</label>
            <input
              type="password"
              value={passwordForm.current}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, current: e.target.value }))}
              className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-primary/20"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Nueva contraseña</label>
            <input
              type="password"
              value={passwordForm.new}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, new: e.target.value }))}
              className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-primary/20"
              placeholder="Mínimo 8 caracteres"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirmar contraseña</label>
            <input
              type="password"
              value={passwordForm.confirm}
              onChange={(e) => setPasswordForm(prev => ({ ...prev, confirm: e.target.value }))}
              className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-primary/20"
              placeholder="Repetir contraseña"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handlePasswordChange}
              disabled={isLoading || !passwordForm.current || !passwordForm.new || !passwordForm.confirm}
              className="flex-1 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isLoading ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </div>
      </Modal>

      {/* 2FA Modal */}
      <Modal open={show2FAModal} onClose={() => setShow2FAModal(false)} title="Autenticación de dos factores">
        <div className="space-y-4">
          {!twoFactorEnabled ? (
            <>
              <div className="p-4 bg-green-50 border border-green-300 rounded-sm">
                <p className="text-sm text-green-800">
                  La autenticación de dos factores añade una capa extra de seguridad a tu cuenta.
                </p>
              </div>
              <p className="text-sm text-plan-secondary">
                Te enviaremos un código de verificación por SMS cada vez que inicies sesión desde un nuevo dispositivo.
              </p>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleEnable2FA}
                  disabled={isLoading}
                  className="flex-1 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                  {isLoading ? 'Activando...' : 'Activar 2FA'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="p-4 bg-plan-status-green-bg border border-green-300 rounded-sm flex items-center gap-3">
                <Check className="w-5 h-5 text-green-800" />
                <p className="text-sm text-green-800 font-medium">
                  La autenticación de dos factores está activada
                </p>
              </div>
              <button
                onClick={() => {
                  setTwoFactorEnabled(false);
                  setShow2FAModal(false);
                  toast.success('Autenticación de dos factores desactivada');
                }}
                className="w-full py-2 border border-red-300 text-red-800 text-sm font-medium hover:bg-red-50"
              >
                Desactivar 2FA
              </button>
            </>
          )}
        </div>
      </Modal>

      {/* Invite Member Modal */}
      <Modal open={showInviteModal} onClose={() => setShowInviteModal(false)} title="Invitar miembro">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Correo electrónico</label>
            <input
              type="email"
              value={inviteForm.email}
              onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-primary/20"
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Rol</label>
            <select
              value={inviteForm.role}
              onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value }))}
              className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-primary/20"
            >
              <option value="viewer">Visualizador - Solo puede ver información</option>
              <option value="accountant">Contador - Acceso a finanzas</option>
              <option value="manager">Gerente - Puede gestionar propiedades</option>
              <option value="admin">Administrador - Acceso completo</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowInviteModal(false)}
              className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleInviteMember}
              disabled={isLoading || !inviteForm.email}
              className="flex-1 py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {isLoading ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Payment Method Modal */}
      <Modal open={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Método de pago">
        <div className="space-y-4">
          <div className="p-4 border border-plan-border rounded-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-6 bg-indigo-900 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">VISA</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-plan-primary">•••• •••• •••• 4242</p>
                  <p className="text-xs text-plan-secondary">Vence 12/26</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-plan-status-green-bg text-green-800 text-xs">Principal</span>
            </div>
          </div>

          <button className="w-full py-3 border border-dashed border-border text-sm text-plan-secondary hover:border-plan-muted hover:text-foreground transition-colors">
            + Agregar nuevo método de pago
          </button>

          <div className="pt-2 border-t border-plan-border">
            <p className="text-xs text-plan-muted">
              Los pagos son procesados de forma segura. No almacenamos tu información de tarjeta.
            </p>
          </div>

          <button
            onClick={() => {
              setShowPaymentModal(false);
              toast.success('Configuración de pago actualizada');
            }}
            className="w-full py-2 bg-plan-primary text-white text-sm font-medium hover:bg-foreground"
          >
            Guardar cambios
          </button>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Eliminar cuenta">
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-sm flex gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Esta acción no se puede deshacer</p>
              <p className="text-xs text-destructive mt-1">
                Todos tus datos, propiedades, contratos y configuraciones serán eliminados permanentemente.
              </p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Escribe <span className="font-bold">ELIMINAR</span> para confirmar
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-destructive/20"
              placeholder="ELIMINAR"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeleteConfirmText('');
              }}
              className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={isLoading || deleteConfirmText !== 'ELIMINAR'}
              className="flex-1 py-2 bg-destructive text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {isLoading ? 'Eliminando...' : 'Eliminar cuenta'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
