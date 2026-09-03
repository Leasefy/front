'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadSimple,
  FileXls,
  DownloadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { MonoLabel } from '@leasefy/cadence';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import { parseSpreadsheetFile, downloadTemplate } from '../lib/parseFile';
import { autoMapColumns } from '../lib/columnMapping';
import type { ImportStepProps } from '../ImportWizard';

/**
 * Todo lo que el parser sabe leer de verdad — no una lista conservadora.
 *
 * `.ods`, `.fods`, `.txt` y `.tsv` se rechazaban aunque SheetJS los lee (ida y
 * vuelta verificada). Peor: los mensajes mandaban a la persona a convertir el
 * archivo a mano —«abrilo en LibreOffice y guardalo como .xlsx», «renombralo a
 * .csv»— para hacer un trabajo que el parser ya hacía.
 */
const SUPPORTED_EXTENSIONS = ['csv', 'tsv', 'txt', 'xlsx', 'xls', 'ods', 'fods'];

/**
 * Los que NO son planillas. Acá el mensaje sí ayuda, porque no hay nada que
 * parsear.
 *
 * `.numbers` sigue en la lista a propósito: SheetJS trae el parser, pero no
 * pude verificarlo con un archivo real, y prometer un formato sin probarlo es
 * cómo se llega a un «no se pudo leer el archivo» sin explicación.
 */
