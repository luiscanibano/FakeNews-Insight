import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useAuthStore } from "../store/authStore";
import {
  canUseFeature,
  getMonthlyAnalysisLimit,
  USER_PLAN,
  USER_ROLE,
} from "../lib/accessControl";

// Vista principal tras iniciar sesion. Muestra un layout base y metricas de ejemplo.
function Dashboard() {
  // Datos y acciones que vienen del store global de autenticacion.
  const user = useAuthStore((state) => state.user);
  const profile = useAuthStore((state) => state.profile);
  const role = useAuthStore((state) => state.role);
  const plan = useAuthStore((state) => state.plan);
  const logout = useAuthStore((state) => state.logout);

  const access = { role, plan };
  const planLabel = plan === USER_PLAN.ULTRA ? "Ultra" : plan === USER_PLAN.PRO ? "Pro" : "Free";
  const roleLabel = role === USER_ROLE.ADMIN ? "Admin" : "Usuario";
  const monthlyLimit = getMonthlyAnalysisLimit(access);
  const canBulkAnalyse = canUseFeature(access, "analysis.bulk");
  const canUseApi = canUseFeature(access, "analysis.api");

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Error is already handled in the store state.
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      <aside className="hidden md:flex md:w-64 md:flex-col md:border-r md:bg-slate-900 md:text-slate-100">
        <div className="border-b border-slate-700 px-6 py-5">
          <h1 className="text-lg font-semibold">FakeNews Insight</h1>
        </div>

        <nav className="flex flex-1 flex-col gap-2 px-4 py-6 text-sm">
          <a href="#" className="rounded-md px-3 py-2 hover:bg-slate-800">
            Inicio
          </a>
          <a href="#" className="rounded-md px-3 py-2 hover:bg-slate-800">
            Historial
          </a>
          <a href="#" className="rounded-md px-3 py-2 hover:bg-slate-800">
            API
          </a>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-background px-4 py-3 md:px-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{roleLabel}</span>
            <span className="rounded-full border px-2 py-0.5 text-xs">Plan {planLabel}</span>
          </div>
          <Button type="button" variant="outline" onClick={handleLogout}>
            Cerrar sesion
          </Button>
        </header>

        <main className="flex-1 p-4 md:p-6">
          <div className="mb-6">
            <h3 className="text-2xl font-semibold">
              Hola, {profile?.display_name || user?.email}
            </h3>
            <p className="text-sm text-muted-foreground">
              Aqui tienes un resumen rapido de la actividad.
            </p>
          </div>

          {/* Tarjetas de resumen (actualmente con datos estaticos). */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Limite mensual</CardTitle>
                <CardDescription>Analisis incluidos en tu plan</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold">
                  {Number.isFinite(monthlyLimit) ? monthlyLimit : "Ilimitado"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Analisis por lotes</CardTitle>
                <CardDescription>Procesa varios textos en paralelo</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{canBulkAnalyse ? "Disponible" : "Solo Pro/Ultra"}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Acceso API</CardTitle>
                <CardDescription>Integracion desde backend propio</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{canUseApi ? "Disponible" : "Solo Ultra"}</p>
              </CardContent>
            </Card>

            {role === USER_ROLE.ADMIN ? (
              <Card className="sm:col-span-2 lg:col-span-3">
                <CardHeader>
                  <CardTitle>Panel administrativo</CardTitle>
                  <CardDescription>
                    Como admin puedes gestionar usuarios, upgrades y auditorias.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Proximo paso: crear una vista para cambiar roles/planes y consultar metricas globales.
                  </p>
                </CardContent>
              </Card>
            ) : null}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
