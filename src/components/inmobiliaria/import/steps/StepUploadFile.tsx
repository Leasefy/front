'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  UploadSimple,
  FileXls,
  SpinnerGap,
  DownloadSimple,
  WarningCircle,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { parseSpreadsheetFile, downloadTemplate } from '../lib/parseFile';
import { autoMapColumns } from '../lib/columnMapping';
import type { ImportStepProps } from '../ImportWizard';

const SUPPORTED_EXTENSIONS = ['csv', 'xlsx', 'xls'];
const UNSUPPORTED_MESSAGES: Record<string, string> = {
  numbers: 'Los archivos .numbers de Apple no son soportados. Abre tu archivo en Numbers y expórtalo como CSV: Archivo → Exportar a → CSV.',
  ods: 'Los archivos .ods no son soportados directamente. Abre tu archivo en LibreOffice/Calc y guárdalo como .xlsx o .csv.',
  pdf: 'Los archivos PDF no pueden importarse. Necesitas un archivo Excel (.xlsx) o CSV.',
  doc: 'Los archivos Word no pueden importarse. Necesitas un archivo Excel (.xlsx) o CSV.',
  docx: 'Los archivos Word no pueden importarse. Necesitas un archivo Excel (.xlsx) o CSV.',
  txt: 'Si tu archivo .txt tiene datos separados por comas, renómbralo a .csv e intenta de nuevo.',
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
      setParseError('No se pudo leer el archivo. Verifica que sea un archivo .xlsx, .xls o .csv válido.');
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
        setParseError(`El formato .${ext} no es soportado. Usa archivos .xlsx, .xls o .csv.`);
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

  const handleSheetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSheet = e.target.value;
    if (state.file) {
      updateState({ selectedSheet: newSheet });
      processFile(state.file, newSheet);
    }
  };

  const hasFile = state.rawRows.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">
          {t('inmobiliaria.import.steps.upload')}
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          {t('inmobiliaria.import.upload.formats')}
        </p>
      </div>

      {/* Sheet Selector (shown when multi-sheet workbook) */}
      {hasFile && state.sheetNames.length > 1 && (
        <div className="flex items-center gap-3">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 shrink-0">
            {t('inmobiliaria.import.upload.selectSheet')}
          </label>
          <select
            value={state.selectedSheet}
            onChange={handleSheetChange}
            className="flex-1 max-w-xs px-3 py-1.5 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {state.sheetNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200',
          isParsing
            ? 'border-neutral-300 dark:border-neutral-600 cursor-not-allowed'
            : isDragActive
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/10'
              : hasFile
                ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/10'
                : 'border-neutral-300 dark:border-neutral-600 hover:border-indigo-400 dark:hover:border-indigo-600 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        )}
      >
        <input {...getInputProps()} />

        {isParsing ? (
          <div className="flex flex-col items-center gap-3">
            <SpinnerGap className="w-16 h-16 text-indigo-500 animate-spin" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              {t('inmobiliaria.import.upload.parsing')}
            </p>
          </div>
        ) : hasFile ? (
          <div className="flex flex-col items-center gap-3">
            <FileXls className="w-16 h-16 text-emerald-500" />
            <div>
              <p className="font-medium text-neutral-900 dark:text-white">
                {state.fileName}
              </p>
              {state.file && (
                <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
                  {formatFileSize(state.file.size)} &middot; {t('inmobiliaria.import.upload.rowsDetected', { count: state.rawRows.length })}
                </p>
              )}
            </div>
            <p className="text-xs text-neutral-400">
              Haz clic o arrastra un archivo para reemplazar
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <UploadSimple className="w-16 h-16 text-neutral-400" />
            <div>
              <p className="font-medium text-neutral-700 dark:text-neutral-300">
                {t('inmobiliaria.import.upload.dragText')}
              </p>
              <p className="text-sm text-neutral-400 mt-1">
                {t('inmobiliaria.import.upload.formats')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <WarningCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-400">{parseError}</p>
        </div>
      )}

      {/* Row Count Warning */}
      {rowWarning && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <WarningCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700 dark:text-amber-400">{rowWarning}</p>
        </div>
      )}

      {/* Preview Table */}
      {hasFile && state.headers.length > 0 && (
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
              Vista previa
            </h3>
            <span className="text-xs font-mono uppercase tracking-wide text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-1 rounded-md">
              {t('inmobiliaria.import.upload.rowsDetected', { count: state.rawRows.length })}
            </span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 dark:bg-neutral-800">
                  {state.headers.map((header) => (
                    <th
                      key={header}
                      className="px-3 py-2 text-left font-mono text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400 whitespace-nowrap border-b border-neutral-200 dark:border-neutral-700"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.rawRows.slice(0, 5).map((row) => (
                  <tr key={row._rowIndex} className="border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                    {state.headers.map((header) => {
                      const value = String(row[header] ?? '');
                      const truncated = value.length > 30 ? value.slice(0, 30) + '...' : value;
                      return (
                        <td
                          key={header}
                          className="px-3 py-2 text-neutral-700 dark:text-neutral-300 whitespace-nowrap"
                          title={value}
                        >
                          {truncated || <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {state.rawRows.length > 5 && (
            <p className="text-xs text-neutral-400 mt-2 text-center">
              Mostrando 5 de {state.rawRows.length} filas
            </p>
          )}
        </div>
      )}

      {/* Download Template Link */}
      {!hasFile && (
        <div className="text-center">
          <button
            type="button"
            onClick={downloadTemplate}
            className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            <DownloadSimple className="w-4 h-4" />
            {t('inmobiliaria.import.upload.downloadTemplate')}
          </button>
        </div>
      )}
    </div>
  );
}
