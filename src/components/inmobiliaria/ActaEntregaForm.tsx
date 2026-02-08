'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HouseLine,
  CalendarBlank,
  ClipboardText,
  Lightning,
  Key,
  FileText,
  Signature,
  CaretLeft,
  CaretRight,
  Check,
  X,
  Plus,
  Trash,
  Camera,
  SpinnerGap,
  CheckCircle,
  Warning,
  House,
  User,
  Clock,
  FloppyDisk,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import type {
  ActaEntrega,
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

interface ActaEntregaFormProps {
  initialData?: Partial<ActaEntrega>;
  consignaciones: Consignacion[];
  onSave?: (acta: ActaEntrega) => void;
  onSaveDraft?: (acta: Partial<ActaEntrega>) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

interface FormData {
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

// ============================================================================
// Steps Configuration
// ============================================================================

const STEPS = [
  { id: 1, label: 'Informacion', icon: HouseLine },
  { id: 2, label: 'Espacios', icon: House },
  { id: 3, label: 'Inventario', icon: ClipboardText },
  { id: 4, label: 'Contadores', icon: Lightning },
  { id: 5, label: 'Observaciones', icon: FileText },
  { id: 6, label: 'Firmas', icon: Signature },
];

// ============================================================================
// Step Components
// ============================================================================

interface StepProps {
  formData: FormData;
  updateFormData: (data: Partial<FormData>) => void;
  consignaciones: Consignacion[];
  selectedConsignacion: Consignacion | undefined;
}

/**
 * Step 1: Basic Info - Acta type, property selection, date/time
 */
function StepBasicInfo({ formData, updateFormData, consignaciones, selectedConsignacion }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          Informacion Basica
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Seleccione el tipo de acta y la propiedad correspondiente.
        </p>
      </div>

      {/* Acta Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Tipo de Acta
        </label>
        <div className="grid grid-cols-2 gap-3">
          {(['entrega', 'devolucion'] as ActaType[]).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => updateFormData({ type })}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                formData.type === type
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <span className={cn(
                'text-sm font-medium',
                formData.type === type
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-neutral-900 dark:text-white'
              )}>
                {getActaTypeLabel(type)}
              </span>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                {type === 'entrega'
                  ? 'Registro de entrega al inquilino'
                  : 'Registro de devolucion del inmueble'}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Property Selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Propiedad
        </label>
        <select
          value={formData.consignacionId}
          onChange={(e) => updateFormData({ consignacionId: e.target.value })}
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        >
          <option value="">Seleccionar propiedad...</option>
          {consignaciones.map((consignacion) => (
            <option key={consignacion.id} value={consignacion.id}>
              {consignacion.propertyTitle} - {consignacion.propertyAddress}
            </option>
          ))}
        </select>
      </div>

      {/* Selected Property Info */}
      {selectedConsignacion && (
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
          <div className="flex items-start gap-4">
            {selectedConsignacion.propertyThumbnail && (
              <img
                src={selectedConsignacion.propertyThumbnail}
                alt={selectedConsignacion.propertyTitle}
                className="w-20 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-neutral-900 dark:text-white">
                {selectedConsignacion.propertyTitle}
              </h4>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 truncate">
                {selectedConsignacion.propertyAddress}
              </p>
              {selectedConsignacion.currentTenantName && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
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
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Fecha de {formData.type === 'entrega' ? 'Entrega' : 'Devolucion'}
          </label>
          <input
            type="date"
            value={formData.deliveryDate}
            onChange={(e) => updateFormData({ deliveryDate: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Hora
          </label>
          <input
            type="time"
            value={formData.deliveryTime}
            onChange={(e) => updateFormData({ deliveryTime: e.target.value })}
            className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Step 2: Room Selection
 */
function StepRoomSelection({ formData, updateFormData }: StepProps) {
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
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          Espacios a Inspeccionar
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Seleccione los espacios del inmueble que seran incluidos en el acta.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={selectDefaultRooms}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Espacios Basicos
        </button>
        <button
          type="button"
          onClick={selectAllRooms}
          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
        >
          Seleccionar Todos
        </button>
      </div>

      {/* Room Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {ALL_ROOM_TYPES.map((room) => {
          const isSelected = formData.rooms.includes(room);
          return (
            <button
              key={room}
              type="button"
              onClick={() => toggleRoom(room)}
              className={cn(
                'p-4 rounded-xl border-2 text-left transition-all',
                isSelected
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn(
                  'text-sm font-medium',
                  isSelected
                    ? 'text-indigo-600 dark:text-indigo-400'
                    : 'text-neutral-900 dark:text-white'
                )}>
                  {getRoomLabel(room)}
                </span>
                {isSelected && (
                  <CheckCircle className="w-4 h-4 text-indigo-500" weight="fill" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Summary */}
      <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
        <p className="text-sm text-indigo-700 dark:text-indigo-400">
          <strong>{formData.rooms.length}</strong> espacios seleccionados
        </p>
      </div>
    </div>
  );
}

/**
 * Step 3: Inventory Items per Room
 */
function StepInventory({ formData, updateFormData }: StepProps) {
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
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          Inventario por Espacio
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Revise y califique la condicion de cada item por espacio.
        </p>
      </div>

      {/* Room Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {formData.rooms.map((room) => {
          const progress = getRoomProgress(room);
          const isActive = activeRoom === room;
          return (
            <button
              key={room}
              type="button"
              onClick={() => handleRoomSwitch(room)}
              className={cn(
                'flex-shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all',
                isActive
                  ? 'bg-indigo-500 text-white'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              )}
            >
              {getRoomLabel(room)}
              {progress.total > 0 && (
                <span className={cn(
                  'ml-2 px-1.5 py-0.5 rounded text-xs',
                  isActive ? 'bg-indigo-600' : 'bg-neutral-200 dark:bg-neutral-700'
                )}>
                  {progress.total}
                </span>
              )}
            </button>
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
                className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-3">
                    {/* Item Name */}
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemName(item.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />

                    {/* Condition Selector */}
                    <div className="flex flex-wrap gap-1.5">
                      {ALL_ITEM_CONDITIONS.map((condition) => (
                        <button
                          key={condition}
                          type="button"
                          onClick={() => updateItemCondition(item.id, condition)}
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-xs font-medium transition-all',
                            item.condition === condition
                              ? getConditionColor(condition)
                              : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
                          )}
                        >
                          {getConditionLabel(condition)}
                        </button>
                      ))}
                    </div>

                    {/* Defect Description */}
                    {item.hasDefects && (
                      <input
                        type="text"
                        placeholder="Descripcion del defecto..."
                        value={item.defectDescription || ''}
                        onChange={(e) => updateItemDefect(item.id, e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 text-neutral-900 dark:text-white text-sm placeholder:text-amber-600/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                      />
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      className="p-2 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors opacity-50 cursor-not-allowed"
                      title="Agregar foto (proximamente)"
                      disabled
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteItem(item.id)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="Eliminar item"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add Item Button */}
          <button
            type="button"
            onClick={() => addCustomItem(activeRoom)}
            className="w-full flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400 hover:border-indigo-500 hover:text-indigo-500 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar Item
          </button>
        </div>
      )}

      {/* No rooms selected warning */}
      {formData.rooms.length === 0 && (
        <div className="p-6 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 text-center">
          <Warning className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-amber-700 dark:text-amber-400 font-medium">
            No hay espacios seleccionados
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
            Por favor regrese al paso anterior y seleccione los espacios a inspeccionar.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Step 4: Meters & Keys
 */
function StepMetersKeys({ formData, updateFormData }: StepProps) {
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
          <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
            Lectura de Contadores
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Registre las lecturas actuales de los contadores de servicios.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Water */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <span className="text-xs">💧</span>
              </span>
              Agua (m3)
            </label>
            <input
              type="text"
              value={getMeterValue('agua')}
              onChange={(e) => updateMeterReading('agua', e.target.value)}
              placeholder="00000"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Electricity */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Lightning className="w-3 h-3 text-amber-600" />
              </span>
              Luz (kWh)
            </label>
            <input
              type="text"
              value={getMeterValue('luz')}
              onChange={(e) => updateMeterReading('luz', e.target.value)}
              placeholder="00000"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
          </div>

          {/* Gas */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <span className="text-xs">🔥</span>
              </span>
              Gas (m3)
            </label>
            <input
              type="text"
              value={getMeterValue('gas')}
              onChange={(e) => updateMeterReading('gas', e.target.value)}
              placeholder="00000"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Keys Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              Llaves Entregadas
            </h3>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              Registre todas las llaves y controles entregados.
            </p>
          </div>
          <button
            type="button"
            onClick={addKey}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-indigo-500 text-white hover:bg-indigo-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Agregar
          </button>
        </div>

        {/* Keys List */}
        <div className="space-y-3">
          {formData.keysDelivered.map((key, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800"
            >
              <Key className="w-5 h-5 text-neutral-400 flex-shrink-0" />
              <input
                type="text"
                value={key.type}
                onChange={(e) => updateKey(index, { type: e.target.value })}
                placeholder="Tipo de llave (ej: Principal, Buzon)"
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <input
                type="number"
                min={1}
                value={key.quantity}
                onChange={(e) => updateKey(index, { quantity: parseInt(e.target.value) || 1 })}
                className="w-20 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#1a1a1c] text-neutral-900 dark:text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
              <button
                type="button"
                onClick={() => deleteKey(index)}
                className="p-2 rounded-lg text-neutral-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash className="w-4 h-4" />
              </button>
            </div>
          ))}

          {formData.keysDelivered.length === 0 && (
            <div className="p-6 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-dashed border-neutral-200 dark:border-neutral-700 text-center">
              <Key className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
              <p className="text-neutral-500 dark:text-neutral-400 text-sm">
                No hay llaves registradas
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
function StepObservations({ formData, updateFormData }: StepProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          Observaciones Generales
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Registre el estado general del inmueble y cualquier observacion adicional.
        </p>
      </div>

      {/* General Condition */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Estado General del Inmueble
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ALL_ITEM_CONDITIONS.filter((c) => c !== 'no_aplica').map((condition) => (
            <button
              key={condition}
              type="button"
              onClick={() => updateFormData({ generalCondition: condition })}
              className={cn(
                'p-3 rounded-xl text-center transition-all',
                formData.generalCondition === condition
                  ? getConditionColor(condition) + ' ring-2 ring-offset-2 ring-neutral-900 dark:ring-neutral-100'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              )}
            >
              <span className="text-sm font-medium">{getConditionLabel(condition)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* General Observations */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          Observaciones
        </label>
        <textarea
          value={formData.generalObservations}
          onChange={(e) => updateFormData({ generalObservations: e.target.value })}
          rows={6}
          placeholder="Ingrese cualquier observacion adicional sobre el estado del inmueble, reparaciones pendientes, recomendaciones, etc."
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
        />
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-right">
          {formData.generalObservations.length} caracteres
        </p>
      </div>

      {/* Deposit Section (for devolucion) */}
      {formData.type === 'devolucion' && (
        <div className="space-y-4 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <h4 className="font-medium text-neutral-900 dark:text-white">
            Deposito y Deducciones
          </h4>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Valor del Deposito
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
              <input
                type="text"
                value={formData.depositAmount?.toLocaleString('es-CO') || ''}
                onChange={(e) => {
                  const value = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                  updateFormData({ depositAmount: value });
                }}
                placeholder="0"
                className="w-full pl-8 pr-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Deducciones
              </label>
              <button
                type="button"
                onClick={() => {
                  const current = formData.deductions || [];
                  updateFormData({
                    deductions: [...current, { concept: '', amount: 0 }],
                  });
                }}
                className="text-xs font-medium text-indigo-500 hover:text-indigo-600"
              >
                + Agregar deduccion
              </button>
            </div>

            {(formData.deductions || []).map((deduction, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="text"
                  value={deduction.concept}
                  onChange={(e) => {
                    const newDeductions = [...(formData.deductions || [])];
                    newDeductions[index].concept = e.target.value;
                    updateFormData({ deductions: newDeductions });
                  }}
                  placeholder="Concepto"
                  className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <div className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-neutral-500 text-sm">$</span>
                  <input
                    type="text"
                    value={deduction.amount.toLocaleString('es-CO')}
                    onChange={(e) => {
                      const newDeductions = [...(formData.deductions || [])];
                      newDeductions[index].amount = parseInt(e.target.value.replace(/\D/g, '')) || 0;
                      updateFormData({ deductions: newDeductions });
                    }}
                    className="w-28 pl-6 pr-2 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#141416] text-neutral-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newDeductions = formData.deductions?.filter((_, i) => i !== index);
                    updateFormData({ deductions: newDeductions });
                  }}
                  className="p-2 text-neutral-400 hover:text-red-500"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            ))}

            {/* Net to Return */}
            {formData.depositAmount && (
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-emerald-700 dark:text-emerald-400">
                    Valor a devolver:
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    ${(formData.depositAmount - (formData.deductions?.reduce((sum, d) => sum + d.amount, 0) || 0)).toLocaleString('es-CO')}
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
function StepSignatures({ formData, updateFormData, selectedConsignacion }: StepProps) {
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
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">
          Revision y Firmas
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">
          Revise el resumen del acta antes de enviar a firmas.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Property */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Propiedad
          </p>
          <p className="font-medium text-neutral-900 dark:text-white text-sm">
            {selectedConsignacion?.propertyTitle || 'No seleccionada'}
          </p>
        </div>

        {/* Spaces */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Espacios / Items
          </p>
          <p className="font-medium text-neutral-900 dark:text-white text-sm">
            {formData.rooms.length} espacios / {formData.items.length} items
          </p>
        </div>

        {/* Keys */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
            Llaves
          </p>
          <p className="font-medium text-neutral-900 dark:text-white text-sm">
            {totalKeys} llaves
          </p>
        </div>
      </div>

      {/* Condition Summary */}
      <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#141416] border border-neutral-100 dark:border-neutral-800">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-3">
          Resumen de Condiciones
        </p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(itemSummary).map(([condition, count]) => (
            <span
              key={condition}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-medium',
                count > 0
                  ? getConditionColor(condition as ItemCondition)
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
              )}
            >
              {getConditionLabel(condition as ItemCondition)}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* General Condition */}
      <div className="p-4 rounded-xl border-2 border-neutral-200 dark:border-neutral-700">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
          Estado General
        </p>
        <span className={cn('px-3 py-1.5 rounded-lg text-sm font-medium', getConditionColor(formData.generalCondition))}>
          {getConditionLabel(formData.generalCondition)}
        </span>
        {formData.generalObservations && (
          <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
            {formData.generalObservations}
          </p>
        )}
      </div>

      {/* Signature Pads Placeholder */}
      <div className="space-y-4">
        <h4 className="font-medium text-neutral-900 dark:text-white">
          Firmas Requeridas
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {(['tenant', 'owner', 'agent'] as const).map((party) => {
            const partyLabels = {
              tenant: 'Inquilino',
              owner: 'Propietario',
              agent: 'Agente',
            };
            return (
              <div
                key={party}
                className="p-4 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-700 text-center"
              >
                <Signature className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {partyLabels[party]}
                </p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  Pendiente de firma
                </p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          Las firmas se solicitaran despues de guardar el acta.
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * ActaEntregaForm - Multi-step wizard for creating delivery/return actas
 */
export function ActaEntregaForm({
  initialData,
  consignaciones,
  onSave,
  onSaveDraft,
  onCancel,
  isLoading = false,
}: ActaEntregaFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [formData, setFormData] = useState<FormData>({
    type: initialData?.type || 'entrega',
    consignacionId: initialData?.consignacionId || '',
    deliveryDate: initialData?.deliveryDate || new Date().toISOString().split('T')[0],
    deliveryTime: initialData?.deliveryTime || '10:00',
    rooms: initialData?.rooms || [...DEFAULT_ROOMS],
    items: initialData?.items || [],
    meterReadings: initialData?.meterReadings || [],
    keysDelivered: initialData?.keysDelivered || [
      { type: 'Llave principal', quantity: 2 },
      { type: 'Llave buzon', quantity: 1 },
    ],
    generalCondition: initialData?.generalCondition || 'bueno',
    generalObservations: initialData?.generalObservations || '',
    signatures: initialData?.signatures || [],
    depositAmount: initialData?.depositAmount,
    deductions: initialData?.deductions,
  });

  // Update form data helper
  const updateFormData = useCallback((data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
  }, []);

  // Get selected consignacion
  const selectedConsignacion = useMemo(
    () => consignaciones.find((c) => c.id === formData.consignacionId),
    [consignaciones, formData.consignacionId]
  );

  // Step validation
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1:
        return Boolean(formData.consignacionId && formData.deliveryDate);
      case 2:
        return formData.rooms.length > 0;
      case 3:
        return true; // Inventory is optional
      case 4:
        return true; // Meters and keys are optional
      case 5:
        return Boolean(formData.generalCondition);
      case 6:
        return true; // Review step always valid
      default:
        return false;
    }
  }, [currentStep, formData]);

  // Navigation
  const goToNextStep = useCallback(() => {
    if (currentStep < 6 && isStepValid) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, isStepValid]);

  const goToPreviousStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= 6) {
      setCurrentStep(step);
    }
  }, []);

  // Save draft handler
  const handleSaveDraft = useCallback(() => {
    if (!selectedConsignacion) return;

    const draftActa: Partial<ActaEntrega> = {
      ...formData,
      propertyId: selectedConsignacion.propertyId,
      propertyTitle: selectedConsignacion.propertyTitle,
      propertyAddress: selectedConsignacion.propertyAddress,
      tenantId: 'tenant-1',
      tenantName: selectedConsignacion.currentTenantName || '',
      tenantCedula: '',
      tenantPhone: '',
      tenantEmail: '',
      propietarioId: selectedConsignacion.propietarioId,
      propietarioName: '',
      agenteId: selectedConsignacion.agenteId,
      agenteName: '',
      leaseId: selectedConsignacion.currentLeaseId || '',
      status: 'draft',
    };

    onSaveDraft?.(draftActa);
    toast.success({
      title: 'Borrador guardado',
      description: 'El acta se ha guardado como borrador.',
    });
  }, [formData, selectedConsignacion, onSaveDraft]);

  // Submit handler
  const handleSubmit = useCallback(async () => {
    if (!selectedConsignacion) return;

    setIsSubmitting(true);

    try {
      const acta: ActaEntrega = {
        id: `acta-${Date.now()}`,
        ...formData,
        propertyId: selectedConsignacion.propertyId,
        propertyTitle: selectedConsignacion.propertyTitle,
        propertyAddress: selectedConsignacion.propertyAddress,
        tenantId: 'tenant-1',
        tenantName: selectedConsignacion.currentTenantName || 'Inquilino',
        tenantCedula: '1.234.567.890',
        tenantPhone: '+57 300 123 4567',
        tenantEmail: 'inquilino@email.com',
        propietarioId: selectedConsignacion.propietarioId,
        propietarioName: 'Propietario',
        agenteId: selectedConsignacion.agenteId,
        agenteName: 'Agente',
        leaseId: selectedConsignacion.currentLeaseId || '',
        status: 'pending_signatures',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1500));

      onSave?.(acta);
      toast.success({
        title: 'Acta creada exitosamente',
        description: 'El acta ha sido creada y enviada para firmas.',
      });
    } catch (error) {
      console.error('Error creating acta:', error);
      toast.error({
        title: 'Error al crear acta',
        description: 'Ocurrio un error. Por favor intenta de nuevo.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, selectedConsignacion, onSave]);

  // Get step status
  const getStepStatus = (stepId: number) => {
    if (stepId < currentStep) return 'completed';
    if (stepId === currentStep) return 'current';
    return 'upcoming';
  };

  // Step props
  const stepProps: StepProps = {
    formData,
    updateFormData,
    consignaciones,
    selectedConsignacion,
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepBasicInfo {...stepProps} />;
      case 2:
        return <StepRoomSelection {...stepProps} />;
      case 3:
        return <StepInventory {...stepProps} />;
      case 4:
        return <StepMetersKeys {...stepProps} />;
      case 5:
        return <StepObservations {...stepProps} />;
      case 6:
        return <StepSignatures {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Step Indicator */}
      <div className="mb-8">
        {/* Desktop Steps */}
        <div className="hidden md:flex items-center justify-between">
          {STEPS.map((step, index) => {
            const status = getStepStatus(step.id);
            const StepIcon = step.icon;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => status !== 'upcoming' && goToStep(step.id)}
                  disabled={status === 'upcoming'}
                  className={cn(
                    'flex flex-col items-center gap-2 transition-all',
                    status === 'upcoming' ? 'cursor-not-allowed' : 'cursor-pointer'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                      status === 'completed'
                        ? 'bg-emerald-500 text-white'
                        : status === 'current'
                        ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/20'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400'
                    )}
                  >
                    {status === 'completed' ? (
                      <Check className="w-5 h-5" weight="bold" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      status === 'current'
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : status === 'completed'
                        ? 'text-neutral-900 dark:text-white'
                        : 'text-neutral-400'
                    )}
                  >
                    {step.label}
                  </span>
                </button>

                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 mx-2',
                      step.id < currentStep
                        ? 'bg-emerald-500'
                        : 'bg-neutral-200 dark:bg-neutral-700'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Mobile Progress */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-neutral-900 dark:text-white">
              Paso {currentStep} de 6: {STEPS[currentStep - 1]?.label}
            </span>
            <span className="text-sm text-neutral-500">
              {Math.round((currentStep / 6) * 100)}%
            </span>
          </div>
          <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-indigo-500"
              initial={false}
              animate={{ width: `${(currentStep / 6) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-[#1a1a1c] rounded-2xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
        <div className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer Navigation */}
        <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-[#141416]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <CaretLeft className="w-4 h-4" />
                  Anterior
                </button>
              )}
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  Cancelar
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Save Draft */}
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={!formData.consignacionId}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FloppyDisk className="w-4 h-4" />
                Guardar Borrador
              </button>

              {/* Next / Submit */}
              {currentStep < 6 ? (
                <button
                  type="button"
                  onClick={goToNextStep}
                  disabled={!isStepValid}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-indigo-500 text-white font-medium hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                  <CaretRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting || isLoading}
                  className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl bg-emerald-500 text-white font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <SpinnerGap className="w-4 h-4 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" weight="bold" />
                      Crear Acta
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActaEntregaForm;
