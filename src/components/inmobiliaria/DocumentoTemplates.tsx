'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ClipboardText,
  ListChecks,
  EnvelopeSimple,
  TrendUp,
  ShieldCheck,
  Star,
  Eye,
  Play,
  X,
  MagnifyingGlass,
  Plus,
  Code,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { DocumentTemplate, DocumentCategory } from '@/lib/types/inmobiliaria';
import { getDocumentCategoryLabel, getDocumentCategoryColor } from '@/lib/types/inmobiliaria';

// Map icon names to Phosphor components
const ICON_MAP: Record<string, React.ElementType> = {
  FileText,
  ClipboardText,
  ListChecks,
  EnvelopeSimple,
  TrendUp,
  ShieldCheck,
};

// Category tabs configuration
const CATEGORY_TAB_KEYS: { value: DocumentCategory | 'all'; labelKey: string }[] = [
  { value: 'all', labelKey: 'inmobiliaria.documento.catAll' },
  { value: 'contrato', labelKey: 'inmobiliaria.documento.catContracts' },
  { value: 'acta', labelKey: 'inmobiliaria.documento.catActas' },
  { value: 'inventario', labelKey: 'inmobiliaria.documento.catInventory' },
  { value: 'poliza', labelKey: 'inmobiliaria.documento.catPoliza' },
  { value: 'carta', labelKey: 'inmobiliaria.documento.catLetters' },
];

// Variable descriptions for the preview modal (keys for i18n)
const VARIABLE_DESC_KEYS: Record<string, string> = {
  '{{tenant_name}}': 'inmobiliaria.documento.varTenantName',
  '{{tenant_cedula}}': 'inmobiliaria.documento.varTenantCedula',
  '{{property_address}}': 'inmobiliaria.documento.varPropertyAddress',
  '{{monthly_rent}}': 'inmobiliaria.documento.varMonthlyRent',
  '{{start_date}}': 'inmobiliaria.documento.varStartDate',
  '{{end_date}}': 'inmobiliaria.documento.varEndDate',
  '{{delivery_date}}': 'inmobiliaria.documento.varDeliveryDate',
  '{{inventory_items}}': 'inmobiliaria.documento.varInventoryItems',
  '{{return_date}}': 'inmobiliaria.documento.varReturnDate',
  '{{damages}}': 'inmobiliaria.documento.varDamages',
  '{{deposit_deductions}}': 'inmobiliaria.documento.varDepositDeductions',
  '{{rooms}}': 'inmobiliaria.documento.varRooms',
  '{{appliances}}': 'inmobiliaria.documento.varAppliances',
  '{{furniture}}': 'inmobiliaria.documento.varFurniture',
  '{{termination_date}}': 'inmobiliaria.documento.varTerminationDate',
  '{{reason}}': 'inmobiliaria.documento.varReason',
  '{{current_rent}}': 'inmobiliaria.documento.varCurrentRent',
  '{{new_rent}}': 'inmobiliaria.documento.varNewRent',
  '{{ipc_rate}}': 'inmobiliaria.documento.varIpcRate',
  '{{effective_date}}': 'inmobiliaria.documento.varEffectiveDate',
  '{{coverage_amount}}': 'inmobiliaria.documento.varCoverageAmount',
};

interface DocumentoTemplatesProps {
  templates: DocumentTemplate[];
  onPreview?: (template: DocumentTemplate) => void;
  onUseTemplate?: (template: DocumentTemplate) => void;
  isLoading?: boolean;
}

/**
 * DocumentoTemplates - Template gallery with preview and usage stats
 * Displays document templates in a filterable grid with preview modal
 */
