'use client';

import { createContext, useContext, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { PropertyDraft, PUBLISH_STEPS, initialPropertyDraft } from '@/lib/types/publish';
import { propertiesApi } from '@/lib/api/properties.service';
import { resolvePropertyCoordinates } from '@/lib/constants/map';
import { ubicarDireccion } from '@/lib/inmuebles/ubicar-direccion';
import { toast } from '@/components/ui/toast';
import { mensajeParaLaPersona } from '@/lib/errores/traductor-de-errores';
import { repartirErroresDelServidor } from '@/lib/errores/errores-en-el-formulario';
import { erroresDelInmueble } from '@/lib/inmuebles/limites-del-inmueble';

/** Un campo del borrador que el back puede rechazar (`CreatePropertyDto`). */
type CampoDelBorrador = keyof PropertyDraft;

/**
 * En qué paso se corrige cada campo, y en qué orden los ve la persona: paso por
 * paso y, dentro de cada paso, como salen en la pantalla (de arriba abajo, de
 * izquierda a derecha). Sistema de errores, 02-10-2026: un 400 con `campos`
 * lleva a la persona al paso del PRIMER campo en este orden —no al primero que
 * mandó el servidor— y el foco va a ese campo. Los nombres del DTO coinciden
 * con los del borrador. `steps/index.errores.test.tsx` vigila que este orden
 * sea el de la pantalla.
 */
const CAMPOS_DE_CADA_PASO: ReadonlyArray<readonly [paso: number, campos: readonly CampoDelBorrador[]]> = [
  [1, ['type']],
  [2, ['city', 'neighborhood', 'address']],
  [3, ['bedrooms', 'bathrooms', 'area', 'parkingSpaces', 'floor', 'stratum', 'yearBuilt']],
  [4, ['amenities']],
  [6, ['monthlyRent', 'adminFee', 'deposit']],
  [7, ['title', 'description']],
];

/** Los campos que pinta el asistente, en el orden de la pantalla. */
export const ORDEN_DE_LOS_CAMPOS: readonly CampoDelBorrador[] = CAMPOS_DE_CADA_PASO.flatMap(
  ([, campos]) => campos,
);

/** El paso donde se corrige cada campo. Un campo que no está acá no se pinta. */
export const PASO_DEL_CAMPO: Readonly<Partial<Record<CampoDelBorrador, number>>> = Object.fromEntries(
  CAMPOS_DE_CADA_PASO.flatMap(([paso, campos]) => campos.map((campo) => [campo, paso])),
);

/** Una foto que no subió y por qué (para decirlo, no sólo a la consola). */
export interface FotoQueNoSubio {
  nombre: string;
  motivo: string;
}

interface PublishContextTextT {
  // State
  draft: PropertyDraft;
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  isSubmitting: boolean;
  isComplete: boolean;
  /**
   * El aviso del pie: SÓLO lo que no tiene campo en el asistente (un 5xx con
   * su referencia, la red, un 409 sin `campos`, un campo del sobre que ningún
   * paso pinta). Lo que tiene campo se pinta bajo ese campo y no se repite acá.
   * `null` = no hay nada sin campo.
   */
  submissionError: string | null;
  createdPropertyId: string | null;
  /**
   * Lo que el back (o el tope del cliente, espejo del DTO) rechazó, por campo
   * del borrador. Se vacía al editar ese campo.
   */
  erroresDelServidor: Partial<Record<CampoDelBorrador, string>>;
  /**
   * Los campos con error en el orden de la pantalla (`ORDEN_DE_LOS_CAMPOS`):
   * el primero es al que va el foco tras un fallo al publicar.
   */
  ordenDeLosErrores: readonly CampoDelBorrador[];
  /**
   * Los pasos con al menos un campo con error, de menor a mayor: la barra de
   * pasos los marca. Un paso sale de acá cuando se corrige su último error.
   */
  pasosConErrores: readonly number[];
  /** Las fotos que no subieron al publicar, con su motivo. Vacío = todas subieron. */
  fotosQueNoSubieron: FotoQueNoSubio[];

  // Photo files (File objects for upload)
  photoFiles: File[];
  addPhotoFiles: (files: File[]) => string[];
  removePhotoFile: (index: number) => void;
  reorderPhotoFiles: (fromIndex: number, toIndex: number) => void;

  // Actions
  updateDraft: (updates: Partial<PropertyDraft>) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  submitProperty: () => Promise<void>;
  resetDraft: () => void;

  // Validation
  isStepValid: (step: number) => boolean;
  canProceed: boolean;
}

const PublishContext = createContext<PublishContextTextT | null>(null);

export function PublishProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<PropertyDraft>(initialPropertyDraft);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [createdPropertyId, setCreatedPropertyId] = useState<string | null>(null);
  const [erroresDelServidor, setErroresDelServidor] = useState<Partial<Record<CampoDelBorrador, string>>>({});
  const [fotosQueNoSubieron, setFotosQueNoSubieron] = useState<FotoQueNoSubio[]>([]);
  const photoFilesRef = useRef<File[]>([]);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);

  const totalSteps = PUBLISH_STEPS.length;

  // Photo file management (keeps File objects in sync with draft.photos blob URLs)
  const addPhotoFiles = useCallback((files: File[]): string[] => {
    const urls = files.map((f) => URL.createObjectURL(f));
    photoFilesRef.current = [...photoFilesRef.current, ...files];
    setPhotoFiles([...photoFilesRef.current]);
    return urls;
  }, []);

  const removePhotoFile = useCallback((index: number) => {
    photoFilesRef.current = photoFilesRef.current.filter((_, i) => i !== index);
    setPhotoFiles([...photoFilesRef.current]);
  }, []);

  const reorderPhotoFiles = useCallback((fromIndex: number, toIndex: number) => {
    const updated = [...photoFilesRef.current];
    const [removed] = updated.splice(fromIndex, 1);
    updated.splice(toIndex, 0, removed);
    photoFilesRef.current = updated;
    setPhotoFiles([...photoFilesRef.current]);
  }, []);

  const updateDraft = useCallback((updates: Partial<PropertyDraft>) => {
    setDraft(prev => ({ ...prev, ...updates }));
    setErroresDelServidor((prev) => {
      const tocados = (Object.keys(updates) as CampoDelBorrador[]).filter((k) => prev[k] !== undefined);
      if (tocados.length === 0) return prev;
      const quedan = { ...prev };
      for (const k of tocados) delete quedan[k];
      return quedan;
    });
  }, []);

  const isStepValid = useCallback((step: number): boolean => {
    switch (step) {
      case 1: // TextT
        return draft.type !== '';
      case 2: // Location
        return draft.city !== '' && draft.neighborhood !== '' && draft.address !== '';
      case 3: // Details
        return draft.bedrooms > 0 && draft.bathrooms > 0 && draft.area > 0;
      case 4: // Amenities
        return true; // Optional
      case 5: // Photos
        return draft.photos.length >= 1; // At least 1 photo
      case 6: // Pricing
        return draft.monthlyRent > 0;
      case 7: // Description
        return draft.title !== '' && draft.description !== '';
      case 8: // Tenant Requirements
        return true; // Optional - landlord can skip this step
      case 9: // Plan
        return draft.ownerType !== '' && draft.selectedPlan !== '';
      case 10: // Review
        return true;
      default:
        return false;
    }
  }, [draft]);

  const canProceed = useMemo(() => isStepValid(currentStep), [isStepValid, currentStep]);

  const ordenDeLosErrores = useMemo(
    () => ORDEN_DE_LOS_CAMPOS.filter((campo) => !!erroresDelServidor[campo]),
    [erroresDelServidor],
  );

  // `ORDEN_DE_LOS_CAMPOS` va paso por paso: los pasos salen ya de menor a mayor.
  const pasosConErrores = useMemo(
    () => Array.from(new Set(ordenDeLosErrores.map((campo) => PASO_DEL_CAMPO[campo]!))),
    [ordenDeLosErrores],
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps && isStepValid(currentStep)) {
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, totalSteps, isStepValid, completedSteps]);

  const prevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const goToStep = useCallback((step: number) => {
    if (step >= 1 && step <= totalSteps) {
      if (step <= currentStep || completedSteps.includes(step - 1) || step === 1) {
        setCurrentStep(step);
      }
    }
  }, [currentStep, totalSteps, completedSteps]);

  /**
   * Cada error a su campo, la persona al paso del primero (en el orden de la
   * pantalla) y al aviso del pie SÓLO lo que no tiene campo (02-10-2026, Nico:
   * el pie repetía lo que ya se lee bajo cada campo). Un campo que ningún paso
   * pinta también va al pie: no se pierde nada.
   */
  const mostrarErrores = useCallback((porCampo: Partial<Record<CampoDelBorrador, string>>, sueltos: string[]) => {
    const conCampo: Partial<Record<CampoDelBorrador, string>> = {};
    const sinCampo = [...sueltos];
    for (const campo of Object.keys(porCampo) as CampoDelBorrador[]) {
      const mensaje = porCampo[campo];
      if (!mensaje) continue;
      if (PASO_DEL_CAMPO[campo] === undefined) sinCampo.push(mensaje);
      else conCampo[campo] = mensaje;
    }
    setErroresDelServidor(conCampo);
    const primero = ORDEN_DE_LOS_CAMPOS.find((c) => conCampo[c] !== undefined);
    if (primero) setCurrentStep(PASO_DEL_CAMPO[primero]!);
    const texto = Array.from(new Set(sinCampo)).join(' · ');
    setSubmissionError(texto || null);
  }, []);

  const submitProperty = useCallback(async () => {
    setIsSubmitting(true);
    setSubmissionError(null);
    setErroresDelServidor({});
    setFotosQueNoSubieron([]);

    // Los topes del back (`limites-del-inmueble.ts`, espejo del DTO): lo que el
    // servidor rechazaría no se manda, y se dice con la misma frase.
    const topes = erroresDelInmueble({
      title: draft.title,
      address: draft.address,
      city: draft.city,
      neighborhood: draft.neighborhood,
      monthlyRent: draft.monthlyRent || undefined,
      adminFee: draft.adminFee || undefined,
      deposit: draft.deposit || undefined,
      bedrooms: draft.bedrooms,
      bathrooms: draft.bathrooms,
      area: draft.area || undefined,
      floor: draft.floor || undefined,
      parkingSpaces: draft.parkingSpaces || undefined,
    }) as Partial<Record<CampoDelBorrador, string>>;
    if (Object.keys(topes).length > 0) {
      mostrarErrores(topes, []);
      setIsSubmitting(false);
      return;
    }

    try {
      /*
       * 1. Create property via API.
       *
       * 🔴 2026-09-12: acá también se resuelve la ubicación al crear, con la
       * misma regla del panel (`ubicarDireccion`). Lo que había era la tabla
       * de 32 ciudades, y es la razón por la que 1.442 inmuebles del
       * portafolio migrado quedaron sin punto en el mapa: su municipio
       * —Caldas, La Estrella, Amagá— no estaba en la lista, y no hay lista
       * que cubra los 1.103 del país.
       *
       * Lo que la persona eligió en el buscador manda y ni se vuelve a
       * buscar; `resolvePropertyCoordinates` sigue siendo eso. La búsqueda es
       * sólo para quien escribió la dirección y siguió de largo.
       */
      const elegidas = resolvePropertyCoordinates(draft);
      const coords =
        elegidas.source === 'geocoded'
          ? elegidas
          : await ubicarDireccion({ direccion: draft.address, ciudad: draft.city }).then((u) => ({
              lat: u.lat,
              lng: u.lng,
            }));

      const created = await propertiesApi.create({
        title: draft.title,
        description: draft.description,
        type: draft.type,
        status: 'AVAILABLE',
        city: draft.city,
        neighborhood: draft.neighborhood,
        address: draft.address,
        latitude: coords.lat,
        longitude: coords.lng,
        monthlyRent: draft.monthlyRent,
        bedrooms: draft.bedrooms,
        bathrooms: draft.bathrooms,
        area: draft.area,
        adminFee: draft.adminFee || undefined,
        deposit: draft.deposit || undefined,
        floor: draft.floor || undefined,
        parkingSpaces: draft.parkingSpaces || undefined,
        stratum: draft.stratum || undefined,
        yearBuilt: draft.yearBuilt || undefined,
        amenities: draft.amenities.length > 0 ? draft.amenities : undefined,
      });

      // 2. Upload photos sequentially
      //
      // 🔴 Antes una foto que fallaba sólo iba a la consola: el inmueble salía
      // publicado con menos fotos y nadie se enteraba. Ahora cada fallo queda
      // con su motivo (por el traductor) y se avisa; el inmueble ya existe, así
      // que no se aborta nada.
      const files = photoFilesRef.current;
      const fallidas: FotoQueNoSubio[] = [];
      for (const file of files) {
        try {
          await propertiesApi.uploadImage(created.id, file);
        } catch (e) {
          // Continue uploading remaining photos even if one fails
          fallidas.push({
            nombre: file.name,
            motivo: mensajeParaLaPersona(e, {
              porDefecto: `No pudimos subir «${file.name}».`,
              accion: `subir «${file.name}»`,
            }),
          });
        }
      }
      if (fallidas.length > 0) {
        setFotosQueNoSubieron(fallidas);
        toast.warning(
          fallidas.length === 1
            ? 'El inmueble quedó publicado, pero una foto no se subió'
            : `El inmueble quedó publicado, pero ${fallidas.length} fotos no se subieron`,
          { description: `${fallidas[0].motivo} Puedes agregarlas desde el inmueble.` },
        );
      }

      setCreatedPropertyId(created.id);
      setIsComplete(true);
    } catch (err) {
      // Un 400 con `campos` lleva al paso del campo; un 5xx dice «de nuestro
      // lado» con la referencia; «conexión», sólo sin respuesta.
      // Un campo del sobre que ningún paso pinta queda en `sueltos` (al pie).
      const reparto = repartirErroresDelServidor<CampoDelBorrador>(err, {
        campos: ORDEN_DE_LOS_CAMPOS,
        porDefecto: 'No pudimos publicar el inmueble. Prueba de nuevo en un momento.',
        accion: 'publicar el inmueble',
      });
      mostrarErrores(reparto.porCampo, reparto.sueltos);
    } finally {
      setIsSubmitting(false);
    }
  }, [draft, mostrarErrores]);

  const resetDraft = useCallback(() => {
    setDraft(initialPropertyDraft);
    setCurrentStep(1);
    setCompletedSteps([]);
    setSubmissionError(null);
    setCreatedPropertyId(null);
    setIsComplete(false);
    setErroresDelServidor({});
    setFotosQueNoSubieron([]);
    // Clean up blob URLs
    photoFilesRef.current = [];
    setPhotoFiles([]);
  }, []);

  const value: PublishContextTextT = {
    draft,
    currentStep,
    totalSteps,
    completedSteps,
    isSubmitting,
    isComplete,
    submissionError,
    createdPropertyId,
    erroresDelServidor,
    ordenDeLosErrores,
    pasosConErrores,
    fotosQueNoSubieron,
    photoFiles,
    addPhotoFiles,
    removePhotoFile,
    reorderPhotoFiles,
    updateDraft,
    nextStep,
    prevStep,
    goToStep,
    submitProperty,
    resetDraft,
    isStepValid,
    canProceed,
  };

  return (
    <PublishContext.Provider value={value}>
      {children}
    </PublishContext.Provider>
  );
}

export function usePublish() {
  const context = useContext(PublishContext);
  if (!context) {
    throw new Error('usePublish must be used within a PublishProvider');
  }
  return context;
}
