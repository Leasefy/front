'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Lightning,
  Signature,
  Key,
  Plus,
  Trash,
  Camera,
  CheckCircle,
  Warning,
  User,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IconButton, Chip, RadioCardGroup, RadioCard } from '@leasefy/cadence';
import { useI18n } from '@/lib/i18n';
import type {
  ActaInventoryItem,
  MeterReading,
  KeyDelivered,
  ActaSignature,
  ActaType,
  ItemCondition,
  RoomType,
  Consignacion,
} from '@/lib/types/inmobiliaria';
import {
  getRoomLabel,
  getConditionLabel,
  getConditionColor,
  getActaTypeLabel,
  ALL_ROOM_TYPES,
  DEFAULT_ROOMS,
  COMMON_ITEMS_BY_ROOM,
  ALL_ITEM_CONDITIONS,
} from '@/lib/types/inmobiliaria';

// ============================================================================
// Types
// ============================================================================

export interface FormData {
  // Step 1: Basic Info
  type: ActaType;
  consignacionId: string;
  deliveryDate: string;
  deliveryTime: string;
  // Property + parties auto-filled from consignacion

  // Step 2: Rooms
  rooms: RoomType[];

  // Step 3: Inventory
  items: ActaInventoryItem[];

  // Step 4: Meters & Keys
  meterReadings: MeterReading[];
  keysDelivered: KeyDelivered[];

  // Step 5: Observations
  generalCondition: ItemCondition;
  generalObservations: string;

  // Step 6: Signatures
  signatures: ActaSignature[];

  // Devolucion extras
  depositAmount?: number;
  deductions?: { concept: string; amount: number; notes?: string }[];
}

export interface StepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  consignaciones: Consignacion[];
  selectedConsignacion: Consignacion | undefined;
  t: (key: string, params?: Record<string, string | number>) => string;
}

// ============================================================================
// Step Components
// ============================================================================

/**
 * Step 1: Basic Info - Acta type, property selection, date/time
 */
