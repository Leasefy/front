'use client';

import { useState } from 'react';
import {
  FileText,
  Download,
  Eye,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  Clock,
  File,
  FileCheck,
  Home,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlanStatusBadge } from '@/components/ui/plan/PlanStatusBadge';
import { Button } from '@/components/ui/button';

// Mock documents data
const mockDocuments = [
  {
    id: '1',
    name: 'Contrato de Arriendo',
    type: 'contract',
    property: 'Departamento Providencia',
    date: '2024-01-15',
    size: '2.4 MB',
    status: 'signed',
    icon: FileCheck,
    previewUrl: '/documents/contrato-arriendo.pdf',
  },
  {
    id: '2',
    name: 'Comprobante de Pago - Enero 2024',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2024-01-05',
    size: '156 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-enero-2024.pdf',
  },
  {
    id: '3',
    name: 'Comprobante de Pago - Diciembre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-12-05',
    size: '148 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-diciembre-2023.pdf',
  },
  {
    id: '4',
    name: 'Anexo de Contrato - Mascotas',
    type: 'contract',
    property: 'Departamento Providencia',
    date: '2024-01-20',
    size: '890 KB',
    status: 'pending',
    icon: File,
    previewUrl: '/documents/anexo-mascotas.pdf',
  },
  {
    id: '5',
    name: 'Inventario de Entrega',
    type: 'inventory',
    property: 'Departamento Providencia',
    date: '2024-01-15',
    size: '3.1 MB',
    status: 'signed',
    icon: FileCheck,
    previewUrl: '/documents/inventario-entrega.pdf',
  },
  {
    id: '6',
    name: 'Comprobante de Pago - Noviembre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-11-05',
    size: '152 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-noviembre-2023.pdf',
  },
  {
    id: '7',
    name: 'Comprobante de Pago - Octubre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-10-05',
    size: '149 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-octubre-2023.pdf',
  },
  {
    id: '8',
    name: 'Comprobante de Pago - Septiembre 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-09-05',
    size: '151 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-septiembre-2023.pdf',
  },
  {
    id: '9',
    name: 'Comprobante de Pago - Agosto 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-08-05',
    size: '147 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-agosto-2023.pdf',
  },
  {
    id: '10',
    name: 'Comprobante de Pago - Julio 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-07-05',
    size: '153 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-julio-2023.pdf',
  },
  {
    id: '11',
    name: 'Comprobante de Pago - Junio 2023',
    type: 'receipt',
    property: 'Departamento Providencia',
    date: '2023-06-05',
    size: '150 KB',
    status: 'available',
    icon: FileText,
    previewUrl: '/documents/comprobante-junio-2023.pdf',
  },
  {
    id: '12',
    name: 'Inventario de Entrega - Anexo Fotos',
    type: 'inventory',
    property: 'Departamento Providencia',
    date: '2024-01-15',
    size: '8.2 MB',
    status: 'signed',
    icon: FileCheck,
    previewUrl: '/documents/inventario-fotos.pdf',
  },
];

const ITEMS_PER_PAGE = 5;

type Document = typeof mockDocuments[number];

const documentTypes = [
  { value: 'all', label: 'Todos' },
  { value: 'contract', label: 'Contratos' },
  { value: 'receipt', label: 'Comprobantes' },
  { value: 'inventory', label: 'Inventarios' },
];

