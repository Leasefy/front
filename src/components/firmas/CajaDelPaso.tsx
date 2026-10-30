/** La caja del paso de la foto en el enlace de firma: ilustración (o ícono) a la izquierda en pantallas medianas. */
export function CajaDelPaso({
  children,
  testId,
  etiqueta = 'Tu foto',
}: {
  children: React.ReactNode;
  testId: string;
  etiqueta?: string;
}) {
  return (
    <section
      className="flex flex-col gap-4 rounded-md border border-border bg-surface px-4 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-5"
      data-testid={testId}
      aria-label={etiqueta}
    >
      {children}
    </section>
  );
}
