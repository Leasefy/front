'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, File, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface DocumentUploadProps {
  label: string;
  required?: boolean;
  accept?: string;
  maxSizeMB?: number;
  value: { file: File | null; fileName?: string } | null;
  onChange: (data: { file: File; fileName: string; uploadedAt: string } | null) => void;
  error?: string;
  hint?: string;
}

type UploadState = 'idle' | 'dragging' | 'uploading' | 'success' | 'error';

// ============================================================================
// Component
// ============================================================================

/**
 * DocumentUpload - Drag and drop file upload component
 * Features: drag-drop, click to browse, validation, preview, mock upload
 */
export function DocumentUpload({
  label,
  required = false,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMB = 5,
  value,
  onChange,
  error,
  hint,
}: DocumentUploadProps) {
  const [state, setState] = useState<UploadState>(value?.file || value?.fileName ? 'success' : 'idle');
  const [uploadError, setUploadError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // Validate file type
  const isValidType = useCallback(
    (file: File): boolean => {
      const acceptedTypes = accept.split(',').map((t) => t.trim().toLowerCase());
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      const fileMimeType = file.type.toLowerCase();

      return acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type;
        }
        return fileMimeType === type || fileMimeType.startsWith(type.replace('*', ''));
      });
    },
    [accept]
  );

  // Handle file selection
  const handleFile = useCallback(
    async (file: File) => {
      setUploadError('');

      // Validate file type
      if (!isValidType(file)) {
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
    [isValidType, maxSizeBytes, maxSizeMB, onChange]
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
  const handleRemove = useCallback(() => {
    onChange(null);
    setState('idle');
    setUploadError('');
  }, [onChange]);

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
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {/* Upload zone or file preview */}
      {state === 'success' && hasFile ? (
        // Compact file preview
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-sm">
          <div className="flex-shrink-0">
            <File className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {value?.fileName}
            </p>
            {value?.file && (
              <p className="text-xs text-gray-500">
                {formatFileSize(value.file.size)}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Check className="h-4 w-4 text-green-600" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="h-8 w-8 p-0 text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Eliminar</span>
            </Button>
          </div>
        </div>
      ) : (
        // Drop zone
        <div
          onClick={handleClick}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={cn(
            'relative border-2 border-dashed rounded-sm p-6 text-center cursor-pointer transition-colors',
            state === 'dragging' && 'border-blue-400 bg-blue-50',
            state === 'uploading' && 'border-gray-300 bg-gray-50 cursor-wait',
            state === 'error' && 'border-red-300 bg-red-50',
            state === 'idle' && 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="sr-only"
          />

          {state === 'uploading' ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Subiendo...</p>
            </div>
          ) : state === 'error' ? (
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-600">{displayError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setState('idle');
                  setUploadError('');
                }}
              >
                Intentar de nuevo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload
                className={cn(
                  'h-8 w-8',
                  state === 'dragging' ? 'text-blue-500' : 'text-gray-400'
                )}
              />
              <div>
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600 hover:underline">
                    Haz clic para subir
                  </span>{' '}
                  o arrastra tu archivo
                </p>
                <p className="text-xs text-gray-500 mt-1">
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
        <p className="text-xs text-gray-500">{hint}</p>
      )}

      {/* External error (from form validation) */}
      {displayError && state !== 'error' && (
        <p className="text-xs text-red-500">{displayError}</p>
      )}
    </div>
  );
}