const UNSUPPORTED_MESSAGES: Record<string, string> = {
  numbers: 'Los archivos .numbers de Apple no son soportados. Abre tu archivo en Numbers y expórtalo como CSV: Archivo → Exportar a → CSV.',
  pdf: 'Los archivos PDF no pueden importarse. Necesitas una planilla: Excel, CSV u ODS.',
  doc: 'Los archivos Word no pueden importarse. Necesitas una planilla: Excel, CSV u ODS.',
  docx: 'Los archivos Word no pueden importarse. Necesitas una planilla: Excel, CSV u ODS.',
};
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ROW_COUNT_WARNING_THRESHOLD = 5000;

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StepUploadFile({ state, updateState }: ImportStepProps) {
  const { t } = useI18n();
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [rowWarning, setRowWarning] = useState<string | null>(null);

  const processFile = useCallback(async (file: File, sheetName?: string) => {
    setIsParsing(true);
    setParseError(null);
    setRowWarning(null);
    try {
      const result = await parseSpreadsheetFile(file, sheetName);

      if (result.rows.length === 0) {
        setParseError('El archivo está vacío o no tiene datos válidos');
        setIsParsing(false);
        return;
      }

      if (result.rows.length > ROW_COUNT_WARNING_THRESHOLD) {
        setRowWarning(`Tu archivo tiene ${result.rows.length.toLocaleString()} filas. El proceso puede tardar más de lo usual.`);
      }

      const columnMappings = autoMapColumns(result.headers);

      updateState({
        file,
        fileName: file.name,
        rawRows: result.rows,
        headers: result.headers,
        sheetNames: result.sheetNames,
        selectedSheet: sheetName || result.sheetNames[0] || '',
        columnMappings,
      });
    } catch (err) {
      console.error('Error parsing file:', err);
      // El parser lanza mensajes escritos para la persona — con el nombre del
      // archivo y qué hacer. Taparlos con uno genérico tiraba esa información.
      setParseError(
        err instanceof Error && err.message
          ? err.message
          : 'No se pudo leer el archivo. Verifica que sea una planilla válida (.xlsx, .xls, .csv, .tsv, .txt, .ods).',
      );
    } finally {
      setIsParsing(false);
    }
  }, [updateState]);

  const onDropWithValidation = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setParseError('El archivo excede el límite de 10MB. Divide tu archivo en partes más pequeñas.');
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';

    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      const hint = UNSUPPORTED_MESSAGES[ext];
      if (hint) {
        setParseError(hint);
      } else {
        setParseError(`El formato .${ext} no es soportado. Usa una planilla: .xlsx, .xls, .csv, .tsv, .txt u .ods.`);
      }
      return;
    }

    setParseError(null);
    processFile(file);
  }, [processFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropWithValidation,
    maxFiles: 1,
    multiple: false,
    disabled: isParsing,
  });

  const handleSheetChange = (newSheet: string) => {
    if (state.file) {
      updateState({ selectedSheet: newSheet });
      processFile(state.file, newSheet);
    }
  };

  const hasFile = state.rawRows.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-fg dark:text-white mb-1">
          {t('inmobiliaria.import.steps.upload')}
        </h2>
        <p className="text-sm text-fg-muted dark:text-fg-subtle">
          {t('inmobiliaria.import.upload.formats')}
        </p>
      </div>

      {/* Sheet Selector (shown when multi-sheet workbook) */}
      {hasFile && state.sheetNames.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-fg dark:text-fg-subtle shrink-0">
            {t('inmobiliaria.import.upload.selectSheet')}
          </label>
          <Select value={state.selectedSheet} onValueChange={handleSheetChange}>
            <SelectTrigger className="flex-1 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {state.sheetNames.map((name) => (
                <SelectItem key={name} value={name}>{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all duration-200',
          isParsing
            ? 'border-border dark:border-border-strong cursor-not-allowed'
            : isDragActive
              ? 'border-primary/30 bg-primary-soft'
              : hasFile
                ? 'border-success/30 bg-success-soft'
                : 'border-border dark:border-border-strong hover:border-primary/30 dark:hover:border-primary/30 hover:bg-surface-muted dark:hover:bg-ink'
        )}
      >
        {/* allowlist: react-dropzone hidden file input (canonical dropzone mechanism) */}
        <input {...getInputProps()} />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <Spinner size="2xl" />
            <p className="text-sm text-fg-muted dark:text-fg-subtle">
              {t('inmobiliaria.import.upload.parsing')}
            </p>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-3">
            <FileXls className="w-16 h-16 text-success" />
            <div>
              <p className="font-medium text-fg dark:text-white">
                {state.fileName}
              </p>
              {state.file && (
                <p className="text-sm text-fg-muted dark:text-fg-subtle mt-1">
                  {formatFileSize(state.file.size)} &middot; {t('inmobiliaria.import.upload.rowsDetected', { count: state.rawRows.length })}
                </p>
              )}
            </div>
            <p className="text-xs text-fg-subtle">
              Haz clic o arrastra un archivo para reemplazar
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadSimple className="w-16 h-16 text-fg-subtle" />
            <div>
              <p className="font-medium text-fg dark:text-fg-subtle">
                {t('inmobiliaria.import.upload.dragText')}
              </p>
              <p className="text-sm text-fg-subtle mt-1">
                {t('inmobiliaria.import.upload.formats')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-danger-soft border border-danger/30">
          <WarningCircle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger">{parseError}</p>
        </div>
      )}

      {/* Row Count Warning */}
      {rowWarning && (
        <div className="flex items-start gap-3 p-4 rounded-lg bg-warning-soft border border-warning/30">
          <WarningCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <p className="text-sm text-warning">{rowWarning}</p>
        </div>
      )}

      {/* Preview Table */}
      {hasFile && state.headers.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-fg dark:text-white">
              Vista previa
            </h3>
            <MonoLabel className="text-xs text-fg-muted bg-surface-muted dark:bg-ink px-2 py-1 rounded-sm">
              {t('inmobiliaria.import.upload.rowsDetected', { count: state.rawRows.length })}
            </MonoLabel>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border dark:border-border-strong">
            <Table className="text-sm">
              <TableHeader>
                <TableRow className="bg-surface-muted dark:bg-ink">
                  {state.headers.map((header) => (
                    <TableHead
                      key={header}
                      className="px-3 py-2 text-left whitespace-nowrap border-b border-border dark:border-border-strong"
                    >
                      {header}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.rawRows.slice(0, 5).map((row) => (
                  <TableRow key={row._rowIndex} className="border-b border-border-faint dark:border-border-strong last:border-0">
                    {state.headers.map((header) => {
                      const value = String(row[header] ?? '');
                      const truncated = value.length > 30 ? value.slice(0, 30) + '...' : value;
                      return (
                        <TableCell
                          key={header}
                          className="px-3 py-2 text-fg dark:text-fg-subtle whitespace-nowrap"
                          title={value}
                        >
                          {truncated || <span className="text-fg-subtle dark:text-fg-muted">—</span>}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {state.rawRows.length > 5 && (
            <p className="text-xs text-fg-subtle mt-2 text-center">
              Mostrando 5 de {state.rawRows.length} filas
            </p>
          )}
        </div>
      )}

      {/* Download Template Link */}
      {!hasFile && (
        <div className="text-center">
          <Button
            variant="link"
            size="sm"
            hideArrow
            type="button"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <DownloadSimple className="w-4 h-4" />
            {t('inmobiliaria.import.upload.downloadTemplate')}
          </Button>
        </div>
      )}
    </div>
  );
}