export function DocumentoTemplates({
  templates,
  onPreview,
  onUseTemplate,
  isLoading = false,
}: DocumentoTemplatesProps) {
  const { t, formatDate: fmtDate } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<DocumentCategory | 'all'>('all');
  const [previewTemplate, setPreviewTemplate] = useState<DocumentTemplate | null>(null);

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = [...templates];

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((t) => t.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query)
      );
    }

    // Sort by usage count (most used first)
    return filtered.sort((a, b) => b.usageCount - a.usageCount);
  }, [templates, selectedCategory, searchQuery]);

  // Get template counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: templates.length };
    templates.forEach((t) => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return counts;
  }, [templates]);

  const handlePreview = (template: DocumentTemplate) => {
    setPreviewTemplate(template);
    onPreview?.(template);
  };

  const handleUseTemplate = (template: DocumentTemplate) => {
    onUseTemplate?.(template);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            {t('inmobiliaria.documento.templatesTitle')}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {t('inmobiliaria.documento.templatesCount', { count: templates.length })}
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          disabled
          title={t('inmobiliaria.documento.comingSoon')}
        >
          <Plus className="w-4 h-4" />
          {t('inmobiliaria.documento.newTemplate')}
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder={t('inmobiliaria.documento.searchTemplates')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs
        value={selectedCategory}
        onValueChange={(v) => setSelectedCategory(v as DocumentCategory | 'all')}
      >
        <TabsList variant="segmented" className="flex-wrap">
          {CATEGORY_TAB_KEYS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
            >
              {t(tab.labelKey)}
              {categoryCounts[tab.value] !== undefined && (
                <span className="ml-1.5 font-mono text-[11px] tabular-nums opacity-70">
                  ({categoryCounts[tab.value]})
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedCategory} className="mt-6">
          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-48 rounded-xl bg-muted animate-pulse"
                />
              ))}
            </div>
          ) : filteredTemplates.length === 0 ? (
            // Empty state
            <div className="text-center py-12">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-1">
                {t('inmobiliaria.documento.noTemplatesFound')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {searchQuery
                  ? t('inmobiliaria.documento.tryAnotherSearch')
                  : t('inmobiliaria.documento.noTemplatesInCategory')}
              </p>
            </div>
          ) : (
            // Template cards grid
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredTemplates.map((template) => {
                  const Icon = ICON_MAP[template.icon] || FileText;

                  return (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Card className="p-4 h-full flex flex-col hover: transition-shadow">
                        {/* Header */}
                        <div className="flex items-start gap-3 mb-3">
                          <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
                            <Icon className="w-5 h-5 text-primary" weight="duotone" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground truncate">
                                {template.name}
                              </h3>
                              {template.isDefault && (
                                <Star
                                  className="w-4 h-4 text-warning shrink-0"
                                  weight="fill"
                                />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">
                              {template.description}
                            </p>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2 mb-3">
                          <Badge
                            variant="secondary"
                            className={cn(
                              'text-xs',
                              getDocumentCategoryColor(template.category)
                            )}
                          >
                            {getDocumentCategoryLabel(template.category)}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            v{template.version}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span>
                            {t('inmobiliaria.documento.usedTimes', { count: template.usageCount.toLocaleString() })}
                          </span>
                          <span className="text-xs">
                            {t('inmobiliaria.documento.updated')}{' '}
                            {fmtDate(template.lastUpdated)}
                          </span>
                        </div>

                        {/* Default badge */}
                        {template.isDefault && (
                          <div className="mb-4">
                            <Badge
                              variant="outline"
                              className="bg-warning-soft text-warning border-warning/30"
                            >
                              {t('inmobiliaria.documento.defaultTemplate')}
                            </Badge>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-auto">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => handlePreview(template)}
                          >
                            <Eye className="w-4 h-4" />
                            {t('inmobiliaria.documento.preview')}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 gap-2"
                            onClick={() => handleUseTemplate(template)}
                          >
                            <Play className="w-4 h-4" />
                            {t('inmobiliaria.documento.use')}
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Preview Modal */}
      <Dialog
        open={previewTemplate !== null}
        onOpenChange={(open) => !open && setPreviewTemplate(null)}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              {previewTemplate && (
                <>
                  {(() => {
                    const Icon = ICON_MAP[previewTemplate.icon] || FileText;
                    return (
                      <div className="w-10 h-10 rounded-md bg-primary-soft flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" weight="duotone" />
                      </div>
                    );
                  })()}
                  <div>
                    <div className="flex items-center gap-2">
                      {previewTemplate.name}
                      {previewTemplate.isDefault && (
                        <Star className="w-4 h-4 text-warning" weight="fill" />
                      )}
                    </div>
                    <div className="text-sm font-normal text-muted-foreground">
                      v{previewTemplate.version}
                    </div>
                  </div>
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          {previewTemplate && (
            <div className="space-y-6 mt-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-2">
                  {t('inmobiliaria.documento.description')}
                </h4>
                <p className="text-sm text-muted-foreground">
                  {previewTemplate.description}
                </p>
              </div>

              {/* Category and Stats */}
              <div className="flex flex-wrap items-center gap-4">
                <Badge
                  variant="secondary"
                  className={getDocumentCategoryColor(previewTemplate.category)}
                >
                  {getDocumentCategoryLabel(previewTemplate.category)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {t('inmobiliaria.documento.usedTimes', { count: previewTemplate.usageCount.toLocaleString() })}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t('inmobiliaria.documento.lastUpdated')}{' '}
                  {fmtDate(previewTemplate.lastUpdated)}
                </span>
              </div>

              {/* Variables */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
                  <Code className="w-4 h-4" />
                  {t('inmobiliaria.documento.variables')} ({previewTemplate.variables.length})
                </h4>
                <div className="bg-muted rounded-md p-4 space-y-3">
                  {previewTemplate.variables.map((variable) => (
                    <div key={variable} className="flex items-start gap-3">
                      <code className="px-2 py-1 bg-background rounded text-sm font-mono text-primary shrink-0">
                        {variable}
                      </code>
                      <span className="text-sm text-muted-foreground">
                        {VARIABLE_DESC_KEYS[variable] ? t(VARIABLE_DESC_KEYS[variable]) : t('inmobiliaria.documento.customVariable')}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Document Preview Placeholder */}
              <div>
                <h4 className="text-sm font-medium text-foreground mb-3">
                  {t('inmobiliaria.documento.documentPreview')}
                </h4>
                <div className="border rounded-md p-8 bg-background">
                  <div className="max-w-md mx-auto space-y-4">
                    {/* Fake document preview */}
                    <div className="text-center mb-6">
                      <div className="h-3 w-48 mx-auto bg-muted rounded animate-pulse" />
                      <div className="h-2 w-32 mx-auto bg-muted rounded animate-pulse mt-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-muted rounded animate-pulse" />
                      <div className="h-2 w-5/6 bg-muted rounded animate-pulse" />
                      <div className="h-2 w-4/5 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="pt-4 space-y-2">
                      <div className="h-2 w-full bg-muted rounded animate-pulse" />
                      <div className="h-2 w-3/4 bg-muted rounded animate-pulse" />
                    </div>
                    <div className="pt-4 space-y-2">
                      <div className="h-2 w-full bg-muted rounded animate-pulse" />
                      <div className="h-2 w-5/6 bg-muted rounded animate-pulse" />
                      <div className="h-2 w-4/5 bg-muted rounded animate-pulse" />
                      <div className="h-2 w-2/3 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {t('inmobiliaria.documento.simulatedPreview')}
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setPreviewTemplate(null)}
                >
                  {t('inmobiliaria.documento.close')}
                </Button>
                <Button
                  className="gap-2"
                  onClick={() => {
                    handleUseTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                >
                  <Play className="w-4 h-4" />
                  {t('inmobiliaria.documento.useTemplate')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocumentoTemplates;