export default function DocumentosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const filteredDocuments = mockDocuments.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || doc.type === selectedType;
    return matchesSearch && matchesType;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredDocuments.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedDocuments = filteredDocuments.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  const handleFilterChange = (type: string) => {
    setSelectedType(type);
    setCurrentPage(1);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'signed':
        return { label: 'Firmado', status: 'completed' as const };
      case 'pending':
        return { label: 'Pendiente', status: 'pending' as const };
      default:
        return { label: 'Disponible', status: 'in_progress' as const };
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-plan-page">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-plan-primary">Mis Documentos</h1>
          <p className="text-plan-secondary mt-1">
            Accede a tus contratos, comprobantes y otros documentos
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white  border border-plan-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-plan-status-blue-bg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-800" />
              </div>
              <div>
                <p className="text-2xl font-bold text-plan-primary">{mockDocuments.length}</p>
                <p className="text-sm text-plan-secondary">Total documentos</p>
              </div>
            </div>
          </div>
          <div className="bg-white  border border-plan-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-plan-status-green-bg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-800" />
              </div>
              <div>
                <p className="text-2xl font-bold text-plan-primary">
                  {mockDocuments.filter(d => d.status === 'signed').length}
                </p>
                <p className="text-sm text-plan-secondary">Firmados</p>
              </div>
            </div>
          </div>
          <div className="bg-white  border border-plan-border p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-sm bg-yellow-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-800" />
              </div>
              <div>
                <p className="text-2xl font-bold text-plan-primary">
                  {mockDocuments.filter(d => d.status === 'pending').length}
                </p>
                <p className="text-sm text-plan-secondary">Pendientes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white  border border-plan-border p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-plan-muted" />
              <input
                type="text"
                placeholder="Buscar documento..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-sm border border-plan-border text-sm focus:outline-none focus:ring-2 focus:ring-plan-accent/50 focus:border-plan-accent"
              />
            </div>
            <div className="flex gap-2">
              {documentTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleFilterChange(type.value)}
                  className={cn(
                    'px-4 py-2 rounded-sm text-sm font-medium transition-colors',
                    selectedType === type.value
                      ? 'bg-plan-primary text-white'
                      : 'bg-gray-100 text-plan-secondary hover:bg-gray-200'
                  )}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Documents List */}
        <div className="bg-white  border border-plan-border overflow-hidden">
          {filteredDocuments.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {paginatedDocuments.map((doc) => {
                const Icon = doc.icon;
                const statusConfig = getStatusConfig(doc.status);

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-sm bg-gray-100 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-plan-secondary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-plan-primary">{doc.name}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-plan-secondary flex items-center gap-1">
                            <Home className="w-3 h-3" />
                            {doc.property}
                          </span>
                          <span className="text-xs text-plan-muted">•</span>
                          <span className="text-xs text-plan-secondary flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(doc.date)}
                          </span>
                          <span className="text-xs text-plan-muted">•</span>
                          <span className="text-xs text-plan-muted">{doc.size}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <PlanStatusBadge
                        status={statusConfig.status}
                        label={statusConfig.label}
                        size="sm"
                      />
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingDocument(doc)}
                          className="p-2 rounded-sm hover:bg-gray-100 text-plan-secondary hover:text-plan-primary transition-colors"
                          title="Ver documento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-2 rounded-sm hover:bg-gray-100 text-plan-secondary hover:text-plan-primary transition-colors">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-plan-secondary">No se encontraron documentos</p>
            </div>
          )}

          {/* Pagination */}
          {filteredDocuments.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between px-5 py-4 border-t border-plan-border">
              <p className="text-sm text-plan-secondary">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredDocuments.length)} de {filteredDocuments.length} documentos
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors',
                    currentPage === 1
                      ? 'bg-gray-100 text-plan-muted cursor-not-allowed'
                      : 'bg-gray-100 text-plan-secondary hover:bg-gray-200 hover:text-plan-primary'
                  )}
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={cn(
                        'w-8 h-8 text-sm font-medium rounded-sm transition-colors',
                        currentPage === page
                          ? 'bg-plan-primary text-white'
                          : 'bg-gray-100 text-plan-secondary hover:bg-gray-200 hover:text-plan-primary'
                      )}
                    >
                      {page}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className={cn(
                    'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-sm transition-colors',
                    currentPage === totalPages
                      ? 'bg-gray-100 text-plan-muted cursor-not-allowed'
                      : 'bg-gray-100 text-plan-secondary hover:bg-gray-200 hover:text-plan-primary'
                  )}
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setViewingDocument(null)}
          />

          {/* Modal */}
          <div className="relative bg-white w-full max-w-4xl h-[90vh] mx-4 rounded-sm shadow-xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-plan-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-sm bg-gray-100 flex items-center justify-center">
                  <viewingDocument.icon className="w-5 h-5 text-plan-secondary" />
                </div>
                <div>
                  <h3 className="font-semibold text-plan-primary">{viewingDocument.name}</h3>
                  <p className="text-xs text-plan-secondary">
                    {viewingDocument.property} • {formatDate(viewingDocument.date)} • {viewingDocument.size}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    // In a real app, this would trigger file download
                    alert('Descarga iniciada: ' + viewingDocument.name);
                  }}
                >
                  <Download className="w-4 h-4" />
                  Descargar
                </Button>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 rounded-sm hover:bg-gray-100 text-plan-secondary hover:text-plan-primary transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Preview Area */}
            <div className="flex-1 bg-gray-100 p-6 overflow-auto">
              <div className="bg-white h-full rounded-sm shadow-sm flex flex-col items-center justify-center p-8">
                {/* Mock document preview - in production, use a PDF viewer like react-pdf */}
                <div className="w-full max-w-2xl mx-auto">
                  {/* Document Header */}
                  <div className="text-center mb-8 pb-6 border-b border-plan-border">
                    <h2 className="text-xl font-bold text-plan-primary mb-2">
                      {viewingDocument.name}
                    </h2>
                    <p className="text-sm text-plan-secondary">
                      Propiedad: {viewingDocument.property}
                    </p>
                  </div>

                  {/* Mock Document Content */}
                  {viewingDocument.type === 'contract' && (
                    <div className="space-y-4 text-sm text-gray-700">
                      <p className="font-semibold text-center mb-6">CONTRATO DE ARRENDAMIENTO</p>
                      <p>
                        En Santiago de Chile, a {formatDate(viewingDocument.date)}, entre el ARRENDADOR
                        y el ARRENDATARIO, se ha convenido el siguiente contrato de arrendamiento:
                      </p>
                      <p>
                        <strong>PRIMERO:</strong> El arrendador entrega en arrendamiento al arrendatario
                        la propiedad ubicada en {viewingDocument.property}.
                      </p>
                      <p>
                        <strong>SEGUNDO:</strong> El precio del arrendamiento será pagado mensualmente
                        dentro de los primeros 5 días de cada mes.
                      </p>
                      <p>
                        <strong>TERCERO:</strong> El presente contrato tendrá una duración de 12 meses,
                        renovable de forma automática por períodos iguales.
                      </p>
                      <div className="pt-8 mt-8 border-t border-plan-border">
                        <div className="grid grid-cols-2 gap-8 text-center">
                          <div>
                            <div className="border-t border-plan-primary pt-2 mx-8">
                              <p className="font-medium">Arrendador</p>
                            </div>
                          </div>
                          <div>
                            <div className="border-t border-plan-primary pt-2 mx-8">
                              <p className="font-medium">Arrendatario</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {viewingDocument.type === 'receipt' && (
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="font-semibold text-lg mb-1">COMPROBANTE DE PAGO</p>
                        <p className="text-xs text-plan-secondary">N° {viewingDocument.id.padStart(6, '0')}</p>
                      </div>
                      <div className="bg-gray-50 rounded-sm p-4 space-y-3">
                        <div className="flex justify-between">
                          <span className="text-plan-secondary">Propiedad:</span>
                          <span className="font-medium">{viewingDocument.property}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-plan-secondary">Fecha de pago:</span>
                          <span className="font-medium">{formatDate(viewingDocument.date)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-plan-secondary">Concepto:</span>
                          <span className="font-medium">Arriendo mensual</span>
                        </div>
                        <div className="flex justify-between pt-3 border-t border-plan-border">
                          <span className="font-semibold">Total pagado:</span>
                          <span className="font-bold text-lg">$850.000</span>
                        </div>
                      </div>
                      <div className="text-center pt-4">
                        <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
                        <p className="text-sm text-emerald-600 font-medium">Pago confirmado</p>
                      </div>
                    </div>
                  )}

                  {viewingDocument.type === 'inventory' && (
                    <div className="space-y-4 text-sm">
                      <p className="font-semibold text-center mb-6">INVENTARIO DE ENTREGA</p>
                      <p className="text-plan-secondary text-center mb-4">
                        Fecha: {formatDate(viewingDocument.date)}
                      </p>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-plan-border px-3 py-2 text-left">Item</th>
                            <th className="border border-plan-border px-3 py-2 text-center">Cantidad</th>
                            <th className="border border-plan-border px-3 py-2 text-left">Estado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="border border-plan-border px-3 py-2">Llaves</td>
                            <td className="border border-plan-border px-3 py-2 text-center">3</td>
                            <td className="border border-plan-border px-3 py-2">Buen estado</td>
                          </tr>
                          <tr>
                            <td className="border border-plan-border px-3 py-2">Control remoto portón</td>
                            <td className="border border-plan-border px-3 py-2 text-center">1</td>
                            <td className="border border-plan-border px-3 py-2">Buen estado</td>
                          </tr>
                          <tr>
                            <td className="border border-plan-border px-3 py-2">Refrigerador</td>
                            <td className="border border-plan-border px-3 py-2 text-center">1</td>
                            <td className="border border-plan-border px-3 py-2">Funcionando</td>
                          </tr>
                          <tr>
                            <td className="border border-plan-border px-3 py-2">Cocina</td>
                            <td className="border border-plan-border px-3 py-2 text-center">1</td>
                            <td className="border border-plan-border px-3 py-2">Funcionando</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
