'use client';

import { useState } from 'react';
import { Copy, Check, WhatsappLogo, EnvelopeSimple, Link as LinkIcon } from '@phosphor-icons/react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/lib/i18n';

interface ScoreShareModalProps {
  open: boolean;
  onClose: () => void;
  verificationCode: string;
}

export function ScoreShareModal({ open, onClose, verificationCode }: ScoreShareModalProps) {
  const { locale } = useI18n();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/verificar/${verificationCode}`;
  const shareMessage = locale === 'es'
    ? `Hola, te comparto mi evaluación de inquilino verificada por Leasefy. Puedes verificar mi score aquí: ${shareUrl}`
    : `Hi, I'm sharing my tenant evaluation verified by Leasefy. You can verify my score here: ${shareUrl}`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(verificationCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(shareMessage)}`, '_blank');
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(
      locale === 'es' ? 'Mi evaluación de inquilino - Leasefy' : 'My tenant evaluation - Leasefy'
    );
    const body = encodeURIComponent(shareMessage);
    window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {locale === 'es' ? 'Compartir evaluación' : 'Share evaluation'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'es'
              ? 'Comparte tu score verificado con propietarios o inmobiliarias.'
              : 'Share your verified score with landlords or agencies.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Verification Code */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              {locale === 'es' ? 'Código de verificación' : 'Verification code'}
            </p>
            <button
              onClick={handleCopyCode}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
              <span className="font-mono text-lg font-semibold tracking-wider text-foreground">
                {verificationCode}
              </span>
              {copiedCode ? (
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          </div>

          {/* Shareable Link */}
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">
              {locale === 'es' ? 'Enlace verificable' : 'Verifiable link'}
            </p>
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600 transition-colors"
            >
              <span className="text-sm text-muted-foreground truncate flex items-center gap-2">
                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                {shareUrl}
              </span>
              {copiedLink ? (
                <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              ) : (
                <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              )}
            </button>
          </div>

          {/* Share Buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleWhatsApp}
              hideArrow
              className="flex-1"
            >
              <WhatsappLogo className="w-4 h-4" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              onClick={handleEmail}
              hideArrow
              className="flex-1"
            >
              <EnvelopeSimple className="w-4 h-4" />
              Email
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
