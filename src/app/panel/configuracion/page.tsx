'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
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
  PenLine,
  Smartphone,
  Tablet,
  Laptop,
  MapPin,
  Clock,
  Wifi,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getPlanById, MOCK_SUBSCRIPTION, PLANS } from '@/lib/data/mock-subscriptions';
import { getTeamMembers } from '@/lib/data/mock-team';
import { formatCurrency } from '@/lib/data/mock-dashboard';
import { MOCK_LEASES } from '@/lib/data/mock-leases';
import { getPendingVisitCount } from '@/lib/data/mock-visits';
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
      <div className={cn('relative bg-white dark:bg-card w-full mx-4 shadow-xl', sizeClasses[size])}>
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
  {
    id: '1', device: 'Chrome en MacOS', location: 'Bogotá, Colombia', current: true,
    lastActive: 'Ahora', ip: '190.25.134.87', browser: 'Chrome 122', os: 'macOS Sonoma',
    deviceType: 'desktop' as const, loginDate: '2 feb 2026, 8:30 AM',
  },
  {
    id: '2', device: 'App iOS', location: 'Bogotá, Colombia', current: false,
    lastActive: 'Hace 2 horas', ip: '190.25.134.92', browser: 'PLan App 3.2', os: 'iOS 18.1',
    deviceType: 'mobile' as const, loginDate: '2 feb 2026, 7:15 AM',
  },
  {
    id: '3', device: 'Safari en iPad', location: 'Medellín, Colombia', current: false,
    lastActive: 'Hace 1 día', ip: '181.53.22.11', browser: 'Safari 17.3', os: 'iPadOS 18',
    deviceType: 'tablet' as const, loginDate: '1 feb 2026, 3:45 PM',
  },
  {
    id: '4', device: 'Firefox en Windows', location: 'Cali, Colombia', current: false,
    lastActive: 'Hace 3 días', ip: '200.116.45.33', browser: 'Firefox 123', os: 'Windows 11',
    deviceType: 'desktop' as const, loginDate: '30 ene 2026, 10:20 AM',
  },
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
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Form states
  const [isLoading, setIsLoading] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState<'intro' | 'setup' | 'verify' | 'recovery' | 'manage'>('intro');
  const [verificationCode, setVerificationCode] = useState(['', '', '', '', '', '']);
  const [verificationError, setVerificationError] = useState('');
  const [recoveryCodes] = useState([
    'ABCD-1234-EFGH', 'IJKL-5678-MNOP', 'QRST-9012-UVWX',
    'YZAB-3456-CDEF', 'GHIJ-7890-KLMN', 'OPQR-1234-STUV',
    'WXYZ-5678-ABCD', 'EFGH-9012-IJKL',
  ]);
  const [recoveryCodesCopied, setRecoveryCodesCopied] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'viewer' });
  const [inviteEmailError, setInviteEmailError] = useState('');
  const [sessions, setSessions] = useState(mockSessions);
  const [selectedSession, setSelectedSession] = useState<typeof mockSessions[0] | null>(null);
  const [showCloseAllConfirm, setShowCloseAllConfirm] = useState(false);
  const [closingSessionId, setClosingSessionId] = useState<string | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteStep, setDeleteStep] = useState<'review' | 'reason' | 'confirm' | 'processing'>('review');
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteReasonOther, setDeleteReasonOther] = useState('');
  const [exportRequested, setExportRequested] = useState(false);
  const profileInitial = {
    name: user?.name || '',
    email: user?.email || '',
    phone: '+57 310 123 4567',
    city: 'Bogotá, Colombia',
    bio: 'Propietario con más de 5 años de experiencia en el mercado inmobiliario de Bogotá.',
  };
  const [profileForm, setProfileForm] = useState(profileInitial);
  const profileDirty = JSON.stringify(profileForm) !== JSON.stringify(profileInitial);
  const { theme: currentTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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

  const handleOpen2FAModal = () => {
    setTwoFactorStep(twoFactorEnabled ? 'manage' : 'intro');
    setVerificationCode(['', '', '', '', '', '']);
    setVerificationError('');
    setRecoveryCodesCopied(false);
    setShow2FAModal(true);
  };

  const handleVerify2FA = async () => {
    const code = verificationCode.join('');
    if (code.length < 6) {
      setVerificationError('Ingresa el código completo de 6 dígitos');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    // Simulate: accept any 6-digit code for demo
    if (code === '000000') {
      setVerificationError('Código incorrecto. Intenta de nuevo.');
      setIsLoading(false);
      return;
    }
    setIsLoading(false);
    setTwoFactorStep('recovery');
  };

  const handleComplete2FA = () => {
    setTwoFactorEnabled(true);
    setShow2FAModal(false);
    toast.success('Autenticación de dos factores activada');
  };

  const handleDisable2FA = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setTwoFactorEnabled(false);
    setShow2FAModal(false);
    toast.success('Autenticación de dos factores desactivada');
  };

  const handleCopyRecoveryCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join('\n'));
    setRecoveryCodesCopied(true);
    toast.success('Códigos copiados al portapapeles');
  };

  const handleCodeInput = (index: number, value: string) => {
    if (value.length > 1) value = value.slice(-1);
    if (value && !/^\d$/.test(value)) return;
    const newCode = [...verificationCode];
    newCode[index] = value;
    setVerificationCode(newCode);
    setVerificationError('');
    // Auto-focus next input
    if (value && index < 5) {
      const next = document.getElementById(`2fa-code-${index + 1}`);
      next?.focus();
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !verificationCode[index] && index > 0) {
      const prev = document.getElementById(`2fa-code-${index - 1}`);
      prev?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newCode = [...verificationCode];
      for (let i = 0; i < 6; i++) newCode[i] = pasted[i] || '';
      setVerificationCode(newCode);
      const focusIdx = Math.min(pasted.length, 5);
      document.getElementById(`2fa-code-${focusIdx}`)?.focus();
    }
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleInviteMember = async () => {
    if (!inviteForm.email) {
      setInviteEmailError('Ingresa un correo electrónico');
      return;
    }
    if (!isValidEmail(inviteForm.email)) {
      setInviteEmailError('Ingresa un correo electrónico válido');
      return;
    }
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setShowInviteModal(false);
    setInviteForm({ email: '', role: 'viewer' });
    setInviteEmailError('');
    toast.success(`Invitación enviada a ${inviteForm.email}`);
  };

  const handleRemoveMember = (memberId: string) => {
    setTeamMembersList(prev => prev.filter(m => m.id !== memberId));
    toast.success('Miembro eliminado del equipo');
  };

  const handleUpdateMemberRole = async () => {
    if (!editingMember) return;
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    setTeamMembersList(prev => prev.map(m => m.id === editingMember.id ? { ...m, role: editingMember.role as 'admin' | 'manager' | 'accountant' | 'viewer' } : m));
    setIsLoading(false);
    setEditingMember(null);
    toast.success('Rol actualizado correctamente');
  };

  const handleCloseSession = async (sessionId: string) => {
    setClosingSessionId(sessionId);
    await new Promise(resolve => setTimeout(resolve, 800));
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    setClosingSessionId(null);
    setSelectedSession(null);
    toast.success('Sesión cerrada correctamente');
  };

  const handleCloseAllOtherSessions = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    setSessions(prev => prev.filter(s => s.current));
    setIsLoading(false);
    setShowCloseAllConfirm(false);
    toast.success('Todas las otras sesiones han sido cerradas');
  };

  const getDeviceIcon = (type: 'desktop' | 'mobile' | 'tablet') => {
    switch (type) {
      case 'mobile': return Smartphone;
      case 'tablet': return Tablet;
      default: return Laptop;
    }
  };

  const handleSavePreferences = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    toast.success('Preferencias guardadas');
  };

  const handleCancelSubscription = () => {
    toast.info('Para cancelar tu suscripción, escríbenos a soporte@arriendofacil.com', { description: 'Nuestro equipo procesará tu solicitud en 24-48 horas.' });
  };

  // Account deletion blockers
  const activeLeases = MOCK_LEASES.filter(l => l.status === 'active' || l.status === 'ending_soon');
  const pendingVisits = getPendingVisitCount();
  const teamMembers = teamMembersList.filter(m => m.role !== 'admin');
  const hasActiveSubscription = MOCK_SUBSCRIPTION.status === 'active' && MOCK_SUBSCRIPTION.planId !== 'free';

  const blockers = [
    ...(activeLeases.length > 0 ? [{ type: 'lease' as const, count: activeLeases.length, label: `${activeLeases.length} arriendo${activeLeases.length > 1 ? 's' : ''} activo${activeLeases.length > 1 ? 's' : ''}`, description: 'Debes finalizar o transferir tus arriendos antes de eliminar la cuenta', link: '/panel/leases', action: 'Ver arriendos' }] : []),
    ...(pendingVisits > 0 ? [{ type: 'visit' as const, count: pendingVisits, label: `${pendingVisits} visita${pendingVisits > 1 ? 's' : ''} pendiente${pendingVisits > 1 ? 's' : ''}`, description: 'Cancela o completa las visitas programadas', link: '/panel/visitas', action: 'Ver visitas' }] : []),
    ...(teamMembers.length > 0 ? [{ type: 'team' as const, count: teamMembers.length, label: `${teamMembers.length} miembro${teamMembers.length > 1 ? 's' : ''} del equipo`, description: 'Tu equipo perderá acceso. Notifícales antes de continuar', link: undefined, action: undefined }] : []),
    ...(hasActiveSubscription ? [{ type: 'subscription' as const, count: 1, label: 'Suscripción activa', description: 'Tu suscripción será cancelada sin reembolso del período actual', link: undefined, action: undefined }] : []),
  ];

  const criticalBlockers = blockers.filter(b => b.type === 'lease');
  const hasCriticalBlockers = criticalBlockers.length > 0;

  const handleOpenDeleteModal = () => {
    setDeleteStep('review');
    setDeleteConfirmText('');
    setDeleteReason('');
    setDeleteReasonOther('');
    setExportRequested(false);
    setShowDeleteModal(true);
  };

  const handleExportData = async () => {
    setExportRequested(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    toast.success('Datos exportados. Revisa tu correo electrónico.');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }
    setDeleteStep('processing');
    // Simulate multi-step deletion
    await new Promise(resolve => setTimeout(resolve, 3000));
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
        enabled ? 'bg-primary' : 'bg-border'
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
            <nav className="bg-white dark:bg-card border border-plan-border">
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
          <div className="flex-1 bg-white dark:bg-card border border-plan-border">
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
                        className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>
                    <div>
                      <button
                        onClick={() => setShowPhotoModal(true)}
                        className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
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
                    disabled={isLoading || !profileDirty}
                    className="px-6 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                        className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
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
                    className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
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
                          member.role === 'admin' ? 'bg-primary text-white' :
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
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => setEditingMember({ id: member.id, name: member.name || member.email, email: member.email, role: member.role })}
                              className="p-1 text-plan-muted hover:text-plan-primary transition-colors"
                              title="Editar miembro"
                            >
                              <PenLine className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1 text-plan-muted hover:text-destructive transition-colors"
                              title="Eliminar miembro"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
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
                            onClick={handleOpen2FAModal}
                            className="px-4 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted transition-colors"
                          >
                            Gestionar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={handleOpen2FAModal}
                          className="px-4 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
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
                        <p className="text-sm text-plan-secondary">{sessions.length} {sessions.length === 1 ? 'dispositivo conectado' : 'dispositivos conectados'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sessions.map((session) => {
                        const DeviceIcon = getDeviceIcon(session.deviceType);
                        return (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-3 border border-plan-border hover:bg-muted/50 transition-colors cursor-pointer group"
                            onClick={() => setSelectedSession(session)}
                          >
                            <div className="flex items-center gap-3">
                              <div className={cn(
                                'w-10 h-10 flex items-center justify-center flex-shrink-0',
                                session.current ? 'bg-plan-status-green-bg' : 'bg-muted'
                              )}>
                                <DeviceIcon className={cn('w-5 h-5', session.current ? 'text-green-800' : 'text-plan-secondary')} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-plan-primary">{session.device}</p>
                                  {session.current && (
                                    <span className="px-1.5 py-0.5 bg-plan-status-green-bg text-green-800 text-[10px] font-medium">Actual</span>
                                  )}
                                </div>
                                <p className="text-xs text-plan-secondary">{session.location} · {session.lastActive}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!session.current && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCloseSession(session.id); }}
                                  disabled={closingSessionId === session.id}
                                  className="opacity-0 group-hover:opacity-100 text-xs text-destructive hover:underline transition-all disabled:opacity-50 flex items-center gap-1"
                                >
                                  {closingSessionId === session.id ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                                  Cerrar
                                </button>
                              )}
                              <ChevronRight className="w-4 h-4 text-plan-muted" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {sessions.filter(s => !s.current).length > 0 && (
                      <button
                        onClick={() => setShowCloseAllConfirm(true)}
                        className="mt-4 w-full py-2 border border-red-300 text-red-800 text-sm font-medium hover:bg-red-50 transition-colors"
                      >
                        Cerrar todas las otras sesiones ({sessions.filter(s => !s.current).length})
                      </button>
                    )}
                    {sessions.length === 1 && sessions[0].current && (
                      <div className="mt-4 p-3 bg-muted rounded-sm text-center">
                        <p className="text-xs text-plan-secondary">Solo tienes esta sesión activa. No hay otros dispositivos conectados.</p>
                      </div>
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
                        onClick={handleOpenDeleteModal}
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
                      className="w-full max-w-xs h-10 pl-4 pr-10 bg-card border border-border rounded-sm text-sm cursor-pointer appearance-none bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
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
                      className="w-full max-w-xs h-10 pl-4 pr-10 bg-card border border-border rounded-sm text-sm cursor-pointer appearance-none bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
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
                      className="w-full max-w-xs h-10 pl-4 pr-10 bg-card border border-border rounded-sm text-sm cursor-pointer appearance-none bg-[length:16px_16px] bg-[position:right_12px_center] bg-no-repeat bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2357534E%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
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
                        onClick={() => { setTheme('light'); setPreferences(prev => ({ ...prev, theme: 'light' })); }}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                          mounted && currentTheme === 'light'
                            ? 'bg-primary text-white'
                            : 'border border-plan-border text-plan-secondary hover:bg-muted'
                        )}
                      >
                        <Sun className="w-4 h-4" />
                        Claro
                      </button>
                      <button
                        onClick={() => { setTheme('dark'); setPreferences(prev => ({ ...prev, theme: 'dark' })); }}
                        className={cn(
                          'flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors',
                          mounted && currentTheme === 'dark'
                            ? 'bg-primary text-white'
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
                    className="px-6 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
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
              className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2"
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
              className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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

          {/* Step 1: Intro */}
          {twoFactorStep === 'intro' && (
            <>
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-sm">
                <p className="text-sm text-indigo-800">
                  La autenticación de dos factores añade una capa extra de seguridad. Necesitarás una app de autenticación como Google Authenticator o Authy.
                </p>
              </div>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</div>
                  <p className="text-sm text-plan-secondary">Descarga una app de autenticación en tu teléfono</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</div>
                  <p className="text-sm text-plan-secondary">Escanea el código QR con la app</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-primary text-white flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</div>
                  <p className="text-sm text-plan-secondary">Ingresa el código de verificación generado</p>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShow2FAModal(false)}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setTwoFactorStep('setup')}
                  className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4" />
                  Comenzar configuración
                </button>
              </div>
            </>
          )}

          {/* Step 2: QR Code Setup */}
          {twoFactorStep === 'setup' && (
            <>
              <p className="text-sm text-plan-secondary">Escanea este código QR con tu app de autenticación:</p>
              {/* Simulated QR code */}
              <div className="flex justify-center py-4">
                <div className="w-48 h-48 bg-white border-2 border-plan-border p-3 relative">
                  <div className="w-full h-full bg-[repeating-conic-gradient(hsl(var(--indigo-900))_0%_25%,hsl(var(--neutral-0))_0%_50%)] bg-[length:12px_12px] opacity-90" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white px-2 py-1">
                      <Shield className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-muted rounded-sm">
                <p className="text-xs text-plan-muted mb-1">O ingresa esta clave manualmente:</p>
                <div className="flex items-center gap-2">
                  <code className="text-sm font-mono text-plan-primary font-medium tracking-wider">JBSW Y3DP EHPK 3PXP</code>
                  <button
                    onClick={() => { navigator.clipboard.writeText('JBSWY3DPEHPK3PXP'); toast.success('Clave copiada'); }}
                    className="p-1 text-plan-muted hover:text-plan-primary transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setTwoFactorStep('intro')}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setTwoFactorStep('verify')}
                  className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90"
                >
                  Ya escaneé el código
                </button>
              </div>
            </>
          )}

          {/* Step 3: Verify Code */}
          {twoFactorStep === 'verify' && (
            <>
              <p className="text-sm text-plan-secondary">Ingresa el código de 6 dígitos que muestra tu app de autenticación:</p>
              <div className="flex justify-center gap-2 py-4" onPaste={handleCodePaste}>
                {verificationCode.map((digit, i) => (
                  <input
                    key={i}
                    id={`2fa-code-${i}`}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleCodeInput(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    className={cn(
                      'w-11 h-14 text-center text-xl font-semibold border focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors',
                      verificationError ? 'border-red-500' : 'border-plan-border'
                    )}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
              {verificationError && (
                <p className="text-xs text-red-500 text-center">{verificationError}</p>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => { setTwoFactorStep('setup'); setVerificationError(''); }}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Atrás
                </button>
                <button
                  onClick={handleVerify2FA}
                  disabled={isLoading || verificationCode.join('').length < 6}
                  className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  {isLoading ? 'Verificando...' : 'Verificar'}
                </button>
              </div>
            </>
          )}

          {/* Step 4: Recovery Codes */}
          {twoFactorStep === 'recovery' && (
            <>
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
                <p className="text-sm text-amber-800 font-medium mb-1">Guarda estos códigos de recuperación</p>
                <p className="text-xs text-amber-700">Si pierdes acceso a tu app de autenticación, puedes usar estos códigos para iniciar sesión. Cada código solo se puede usar una vez.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-sm">
                {recoveryCodes.map((code, i) => (
                  <code key={i} className="text-xs font-mono text-plan-primary text-center py-1">{code}</code>
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCopyRecoveryCodes}
                  className={cn(
                    'flex-1 py-2 border text-sm font-medium flex items-center justify-center gap-2 transition-colors',
                    recoveryCodesCopied
                      ? 'border-green-300 text-green-800 bg-green-50'
                      : 'border-plan-border text-plan-secondary hover:bg-muted'
                  )}
                >
                  {recoveryCodesCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {recoveryCodesCopied ? 'Copiados' : 'Copiar códigos'}
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([recoveryCodes.join('\n')], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'plan-recovery-codes.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </button>
              </div>
              <button
                onClick={handleComplete2FA}
                className="w-full py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 flex items-center justify-center gap-2"
              >
                <Check className="w-4 h-4" />
                Ya guardé mis códigos, finalizar
              </button>
            </>
          )}

          {/* Manage (when already enabled) */}
          {twoFactorStep === 'manage' && (
            <>
              <div className="p-4 bg-plan-status-green-bg border border-green-200 rounded-sm flex items-center gap-3">
                <Check className="w-5 h-5 text-green-800 flex-shrink-0" />
                <div>
                  <p className="text-sm text-green-800 font-medium">2FA está activado</p>
                  <p className="text-xs text-green-700">Tu cuenta tiene protección adicional</p>
                </div>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setTwoFactorStep('recovery');
                  }}
                  className="w-full p-3 border border-plan-border text-left hover:bg-muted transition-colors flex items-center gap-3"
                >
                  <Copy className="w-4 h-4 text-plan-muted" />
                  <div>
                    <p className="text-sm font-medium text-plan-primary">Ver códigos de recuperación</p>
                    <p className="text-xs text-plan-secondary">Genera o consulta tus códigos de respaldo</p>
                  </div>
                </button>
                <button
                  onClick={() => {
                    setTwoFactorStep('intro');
                  }}
                  className="w-full p-3 border border-plan-border text-left hover:bg-muted transition-colors flex items-center gap-3"
                >
                  <Shield className="w-4 h-4 text-plan-muted" />
                  <div>
                    <p className="text-sm font-medium text-plan-primary">Cambiar app de autenticación</p>
                    <p className="text-xs text-plan-secondary">Reconfigura con una nueva app o dispositivo</p>
                  </div>
                </button>
              </div>
              <div className="pt-2 border-t border-plan-border">
                <button
                  onClick={handleDisable2FA}
                  disabled={isLoading}
                  className="w-full py-2 border border-red-300 text-red-800 text-sm font-medium hover:bg-red-50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                  {isLoading ? 'Desactivando...' : 'Desactivar 2FA'}
                </button>
              </div>
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
              onChange={(e) => { setInviteForm(prev => ({ ...prev, email: e.target.value })); setInviteEmailError(''); }}
              onBlur={() => { if (inviteForm.email && !isValidEmail(inviteForm.email)) setInviteEmailError('Ingresa un correo electrónico válido'); }}
              className={`w-full h-10 px-4 border text-sm focus:outline-none focus:ring-2 focus:ring-plan-primary/20 ${inviteEmailError ? 'border-red-500' : 'border-plan-border'}`}
              placeholder="correo@ejemplo.com"
            />
            {inviteEmailError && <p className="text-xs text-red-500 mt-1">{inviteEmailError}</p>}
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
              disabled={isLoading || !inviteForm.email || !!inviteEmailError}
              className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {isLoading ? 'Enviando...' : 'Enviar invitación'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Member Modal */}
      <Modal open={!!editingMember} onClose={() => setEditingMember(null)} title="Editar miembro">
        {editingMember && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Miembro</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-muted">
                <div className="w-8 h-8 bg-plan-border flex items-center justify-center text-plan-secondary text-sm font-medium">
                  {editingMember.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-plan-primary">{editingMember.name}</p>
                  <p className="text-xs text-plan-secondary">{editingMember.email}</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">Rol</label>
              <select
                value={editingMember.role}
                onChange={(e) => setEditingMember(prev => prev ? { ...prev, role: e.target.value } : null)}
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
                onClick={() => setEditingMember(null)}
                className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateMemberRole}
                disabled={isLoading}
                className="flex-1 py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {isLoading ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Session Detail Modal */}
      <Modal open={!!selectedSession} onClose={() => setSelectedSession(null)} title="Detalle de sesión">
        {selectedSession && (() => {
          const DeviceIcon = getDeviceIcon(selectedSession.deviceType);
          return (
            <div className="space-y-4">
              {/* Device header */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-sm">
                <div className={cn(
                  'w-12 h-12 flex items-center justify-center flex-shrink-0',
                  selectedSession.current ? 'bg-plan-status-green-bg' : 'bg-card border border-plan-border'
                )}>
                  <DeviceIcon className={cn('w-6 h-6', selectedSession.current ? 'text-green-800' : 'text-plan-secondary')} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-plan-primary">{selectedSession.device}</p>
                    {selectedSession.current && (
                      <span className="px-1.5 py-0.5 bg-plan-status-green-bg text-green-800 text-[10px] font-medium">Sesión actual</span>
                    )}
                  </div>
                  <p className="text-sm text-plan-secondary">{selectedSession.os}</p>
                </div>
              </div>

              {/* Session info */}
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <MapPin className="w-4 h-4 text-plan-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-plan-muted">Ubicación</p>
                    <p className="text-sm text-plan-primary">{selectedSession.location}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <Wifi className="w-4 h-4 text-plan-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-plan-muted">Dirección IP</p>
                    <p className="text-sm text-plan-primary font-mono">{selectedSession.ip}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <Globe className="w-4 h-4 text-plan-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-plan-muted">Navegador</p>
                    <p className="text-sm text-plan-primary">{selectedSession.browser}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <Clock className="w-4 h-4 text-plan-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-plan-muted">Inicio de sesión</p>
                    <p className="text-sm text-plan-primary">{selectedSession.loginDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-1">
                  <Monitor className="w-4 h-4 text-plan-muted flex-shrink-0" />
                  <div>
                    <p className="text-xs text-plan-muted">Última actividad</p>
                    <p className="text-sm text-plan-primary">{selectedSession.lastActive}</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              {!selectedSession.current ? (
                <div className="pt-2 border-t border-plan-border">
                  <button
                    onClick={() => handleCloseSession(selectedSession.id)}
                    disabled={closingSessionId === selectedSession.id}
                    className="w-full py-2 border border-red-300 text-red-800 text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {closingSessionId === selectedSession.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    {closingSessionId === selectedSession.id ? 'Cerrando sesión...' : 'Cerrar esta sesión'}
                  </button>
                </div>
              ) : (
                <div className="pt-2 border-t border-plan-border">
                  <p className="text-xs text-plan-secondary text-center">Esta es tu sesión actual. No puedes cerrarla desde aquí.</p>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>

      {/* Close All Sessions Confirmation */}
      <Modal open={showCloseAllConfirm} onClose={() => setShowCloseAllConfirm(false)} title="Cerrar todas las sesiones">
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
            <p className="text-sm text-amber-800 font-medium mb-1">¿Estás seguro?</p>
            <p className="text-xs text-amber-700">
              Se cerrarán {sessions.filter(s => !s.current).length} {sessions.filter(s => !s.current).length === 1 ? 'sesión' : 'sesiones'} en otros dispositivos. Deberás iniciar sesión de nuevo en esos dispositivos.
            </p>
          </div>
          <div className="space-y-2">
            {sessions.filter(s => !s.current).map(session => {
              const DeviceIcon = getDeviceIcon(session.deviceType);
              return (
                <div key={session.id} className="flex items-center gap-3 px-3 py-2 bg-muted rounded-sm">
                  <DeviceIcon className="w-4 h-4 text-plan-secondary" />
                  <div>
                    <p className="text-sm text-plan-primary">{session.device}</p>
                    <p className="text-xs text-plan-muted">{session.location} · {session.lastActive}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setShowCloseAllConfirm(false)}
              className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleCloseAllOtherSessions}
              disabled={isLoading}
              className="flex-1 py-2 bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              {isLoading ? 'Cerrando...' : 'Cerrar todas'}
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
            className="w-full py-2 bg-primary text-white text-sm font-medium hover:bg-primary/90"
          >
            Guardar cambios
          </button>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal open={showDeleteModal} onClose={() => deleteStep !== 'processing' ? setShowDeleteModal(false) : undefined} title="Eliminar cuenta">
        <div className="space-y-4">

          {/* Step 1: Review - show blockers and what will happen */}
          {deleteStep === 'review' && (
            <>
              <div className="p-4 bg-red-50 border border-red-200 rounded-sm flex gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800">Esta acción es permanente</p>
                  <p className="text-xs text-destructive mt-1">
                    Una vez eliminada, no podrás recuperar tu cuenta ni ninguno de tus datos.
                  </p>
                </div>
              </div>

              {/* Critical blockers */}
              {hasCriticalBlockers && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-sm">
                  <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    No puedes eliminar tu cuenta aún
                  </p>
                  <p className="text-xs text-amber-700 mb-3">
                    Tienes obligaciones activas que debes resolver primero:
                  </p>
                  {criticalBlockers.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-t border-amber-200 first:border-0">
                      <div>
                        <p className="text-sm text-amber-900 font-medium">{b.label}</p>
                        <p className="text-xs text-amber-700">{b.description}</p>
                      </div>
                      {b.link && (
                        <Link href={b.link} onClick={() => setShowDeleteModal(false)} className="text-xs text-amber-800 font-medium hover:underline flex-shrink-0">
                          {b.action}
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Non-critical warnings */}
              {blockers.filter(b => b.type !== 'lease').length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-plan-muted uppercase tracking-wider">Lo que sucederá</p>
                  {blockers.filter(b => b.type !== 'lease').map((b, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-muted rounded-sm">
                      <AlertTriangle className="w-4 h-4 text-plan-muted flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm text-plan-primary">{b.label}</p>
                        <p className="text-xs text-plan-secondary">{b.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* What gets deleted */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-plan-muted uppercase tracking-wider">Se eliminará permanentemente</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Propiedades publicadas',
                    'Contratos y documentos',
                    'Historial de pagos',
                    'Mensajes y notificaciones',
                    'Datos de candidatos',
                    'Configuración y preferencias',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-plan-secondary">
                      <X className="w-3 h-3 text-destructive flex-shrink-0" />
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Export data option */}
              <div className="p-3 border border-plan-border rounded-sm flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-plan-primary">Exportar mis datos</p>
                  <p className="text-xs text-plan-secondary">Descarga una copia antes de eliminar</p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exportRequested}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors',
                    exportRequested
                      ? 'bg-plan-status-green-bg text-green-800'
                      : 'border border-plan-border text-plan-secondary hover:bg-muted'
                  )}
                >
                  {exportRequested ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                  {exportRequested ? 'Enviado a tu correo' : 'Exportar'}
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => setDeleteStep('reason')}
                  disabled={hasCriticalBlockers}
                  className="flex-1 py-2 bg-destructive text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {hasCriticalBlockers ? 'Resuelve los bloqueos primero' : 'Continuar'}
                </button>
              </div>
            </>
          )}

          {/* Step 2: Reason for leaving */}
          {deleteStep === 'reason' && (
            <>
              <p className="text-sm text-plan-secondary">Antes de irte, ¿nos ayudas a mejorar? Tu opinión es valiosa.</p>
              <div className="space-y-2">
                {[
                  { value: 'too_expensive', label: 'Es muy costoso' },
                  { value: 'not_useful', label: 'No me resulta útil' },
                  { value: 'switching', label: 'Voy a usar otra plataforma' },
                  { value: 'no_properties', label: 'Ya no tengo propiedades para arrendar' },
                  { value: 'bad_experience', label: 'Mala experiencia con el servicio' },
                  { value: 'other', label: 'Otro motivo' },
                ].map(opt => (
                  <label
                    key={opt.value}
                    className={cn(
                      'flex items-center gap-3 p-3 border cursor-pointer transition-colors',
                      deleteReason === opt.value ? 'border-destructive bg-red-50/50' : 'border-plan-border hover:bg-muted'
                    )}
                  >
                    <input
                      type="radio"
                      name="deleteReason"
                      value={opt.value}
                      checked={deleteReason === opt.value}
                      onChange={() => setDeleteReason(opt.value)}
                      className="accent-destructive"
                    />
                    <span className="text-sm text-plan-primary">{opt.label}</span>
                  </label>
                ))}
              </div>
              {deleteReason === 'other' && (
                <textarea
                  value={deleteReasonOther}
                  onChange={(e) => setDeleteReasonOther(e.target.value)}
                  placeholder="Cuéntanos más..."
                  rows={3}
                  className="w-full px-4 py-3 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-destructive/20 resize-none"
                />
              )}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteStep('review')}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Atrás
                </button>
                <button
                  onClick={() => setDeleteStep('confirm')}
                  disabled={!deleteReason}
                  className="flex-1 py-2 bg-destructive text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continuar
                </button>
              </div>
            </>
          )}

          {/* Step 3: Final confirmation */}
          {deleteStep === 'confirm' && (
            <>
              <div className="p-4 bg-red-50 border border-red-200 rounded-sm">
                <p className="text-sm font-medium text-red-800 mb-2">Última confirmación</p>
                <p className="text-xs text-destructive">
                  Estás a punto de eliminar permanentemente la cuenta de <strong>{user?.email || 'landlord@example.com'}</strong>.
                  Esta acción no se puede revertir y perderás acceso a todos tus datos inmediatamente.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Escribe <span className="font-bold text-destructive">ELIMINAR</span> para confirmar
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value.toUpperCase())}
                  className="w-full h-10 px-4 border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-destructive/20 font-mono tracking-widest"
                  placeholder="ELIMINAR"
                  autoComplete="off"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setDeleteStep('reason')}
                  className="flex-1 py-2 border border-plan-border text-sm font-medium text-plan-secondary hover:bg-muted"
                >
                  Atrás
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'ELIMINAR'}
                  className="flex-1 py-2 bg-destructive text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar mi cuenta
                </button>
              </div>
            </>
          )}

          {/* Step 4: Processing */}
          {deleteStep === 'processing' && (
            <div className="py-8 text-center space-y-4">
              <Loader2 className="w-10 h-10 animate-spin text-destructive mx-auto" />
              <div>
                <p className="text-sm font-medium text-plan-primary">Eliminando tu cuenta...</p>
                <p className="text-xs text-plan-secondary mt-1">Esto puede tomar unos momentos. No cierres esta ventana.</p>
              </div>
              <div className="space-y-2 text-left max-w-xs mx-auto">
                {[
                  'Cancelando suscripción...',
                  'Eliminando propiedades...',
                  'Eliminando contratos y documentos...',
                  'Eliminando datos de la cuenta...',
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-plan-secondary">
                    <Check className="w-3 h-3 text-plan-muted" />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </Modal>
    </div>
  );
}