export function StepBasicInfo({ formData, updateFormData, consignaciones, selectedConsignacion, t }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('inmobiliaria.acta.basicInfo')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.acta.basicInfoDesc')}
        </p>
      </div>

      {/* Acta Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.acta.actaType')}
        </label>
        <RadioCardGroup
          value={formData.type}
          onValueChange={(value) => updateFormData({ type: value as ActaType })}
          className="grid grid-cols-2"
        >
          {(['entrega', 'devolucion'] as ActaType[]).map((type) => (
            <RadioCard
              key={type}
              value={type}
              label={getActaTypeLabel(type)}
              description={
                type === 'entrega'
                  ? t('inmobiliaria.acta.typeEntregaDesc')
                  : t('inmobiliaria.acta.typeDevolucionDesc')
              }
            />
          ))}
        </RadioCardGroup>
      </div>

      {/* Property Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.acta.property')}
        </label>
        <Select
          value={formData.consignacionId || undefined}
          onValueChange={(value) => updateFormData({ consignacionId: value })}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('inmobiliaria.acta.selectProperty')} />
          </SelectTrigger>
          <SelectContent>
            {consignaciones.map((consignacion) => (
              <SelectItem key={consignacion.id} value={consignacion.id}>
                {consignacion.propertyTitle} - {consignacion.propertyAddress}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Selected Property Info */}
      {selectedConsignacion && (
        <div className="p-4 rounded-lg bg-surface-muted border border-border">
          <div className="flex items-start gap-4">
            {selectedConsignacion.propertyThumbnail && (
              <img
                src={selectedConsignacion.propertyThumbnail}
                alt={selectedConsignacion.propertyTitle}
                className="w-20 h-16 rounded-md object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground">
                {selectedConsignacion.propertyTitle}
              </h4>
              <p className="text-sm text-muted-foreground truncate">
                {selectedConsignacion.propertyAddress}
              </p>
              {selectedConsignacion.currentTenantName && (
                <p className="text-sm text-muted-foreground mt-1">
                  <User className="w-3 h-3 inline mr-1" />
                  {selectedConsignacion.currentTenantName}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Date and Time */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {formData.type === 'entrega' ? t('inmobiliaria.acta.deliveryDate') : t('inmobiliaria.acta.returnDate')}
          </label>
          <Input
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => updateFormData({ deliveryDate: e.target.value })}
            className="w-full"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">
            {t('inmobiliaria.acta.time')}
          </label>
          <Input
            type="time"
            value={formData.deliveryTime}
            onChange={(e) => updateFormData({ deliveryTime: e.target.value })}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 2: Room Selection
 */
export function StepRoomSelection({ formData, updateFormData, t }: StepProps) {
  const toggleRoom = (room: RoomType) => {
    const newRooms = formData.rooms.includes(room)
      ? formData.rooms.filter((r) => r !== room)
      : [...formData.rooms, room];
    updateFormData({ rooms: newRooms });
  };

  const selectDefaultRooms = () => {
    updateFormData({ rooms: [...DEFAULT_ROOMS] });
  };

  const selectAllRooms = () => {
    updateFormData({ rooms: [...ALL_ROOM_TYPES] });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('inmobiliaria.acta.spacesTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.acta.spacesDesc')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" hideArrow onClick={selectDefaultRooms}>
          {t('inmobiliaria.acta.basicSpaces')}
        </Button>
        <Button type="button" variant="outline" size="sm" hideArrow onClick={selectAllRooms}>
          {t('inmobiliaria.acta.selectAll')}
        </Button>
      </div>

      {/* Room Grid (multi-select) */}
      <div className="flex flex-wrap gap-2">
        {ALL_ROOM_TYPES.map((room) => {
          const isSelected = formData.rooms.includes(room);
          return (
            <Chip
              key={room}
              type="button"
              selected={isSelected}
              onClick={() => toggleRoom(room)}
              icon={isSelected ? <CheckCircle className="w-4 h-4" weight="fill" /> : undefined}
            >
              {getRoomLabel(room)}
            </Chip>
          );
        })}
      </div>

      {/* Selected Summary */}
      <div className="p-4 rounded-lg bg-primary-soft border border-primary/30">
        <p className="text-sm text-primary">
          <strong>{formData.rooms.length}</strong> {t('inmobiliaria.acta.spacesSelected')}
        </p>
      </div>
    </div>
  );
}

/**
 * Step 3: Inventory Items per Room
 */
export function StepInventory({ formData, updateFormData, t }: StepProps) {
  const [activeRoom, setActiveRoom] = useState<RoomType | null>(
    formData.rooms.length > 0 ? formData.rooms[0] : null
  );

  // Generate default items for a room
  const generateDefaultItems = useCallback((room: RoomType): ActaInventoryItem[] => {
    const commonItems = COMMON_ITEMS_BY_ROOM[room] || [];
    return commonItems.map((name, index) => ({
      id: `${room}-${index}-${Date.now()}`,
      room,
      name,
      quantity: 1,
      condition: 'bueno' as ItemCondition,
      hasDefects: false,
    }));
  }, []);

  // Add default items for room if none exist
  const ensureRoomItems = useCallback((room: RoomType) => {
    const roomItems = formData.items.filter((item) => item.room === room);
    if (roomItems.length === 0) {
      const newItems = generateDefaultItems(room);
      updateFormData({ items: [...formData.items, ...newItems] });
    }
  }, [formData.items, generateDefaultItems, updateFormData]);

  // Switch room and ensure items exist
  const handleRoomSwitch = (room: RoomType) => {
    setActiveRoom(room);
    ensureRoomItems(room);
  };

  // Update item condition
  const updateItemCondition = (itemId: string, condition: ItemCondition) => {
    const newItems = formData.items.map((item) =>
      item.id === itemId
        ? { ...item, condition, hasDefects: condition === 'malo' || condition === 'regular' }
        : item
    );
    updateFormData({ items: newItems });
  };

  // Update item defect description
  const updateItemDefect = (itemId: string, defectDescription: string) => {
    const newItems = formData.items.map((item) =>
      item.id === itemId ? { ...item, defectDescription } : item
    );
    updateFormData({ items: newItems });
  };

  // Add custom item
  const addCustomItem = (room: RoomType) => {
    const newItem: ActaInventoryItem = {
      id: `custom-${room}-${Date.now()}`,
      room,
      name: 'Nuevo item',
      quantity: 1,
      condition: 'bueno',
      hasDefects: false,
    };
    updateFormData({ items: [...formData.items, newItem] });
  };

  // Delete item
  const deleteItem = (itemId: string) => {
    updateFormData({ items: formData.items.filter((item) => item.id !== itemId) });
  };

  // Update item name
  const updateItemName = (itemId: string, name: string) => {
    const newItems = formData.items.map((item) =>
      item.id === itemId ? { ...item, name } : item
    );
    updateFormData({ items: newItems });
  };

  // Get items for active room
  const activeRoomItems = activeRoom
    ? formData.items.filter((item) => item.room === activeRoom)
    : [];

  // Get progress per room
  const getRoomProgress = (room: RoomType) => {
    const roomItems = formData.items.filter((item) => item.room === room);
    const total = roomItems.length;
    const completed = roomItems.filter((item) => item.condition !== 'bueno').length; // Changed from default
    return { total, completed };
  };

  // Initialize first room items if needed
  useState(() => {
    if (activeRoom && formData.items.filter((item) => item.room === activeRoom).length === 0) {
      ensureRoomItems(activeRoom);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('inmobiliaria.acta.inventoryTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.acta.inventoryDesc')}
        </p>
      </div>

      {/* Room Tabs (single active room switcher) */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {formData.rooms.map((room) => {
          const progress = getRoomProgress(room);
          const isActive = activeRoom === room;
          return (
            <Chip
              key={room}
              type="button"
              selected={isActive}
              onClick={() => handleRoomSwitch(room)}
              className="flex-shrink-0"
            >
              {getRoomLabel(room)}
              {progress.total > 0 && (
                <span className="ml-2 px-1.5 py-0.5 rounded text-xs bg-black/5 dark:bg-white/10">
                  {progress.total}
                </span>
              )}
            </Chip>
          );
        })}
      </div>

      {/* Items List */}
      {activeRoom && (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {activeRoomItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.02 }}
                className="p-4 rounded-lg bg-surface-muted border border-border"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Item Name */}
                    <Input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemName(item.id, e.target.value)}
                      className="w-full h-9 px-3 text-sm"
                    />

                    {/* Condition Selector (single-select; selected tone via getConditionColor) */}
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ITEM_CONDITIONS.map((condition) => (
                        <Chip
                          key={condition}
                          type="button"
                          selected={item.condition === condition}
                          onClick={() => updateItemCondition(item.id, condition)}
                          className={item.condition === condition ? getConditionColor(condition) : undefined}
                        >
                          {getConditionLabel(condition)}
                        </Chip>
                      ))}
                    </div>

                    {/* Defect Description */}
                    {item.hasDefects && (
                      <Input
                        type="text"
                        placeholder={t('inmobiliaria.acta.defectPlaceholder')}
                        value={item.defectDescription || ''}
                        onChange={(e) => updateItemDefect(item.id, e.target.value)}
                        className="w-full h-9 px-3 text-sm border-warning/40 bg-warning-soft/40"
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled
                      title={t('inmobiliaria.acta.addPhotoSoon')}
                      aria-label={t('inmobiliaria.acta.addPhotoSoon')}
                      icon={<Camera className="w-4 h-4" />}
                    />
                    <IconButton
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteItem(item.id)}
                      title={t('inmobiliaria.acta.deleteItem')}
                      aria-label={t('inmobiliaria.acta.deleteItem')}
                      icon={<Trash className="w-4 h-4" />}
                      className="text-fg-subtle hover:text-danger hover:bg-danger-soft/50"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Item Button */}
          <Button
            type="button"
            variant="outline"
            hideArrow
            onClick={() => addCustomItem(activeRoom)}
            className="w-full border-dashed text-fg-muted hover:text-primary"
          >
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.acta.addItem')}
          </Button>
        </div>
      )}

      {/* No rooms selected warning */}
      {formData.rooms.length === 0 && (
        <div className="p-6 rounded-lg bg-amber-50 dark:bg-amber-900/15 border border-amber-600/30 dark:border-amber-500/40 text-center">
          <Warning className="w-8 h-8 text-amber-700 dark:text-amber-400 mx-auto mb-2" />
          <p className="text-amber-700 dark:text-amber-400 font-medium">
            {t('inmobiliaria.acta.noSpacesSelected')}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
            {t('inmobiliaria.acta.noSpacesSelectedDesc')}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Step 4: Meters & Keys
 */
export function StepMetersKeys({ formData, updateFormData, t }: StepProps) {
  // Update meter reading
  const updateMeterReading = (type: MeterReading['type'], value: string) => {
    const existing = formData.meterReadings.find((m) => m.type === type);
    if (existing) {
      updateFormData({
        meterReadings: formData.meterReadings.map((m) =>
          m.type === type ? { ...m, reading: value } : m
        ),
      });
    } else {
      const unit = type === 'agua' ? 'm3' : type === 'luz' ? 'kWh' : 'm3';
      updateFormData({
        meterReadings: [...formData.meterReadings, { type, reading: value, unit }],
      });
    }
  };

  // Get meter reading value
  const getMeterValue = (type: MeterReading['type']) => {
    return formData.meterReadings.find((m) => m.type === type)?.reading || '';
  };

  // Add key
  const addKey = () => {
    updateFormData({
      keysDelivered: [...formData.keysDelivered, { type: '', quantity: 1 }],
    });
  };

  // Update key
  const updateKey = (index: number, updates: Partial<KeyDelivered>) => {
    const newKeys = formData.keysDelivered.map((key, i) =>
      i === index ? { ...key, ...updates } : key
    );
    updateFormData({ keysDelivered: newKeys });
  };

  // Delete key
  const deleteKey = (index: number) => {
    updateFormData({ keysDelivered: formData.keysDelivered.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      {/* Meters Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            {t('inmobiliaria.acta.metersTitle')}
          </h3>
          <p className="text-sm text-muted-foreground">
            {t('inmobiliaria.acta.metersDesc')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Water */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-primary-soft flex items-center justify-center">
                <span className="text-xs">💧</span>
              </span>
              {t('inmobiliaria.acta.waterMeter')}
            </label>
            <Input
              type="text"
              value={getMeterValue('agua')}
              onChange={(e) => updateMeterReading('agua', e.target.value)}
              placeholder="00000"
              className="w-full font-mono"
            />
          </div>

          {/* Electricity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/15 flex items-center justify-center">
                <Lightning className="w-3 h-3 text-amber-700 dark:text-amber-400" />
              </span>
              {t('inmobiliaria.acta.electricityMeter')}
            </label>
            <Input
              type="text"
              value={getMeterValue('luz')}
              onChange={(e) => updateMeterReading('luz', e.target.value)}
              placeholder="00000"
              className="w-full font-mono"
            />
          </div>

          {/* Gas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-amber-50 dark:bg-amber-900/15 flex items-center justify-center">
                <span className="text-xs">🔥</span>
              </span>
              {t('inmobiliaria.acta.gasMeter')}
            </label>
            <Input
              type="text"
              value={getMeterValue('gas')}
              onChange={(e) => updateMeterReading('gas', e.target.value)}
              placeholder="00000"
              className="w-full font-mono"
            />
          </div>
        </div>
      </div>

      {/* Keys Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {t('inmobiliaria.acta.keysTitle')}
            </h3>
            <p className="text-sm text-muted-foreground">
              {t('inmobiliaria.acta.keysDesc')}
            </p>
          </div>
          <Button type="button" size="sm" hideArrow onClick={addKey} className="gap-1.5">
            <Plus className="w-4 h-4" />
            {t('inmobiliaria.acta.add')}
          </Button>
        </div>

        {/* Keys List */}
        <div className="space-y-3">
          {formData.keysDelivered.map((key, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-lg bg-surface-muted border border-border"
            >
              <Key className="w-5 h-5 text-fg-subtle flex-shrink-0" />
              <Input
                type="text"
                value={key.type}
                onChange={(e) => updateKey(index, { type: e.target.value })}
                placeholder={t('inmobiliaria.acta.keyTypePlaceholder')}
                className="flex-1 h-9 px-3 text-sm"
              />
              <Input
                type="number"
                min={1}
                value={key.quantity}
                onChange={(e) => updateKey(index, { quantity: parseInt(e.target.value) || 1 })}
                className="w-20 h-9 px-3 text-sm text-center"
              />
              <IconButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => deleteKey(index)}
                aria-label={t('inmobiliaria.acta.deleteItem')}
                icon={<Trash className="w-4 h-4" />}
                className="text-fg-subtle hover:text-danger hover:bg-danger-soft/50"
              />
            </div>
          ))}

          {formData.keysDelivered.length === 0 && (
            <div className="p-6 rounded-lg bg-surface-muted border border-dashed border-border text-center">
              <Key className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
              <p className="text-muted-foreground text-sm">
                {t('inmobiliaria.acta.noKeysRegistered')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Step 5: General Observations
 */
export function StepObservations({ formData, updateFormData, t }: StepProps) {
  const { locale } = useI18n();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('inmobiliaria.acta.observationsTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.acta.observationsDesc')}
        </p>
      </div>

      {/* General Condition */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.acta.generalCondition')}
        </label>
        <div className="flex flex-wrap gap-2">
          {ALL_ITEM_CONDITIONS.filter((c) => c !== 'no_aplica').map((condition) => (
            <Chip
              key={condition}
              type="button"
              selected={formData.generalCondition === condition}
              onClick={() => updateFormData({ generalCondition: condition })}
              className={formData.generalCondition === condition ? getConditionColor(condition) : undefined}
            >
              {getConditionLabel(condition)}
            </Chip>
          ))}
        </div>
      </div>

      {/* General Observations */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          {t('inmobiliaria.acta.observations')}
        </label>
        <Textarea
          value={formData.generalObservations}
          onChange={(e) => updateFormData({ generalObservations: e.target.value })}
          rows={6}
          placeholder={t('inmobiliaria.acta.observationsPlaceholder')}
          className="w-full resize-none"
        />
        <p className="text-xs text-muted-foreground text-right">
          {formData.generalObservations.length} {t('inmobiliaria.acta.characters')}
        </p>
      </div>

      {/* Deposit Section (for devolucion) */}
      {formData.type === 'devolucion' && (
        <div className="space-y-4 pt-6 border-t border-border">
          <h4 className="font-medium text-foreground">
            {t('inmobiliaria.acta.depositAndDeductions')}
          </h4>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              {t('inmobiliaria.acta.depositAmount')}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fg-muted">$</span>
              <Input
                type="text"
                value={formData.depositAmount?.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US') || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                  updateFormData({ depositAmount: value });
                }}
                placeholder="0"
                className="w-full pl-8"
              />
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                {t('inmobiliaria.acta.deductions')}
              </label>
              <Button
                type="button"
                variant="link"
                size="sm"
                hideArrow
                onClick={() => {
                  const current = formData.deductions || [];
                  updateFormData({
                    deductions: [...current, { concept: '', amount: 0 }],
                  });
                }}
                className="h-auto p-0 text-xs"
              >
                + {t('inmobiliaria.acta.addDeduction')}
              </Button>
            </div>

            {(formData.deductions || []).map((deduction, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  type="text"
                  value={deduction.concept}
                  onChange={(e) => {
                    const newDeductions = [...(formData.deductions || [])];
                    newDeductions[index].concept = e.target.value;
                    updateFormData({ deductions: newDeductions });
                  }}
                  placeholder={t('inmobiliaria.acta.concept')}
                  className="flex-1 h-9 px-3 text-sm"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-fg-muted text-sm">$</span>
                  <Input
                    type="text"
                    value={deduction.amount.toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}
                    onChange={(e) => {
                      const newDeductions = [...(formData.deductions || [])];
                      newDeductions[index].amount = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                      updateFormData({ deductions: newDeductions });
                    }}
                    className="w-28 h-9 pl-6 pr-2 text-sm"
                  />
                </div>
                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newDeductions = formData.deductions?.filter((_, i) => i !== index);
                    updateFormData({ deductions: newDeductions });
                  }}
                  aria-label={t('inmobiliaria.acta.deleteItem')}
                  icon={<Trash className="w-4 h-4" />}
                  className="text-fg-subtle hover:text-danger"
                />
              </div>
            ))}

            {/* Net to Return */}
            {formData.depositAmount && (
              <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-600/30 dark:border-emerald-500/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                    {t('inmobiliaria.acta.amountToReturn')}:
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    ${(formData.depositAmount - (formData.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0)).toLocaleString(locale === 'es' ? 'es-CL' : 'en-US')}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Step 6: Review & Sign
 */
export function StepSignatures({ formData, updateFormData, selectedConsignacion, t }: StepProps) {
  // Calculate item summary
  const itemSummary = useMemo(() => {
    const summary = { excelente: 0, bueno: 0, regular: 0, malo: 0, no_aplica: 0 };
    formData.items.forEach((item) => {
      summary[item.condition]++;
    });
    return summary;
  }, [formData.items]);

  const totalKeys = formData.keysDelivered.reduce((sum, k) => sum + k.quantity, 0);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold text-foreground mb-2">
          {t('inmobiliaria.acta.reviewTitle')}
        </h3>
        <p className="text-sm text-muted-foreground">
          {t('inmobiliaria.acta.reviewDesc')}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Property */}
        <div className="p-4 rounded-lg bg-surface-muted border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            {t('inmobiliaria.acta.property')}
          </p>
          <p className="font-medium text-foreground text-sm">
            {selectedConsignacion?.propertyTitle || t('inmobiliaria.acta.notSelected')}
          </p>
        </div>

        {/* Spaces */}
        <div className="p-4 rounded-lg bg-surface-muted border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            {t('inmobiliaria.acta.spacesItems')}
          </p>
          <p className="font-medium text-foreground text-sm">
            {formData.rooms.length} {t('inmobiliaria.acta.spacesLabel')} / {formData.items.length} items
          </p>
        </div>

        {/* Keys */}
        <div className="p-4 rounded-lg bg-surface-muted border border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
            {t('inmobiliaria.acta.keys')}
          </p>
          <p className="font-medium text-foreground text-sm">
            {totalKeys} {t('inmobiliaria.acta.keysLabel')}
          </p>
        </div>
      </div>

      {/* Condition Summary */}
      <div className="p-4 rounded-lg bg-surface-muted border border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          {t('inmobiliaria.acta.conditionSummary')}
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(itemSummary).map(([condition, count]) => (
            <span
              key={condition}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium',
                count > 0
                  ? getConditionColor(condition as ItemCondition)
                  : 'bg-muted text-fg-subtle'
              )}
            >
              {getConditionLabel(condition as ItemCondition)}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* General Condition */}
      <div className="p-4 rounded-lg border-2 border-border">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          {t('inmobiliaria.acta.generalState')}
        </p>
        <span className={cn('px-3 py-1.5 rounded-md text-sm font-medium', getConditionColor(formData.generalCondition))}>
          {getConditionLabel(formData.generalCondition)}
        </span>
        {formData.generalObservations && (
          <p className="mt-3 text-sm text-muted-foreground">
            {formData.generalObservations}
          </p>
        )}
      </div>

      {/* Signature Pads Placeholder */}
      <div className="space-y-4">
        <h4 className="font-medium text-foreground">
          {t('inmobiliaria.acta.signaturesRequired')}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['tenant', 'owner', 'agent'] as const).map((party) => {
            const partyLabels = {
              tenant: t('inmobiliaria.acta.tenant'),
              owner: t('inmobiliaria.acta.owner'),
              agent: t('inmobiliaria.acta.agent'),
            };
            return (
              <div
                key={party}
                className="p-4 rounded-lg border-2 border-dashed border-border text-center"
              >
                <Signature className="w-8 h-8 text-fg-subtle mx-auto mb-2" />
                <p className="text-sm font-medium text-foreground">
                  {partyLabels[party]}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('inmobiliaria.acta.pendingSignature')}
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('inmobiliaria.acta.signaturesInfo')}
        </p>
      </div>
    </div>
  );
}
