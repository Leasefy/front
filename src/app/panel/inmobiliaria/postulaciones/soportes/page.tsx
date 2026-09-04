import { PageGuard } from '@/components/auth/PageGuard';
import { DocumentReviewQueueClient } from './DocumentReviewQueueClient';

/**
 * /panel/inmobiliaria/postulaciones/soportes — tenant-document review queue.
 *
 * A dedicated route under the `documentos` module (kept separate from the
 * agency property-docs/actas/templates page at /documentos, which is a
 * different data domain). Page-level access = documentos:view; the write
 * actions are additionally gated by manager role inside the client.
 */
export default function DocumentReviewQueuePage() {
  return (
    <PageGuard module="documentos">
      <DocumentReviewQueueClient />
    </PageGuard>
  );
}
