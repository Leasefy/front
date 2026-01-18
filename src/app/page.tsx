import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  return (
    <main className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-4xl space-y-12">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Arriendo Facil
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Marketplace de Arriendos con Scoring de Riesgo AI
          </p>
        </div>

        {/* Risk Level Badges Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Niveles de Riesgo</h2>
          <p className="text-sm text-muted-foreground">
            Sistema de scoring A/B/C/D para evaluacion de inquilinos
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="risk-a">Nivel A</Badge>
              <span className="text-sm text-muted-foreground">
                Excelente - Bajo riesgo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="risk-b">Nivel B</Badge>
              <span className="text-sm text-muted-foreground">
                Bueno - Riesgo moderado
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="risk-c">Nivel C</Badge>
              <span className="text-sm text-muted-foreground">
                Regular - Riesgo medio
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="risk-d">Nivel D</Badge>
              <span className="text-sm text-muted-foreground">
                Alto riesgo - Requiere garantias
              </span>
            </div>
          </div>
        </section>

        {/* Property Card Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Tarjeta de Propiedad</h2>
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Apartamento en Chapinero</CardTitle>
                <Badge>Disponible</Badge>
              </div>
              <CardDescription>
                Bogota, Colombia - 85m2 - 2 habitaciones
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-2xl font-bold">$2.500.000 COP</p>
                <p className="text-sm text-muted-foreground">
                  Incluye administracion. Parqueadero disponible.
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline">Ver detalles</Button>
              <Button>Postularme</Button>
            </CardFooter>
          </Card>
        </section>

        {/* Candidate Score Card Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Evaluacion de Candidato</h2>
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Maria Garcia</CardTitle>
                <Badge variant="risk-a">Score: 87</Badge>
              </div>
              <CardDescription>
                Empleada - Ingresos verificados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Ingresos estables</Badge>
                  <Badge variant="secondary">Sin deudas</Badge>
                  <Badge variant="secondary">Referencias OK</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Capacidad de pago: 3x el canon mensual
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="destructive" size="sm">
                Rechazar
              </Button>
              <Button size="sm">Aprobar</Button>
            </CardFooter>
          </Card>
        </section>

        {/* Button Variants Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Botones</h2>
          <div className="flex flex-wrap gap-4">
            <Button>Principal</Button>
            <Button variant="secondary">Secundario</Button>
            <Button variant="outline">Contorno</Button>
            <Button variant="ghost">Fantasma</Button>
            <Button variant="link">Enlace</Button>
            <Button variant="destructive">Destructivo</Button>
          </div>
        </section>

        {/* Form Elements Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Formulario</h2>
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Buscar propiedades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ciudad">Ciudad</Label>
                <Input id="ciudad" placeholder="Ej: Bogota, Medellin..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="presupuesto">Presupuesto maximo (COP)</Label>
                <Input
                  id="presupuesto"
                  type="number"
                  placeholder="2500000"
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Buscar</Button>
            </CardFooter>
          </Card>
        </section>

        {/* Skeleton Demo */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Estados de Carga</h2>
          <Card className="max-w-md">
            <CardHeader>
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="mt-2 h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-9 w-24" />
              <Skeleton className="h-9 w-24" />
            </CardFooter>
          </Card>
        </section>

        {/* Footer */}
        <footer className="border-t pt-8 text-center text-sm text-muted-foreground">
          <p>
            Arriendo Facil - Propietarios toman decisiones informadas sobre
            inquilinos en minutos
          </p>
        </footer>
      </div>
    </main>
  );
}
