'use client';

import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Phone, MapPin, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLenis } from '@/components/providers/SmoothScroll';
import { PlanStatusBadge, PlanStatusType } from './PlanStatusBadge';
import { PlanProgressBar } from './PlanProgressBar';
import { PlanActivityTimeline, TimelineItem } from './PlanActivityTimeline';

export interface QuickAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'primary' | 'danger';
}

export interface DetailSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface PlanDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile?: {
    name: string;
    avatar?: string;
    subtitle?: string;
    status?: PlanStatusType;
    statusLabel?: string;
  };
  contact?: {
    email?: string;
    phone?: string;
    location?: string;
  };
  progress?: {
    value: number;
    label?: string;
  };
  quickActions?: QuickAction[];
  activity?: TimelineItem[];
  notes?: string;
  onNotesChange?: (notes: string) => void;
  sections?: DetailSection[];
  footerActions?: React.ReactNode;
  className?: string;
  width?: 'sm' | 'md' | 'lg';
}

const widthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function PlanDetailSheet({
  open,
  onOpenChange,
  profile,
  contact,
  progress,
  quickActions,
  activity,
  notes,
  onNotesChange,
  sections,
  footerActions,
  className,
  width = 'md',
}: PlanDetailSheetProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  // Stop Lenis smooth scroll when drawer opens to allow native scrolling inside
  useEffect(() => {
    if (open) {
      lenis.stop();
    } else {
      lenis.start();
    }
    return () => {
      lenis.start();
    };
  }, [open, lenis]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onOpenChange(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, onOpenChange]);

  if (!open) return null;

  const content = (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60"
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed inset-y-0 right-0 z-50 w-full bg-white shadow-xl',
          'flex flex-col',
          'animate-in slide-in-from-right duration-300',
          widthClasses[width],
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {/* Header - Fixed */}
        <div className="flex-none flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <h2 className="text-lg font-semibold text-[#111827]">
            Detalles
          </h2>
          <div className="flex items-center gap-2">
            <button className="p-2 rounded-sm hover:bg-[#F3F4F6] text-[#6B7280] transition-colors">
              <MoreHorizontal className="w-5 h-5" />
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="p-2 rounded-sm hover:bg-[#F3F4F6] text-[#6B7280] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto"
          data-lenis-prevent
          style={{
            overscrollBehavior: 'contain',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {/* Profile Section */}
          {profile && (
            <div className="px-6 py-5 border-b border-[#E5E7EB]">
              <div className="flex items-start gap-4">
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt={profile.name}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-[#F3F4F6] flex items-center justify-center">
                    <span className="text-2xl font-bold text-[#6B7280]">
                      {profile.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-[#111827] truncate">
                    {profile.name}
                  </h3>
                  {profile.subtitle && (
                    <p className="text-sm text-[#6B7280] mt-0.5">{profile.subtitle}</p>
                  )}
                  {profile.status && (
                    <div className="mt-2">
                      <PlanStatusBadge
                        status={profile.status}
                        label={profile.statusLabel}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Contact Info */}
          {contact && (contact.email || contact.phone || contact.location) && (
            <div className="px-6 py-4 border-b border-[#E5E7EB] space-y-3">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-3 text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  <span>{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-3 text-sm text-[#6B7280] hover:text-[#111827] transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  <span>{contact.phone}</span>
                </a>
              )}
              {contact.location && (
                <div className="flex items-center gap-3 text-sm text-[#6B7280]">
                  <MapPin className="w-4 h-4" />
                  <span>{contact.location}</span>
                </div>
              )}
            </div>
          )}

          {/* Progress Section */}
          {progress && (
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-medium text-[#6B7280] mb-2">
                {progress.label || 'Progreso'}
              </p>
              <PlanProgressBar value={progress.value} showValue size="md" />
            </div>
          )}

          {/* Quick Actions */}
          {quickActions && quickActions.length > 0 && (
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                Acciones Rapidas
              </p>
              <div className="grid grid-cols-2 gap-2">
                {quickActions.map(action => (
                  <button
                    key={action.id}
                    onClick={action.onClick}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-2 rounded-sm text-sm font-medium transition-colors',
                      action.variant === 'primary'
                        ? 'bg-[#111827] text-white hover:bg-[#1f2937]'
                        : action.variant === 'danger'
                          ? 'bg-[#FEE2E2] text-[#991B1B] hover:bg-[#FECACA]'
                          : 'bg-[#F3F4F6] text-[#111827] hover:bg-[#E5E7EB]'
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Custom Sections */}
          {sections?.map(section => (
            <div key={section.id} className="px-6 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                {section.title}
              </p>
              {section.content}
            </div>
          ))}

          {/* Activity Timeline */}
          {activity && activity.length > 0 && (
            <div className="px-6 py-4 border-b border-[#E5E7EB]">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                Actividad
              </p>
              <PlanActivityTimeline items={activity} maxItems={5} compact />
            </div>
          )}

          {/* Notes Section */}
          {(notes !== undefined || onNotesChange) && (
            <div className="px-6 py-4">
              <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                Notas
              </p>
              {onNotesChange ? (
                <textarea
                  value={notes || ''}
                  onChange={e => onNotesChange(e.target.value)}
                  placeholder="Agregar notas..."
                  className={cn(
                    'w-full min-h-[100px] p-3 rounded-sm resize-none',
                    'bg-[#F9FAFB] border border-[#E5E7EB]',
                    'text-sm text-[#111827] placeholder:text-[#9CA3AF]',
                    'focus:outline-none focus:ring-2 focus:ring-[#D4F934]/50 focus:border-[#D4F934]',
                    'transition-colors'
                  )}
                />
              ) : (
                <p className="text-sm text-[#6B7280]">
                  {notes || 'Sin notas'}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions - Fixed */}
        {footerActions && (
          <div className="flex-none px-6 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
            {footerActions}
          </div>
        )}
      </div>
    </>
  );

  // Use portal to render at document body level
  if (typeof window === 'undefined') return null;

  return createPortal(content, document.body);
}
