'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Shield,
  Camera,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  FileText,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function PerfilPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: user?.name || 'María González',
    email: user?.email || 'tenant@example.com',
    phone: '+56 9 1234 5678',
    rut: '12.345.678-9',
    address: 'Av. Providencia 1234, Providencia',
    birthDate: '1990-05-15',
    emergencyContact: 'Juan González - +56 9 8765 4321',
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setIsEditing(false);
    toast.success('Perfil actualizado correctamente');
  };

  const verificationStatus = {
    email: true,
    phone: true,
    identity: true,
    employment: false,
  };

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-4xl mx-auto px-6 py-8">
        <Link href="/inquilino" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 lg:hidden">
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2  hover:bg-card text-plan-secondary hover:text-plan-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-semibold text-plan-primary">Mi Perfil</h1>
              <p className="text-plan-secondary mt-1">Gestiona tu información personal</p>
            </div>
          </div>
          {isEditing ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-sm text-plan-secondary hover:text-plan-primary transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white  text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-primary text-white  text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Editar perfil
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-card  border border-plan-border overflow-hidden">
              {/* Avatar Section */}
              <div className="relative bg-indigo-950 h-24" />
              <div className="px-6 pb-6">
                <div className="relative -mt-12 mb-4">
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-white shadow-sm flex items-center justify-center text-plan-primary font-bold text-3xl">
                    {formData.name.charAt(0).toUpperCase()}
                  </div>
                  {isEditing && (
                    <button className="absolute bottom-0 right-0 p-2 bg-primary rounded-full text-white hover:bg-primary/90 transition-colors">
                      <Camera className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-plan-primary">{formData.name}</h2>
                <p className="text-sm text-plan-secondary">Inquilino desde Enero 2024</p>

                {/* Quick Stats */}
                <div className="mt-6 pt-6 border-t border-plan-border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10  bg-plan-status-green-bg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-800" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-plan-primary">1 Arriendo activo</p>
                      <p className="text-xs text-plan-secondary">Departamento Providencia</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10  bg-plan-status-blue-bg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-800" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-plan-primary">12 Pagos realizados</p>
                      <p className="text-xs text-plan-secondary">100% a tiempo</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Status */}
            <div className="mt-6 bg-card  border border-plan-border p-5">
              <h3 className="font-semibold text-plan-primary mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-plan-secondary" />
                Verificaciones
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'email', label: 'Email verificado', verified: verificationStatus.email },
                  { key: 'phone', label: 'Teléfono verificado', verified: verificationStatus.phone },
                  { key: 'identity', label: 'Identidad verificada', verified: verificationStatus.identity },
                  { key: 'employment', label: 'Empleo verificado', verified: verificationStatus.employment },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between py-2">
                    <span className="text-sm text-foreground">{item.label}</span>
                    {item.verified ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-800">
                        <CheckCircle className="w-4 h-4" />
                        Verificado
                      </span>
                    ) : (
                      <button className="text-xs font-medium text-plan-status-blue hover:underline">
                        Verificar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Profile Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <div className="bg-card  border border-plan-border p-6">
              <h3 className="font-semibold text-plan-primary mb-6">Información Personal</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Nombre completo
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-4 py-2.5  border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                      <User className="w-4 h-4 text-plan-muted" />
                      <span className="text-sm text-plan-primary">{formData.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    RUT
                  </label>
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                    <Shield className="w-4 h-4 text-plan-muted" />
                    <span className="text-sm text-plan-primary">{formData.rut}</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Email
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-4 py-2.5  border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                      <Mail className="w-4 h-4 text-plan-muted" />
                      <span className="text-sm text-plan-primary">{formData.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Teléfono
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-4 py-2.5  border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                      <Phone className="w-4 h-4 text-plan-muted" />
                      <span className="text-sm text-plan-primary">{formData.phone}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Fecha de nacimiento
                  </label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      className="w-full px-4 py-2.5  border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                      <Calendar className="w-4 h-4 text-plan-muted" />
                      <span className="text-sm text-plan-primary">
                        {new Date(formData.birthDate).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Dirección
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-2.5  border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
                    />
                  ) : (
                    <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                      <MapPin className="w-4 h-4 text-plan-muted" />
                      <span className="text-sm text-plan-primary">{formData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-card  border border-plan-border p-6">
              <h3 className="font-semibold text-plan-primary mb-6">Contacto de Emergencia</h3>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre y teléfono
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.emergencyContact}
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    className="w-full px-4 py-2.5  border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
                    placeholder="Nombre - Teléfono"
                  />
                ) : (
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-muted ">
                    <Phone className="w-4 h-4 text-plan-muted" />
                    <span className="text-sm text-plan-primary">{formData.emergencyContact}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-card  border border-red-200 p-6">
              <h3 className="font-semibold text-red-800 mb-2 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Zona de peligro
              </h3>
              <p className="text-sm text-plan-secondary mb-4">
                Estas acciones son irreversibles. Por favor, procede con precaución.
              </p>
              <button className="px-4 py-2 border border-red-300 text-red-800  text-sm font-medium hover:bg-red-50 transition-colors">
                Eliminar mi cuenta
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
