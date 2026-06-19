'use client';

import { useState, useCallback, useRef, useId } from 'react';
import { Upload, File, X, Check, WarningCircle, SpinnerGap } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

// ============================================================================
// TextTs
// ============================================================================

interface DocumentUploadProps {
  /** Optional stable id for the file input (enables label association + programmatic focus) */
  id?: string;
  label: string;
  required?: boolean;
  accept?: string;
  maxSizeMB?: number;
  value: { file: File | null; fileName?: string; remoteId?: string } | null;
  onChange: (data: { file: File; fileName: string; uploadedAt: string } | null) => void;
  error?: string;
  hint?: string;
  /**
   * Optional hook called when the user clicks the remove button AND the current
   * value has a `remoteId` (i.e. the doc already exists on the backend).
   * Should perform the actual DELETE against the backend and resolve when done.
   * Return `false` to cancel the local removal (e.g. on error).
   */
  onDelete?: (remoteId: string) => Promise<boolean | void>;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

// ============================================================================
// Component
// ============================================================================

/**
 * DocumentUpload - Luxterra-style drag and drop file upload
 */
export function DocumentUpload({
  id,
  label,
  required = false,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 5,
  value,
  onChange,
  error,
  hint,
  onDelete,
}: DocumentUploadProps) {
  const [state, setState] = useState<UploadState>(value?.file || value?.fileName ? 'success' : 'idle');
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-file`;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Validate file type
  const isValidTextT = useCallback(
    (file: File): boolean => {
      const acceptedTextTs = accept.split(',').map((t) => t.trim().toLowerCase());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const fileMimeTextT = file.type.toLowerCase();

      return acceptedTextTs.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type;
        }
        return fileMimeTextT === type || fileMimeTextT.startsWith(type.replace('*', ''));
      });
    },
    [accept]
  );

  // Handle file selection
  const handleFile = useCallback(
    async (file: File) => {
      setUploadError('');

      // Validate file type
      if (!isValidTextT(file)) {
        setUploadError('Tipo de archivo no permitido');
        setState('error');
        return;
      }

      // Validate file size
      if (file.size > maxSizeBytes) {
        setUploadError(`El archivo supera ${maxSizeMB}MB`);
        setState('error');
        return;
      }

      // Mock upload process
      setState('uploading');

      // Simulate upload delay (500ms)
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Success
      onChange({
        file,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
      });
      setState('success');
    },
    [isValidTextT, maxSizeBytes, maxSizeMB, onChange]
  );

  // Handle drop event
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setState('idle');

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  // Handle drag events
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState('dragging');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
  }, []);

  // Handle click to browse
  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input to allow selecting same file again
      e.target.value = '';
    },
    [handleFile]
  );

  // Handle remove
  const [isDeleting, setIsDeleting] = useState(false);

  const handleRemove = useCallback(async () => {
    // If this is a remote doc and an onDelete hook is wired, call it first.
    // Only clear local state if the backend delete succeeded.
    if (value?.remoteId && onDelete) {
      setIsDeleting(true);
      setUploadError('');
      try {
        const result = await onDelete(value.remoteId);
        if (result === false) {
          setIsDeleting(false);
          return;
        }
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'No pudimos eliminar el documento');
        setState('error');
        setIsDeleting(false);
        return;
      }
      setIsDeleting(false);
    }
    onChange(null);
    setState('idle');
    setUploadError('');
  }, [onChange, onDelete, value?.remoteId]);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasFile = value?.file || value?.fileName;
  const displayError = uploadError || error;

  return (
    <div className="space-y-2">
      {/* Label */}
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground/70">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>

      {/* Upload zone or file preview */}
      {state === 'success' && hasFile ? (
        // Compact file preview - Luxterra style
        <div className="flex items-center gap-3 p-3 bg-emerald-50/50 border border-emerald-200/50 rounded-sm">
          <div className="flex-shrink-0">
            <File className="h-5 w-5 text-emerald-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {value?.fileName}
            </p>
            {value?.file && (
              <p className="text-xs text-muted-foreground">
                {formatFileSize(value.file.size)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!isDeleting && <Check className="h-4 w-4 text-emerald-600" />}
            <button
              type="button"
              onClick={handleRemove}
              disabled={isDeleting}
              className="h-8 w-8 flex items-center justify-center rounded-sm text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-wait"
            >
              {isDeleting ? (
                <SpinnerGap className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
              <span className="sr-only">Eliminar</span>
            </button>
          </div>
        </div>
      ) : (
        // Drop zone - Luxterra style
        <div
          role="button"
          tabIndex={0}
          aria-label={`Subir ${label}`}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors',
            state === 'dragging' && 'border-border bg-black/[0.02]',
            state === 'uploading' && 'border-border bg-black/[0.02] cursor-wait',
            state === 'error' && 'border-red-300 bg-red-50/50',
            state === 'idle' && 'border-border hover:border-border hover:bg-black/[0.02]'
          )}
        >
          <input
            ref={fileInputRef}
            id={inputId}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="sr-only"
            tabIndex={-1}
          />

          {state === 'uploading' ? (
            <div className="flex flex-col items-center gap-2">
              <SpinnerGap className="h-8 w-8 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">Subiendo...</p>
            </div>
          ) : state === 'error' ? (
            <div className="flex flex-col items-center gap-2">
              <WarningCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">{displayError}</p>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setState('idle');
                  setUploadError('');
                }}
                className={cn(
                  'inline-flex items-center px-3 py-1.5 text-xs font-medium',
                  'rounded-sm border border-border bg-card',
                  'text-foreground/70 hover:text-foreground hover:border-border',
                  'transition-colors'
                )}
              >
                Intentar de nuevo
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload
                className={cn(
                  'h-8 w-8',
                  state === 'dragging' ? 'text-muted-foreground' : 'text-muted-foreground'
                )}
              />
              <div>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground hover:underline">
                    Toca para subir
                  </span>{' '}
                  o arrastra tu archivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {accept
                    .split(',')
                    .map((t) => t.replace('.', '').toUpperCase())
                    .join(', ')}{' '}
                  (max {maxSizeMB}MB)
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hint text */}
      {hint && !displayError && state !== 'error' && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}

      {/* External error (from form validation) */}
      {displayError && state !== 'error' && (
        <p className="text-xs text-red-500">{displayError}</p>
      )}
    </div>
  );
}
