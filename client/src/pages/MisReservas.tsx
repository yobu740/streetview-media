import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { Calendar, Clock, FileDown, MapPin, Printer, User } from "lucide-react";
import { Link } from "wouter";

export default function MisReservas() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();

  const { data: reservations, isLoading } = trpc.anuncios.myReservations.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (authLoading) return null;

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  const exportToExcel = () => {
    if (!reservations || reservations.length === 0) return;
    const headers = ["Cliente", "Parada", "Ruta", "Tipo", "Fecha Inicio", "Fecha Fin", "Estado", "Aprobación", "Creada"];
    const rows = reservations.map((r: any) => [
      r.cliente,
      `#${r.paradaId}`,
      r.parada?.ruta || "—",
      r.tipo,
      new Date(r.fechaInicio).toLocaleDateString(),
      new Date(r.fechaFin).toLocaleDateString(),
      r.estado,
      r.approvalStatus === "approved" ? "Aprobada" : r.approvalStatus === "rejected" ? "Rechazada" : "Pendiente",
      new Date(r.createdAt).toLocaleDateString(),
    ]);
    const csvContent = [headers.join(","), ...rows.map((row: any[]) => row.map((cell: any) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `mis-reservas-${new Date().toISOString().split("T")[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":   return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">Pendiente</Badge>;
      case "approved":  return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">Aprobada</Badge>;
      case "rejected":  return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">Rechazada</Badge>;
      default:          return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />

      <main className="flex-1 overflow-y-auto bg-slate-50">
        {/* Page header */}
        <div className="bg-white border-b border-slate-200 px-7 py-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mis Reservas</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Aquí puedes ver todas tus reservas y su estado de aprobación
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                className="bg-[#ff6b35] hover:bg-[#e65a25] text-white text-sm"
                asChild
              >
                <Link href="/calendar">Nueva Reserva</Link>
              </Button>
              {reservations && reservations.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={exportToExcel} className="flex items-center gap-1.5">
                    <FileDown className="w-4 h-4" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => window.print()} className="flex items-center gap-1.5">
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3c] mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Cargando reservas...</p>
              </div>
            </div>
          ) : !reservations || reservations.length === 0 ? (
            <Card className="p-12 text-center bg-white">
              <Calendar className="w-14 h-14 mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-2">No tienes reservas</h3>
              <p className="text-slate-500 text-sm mb-6">Crea tu primera reserva desde el calendario</p>
              <Button asChild className="bg-[#1a4d3c] hover:bg-[#0f3a2a]">
                <Link href="/calendar">Ir al Calendario</Link>
              </Button>
            </Card>
          ) : (
            <div className="grid gap-4">
              {reservations.map((reservation: any) => (
                <Card key={reservation.id} className="p-5 bg-white hover:shadow-md transition-shadow print:break-inside-avoid">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <h3 className="text-base font-semibold text-[#1a4d3c] truncate">
                          {reservation.cliente}
                        </h3>
                        {getStatusBadge(reservation.approvalStatus)}
                      </div>

                      <div className="grid sm:grid-cols-2 gap-2 text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">
                            Parada #{reservation.paradaId}
                            {reservation.parada && ` — ${reservation.parada.ruta}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 flex-shrink-0" />
                          <span>
                            {new Date(reservation.fechaInicio).toLocaleDateString()} — {new Date(reservation.fechaFin).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 flex-shrink-0" />
                          <span>Tipo: {reservation.tipo}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 flex-shrink-0" />
                          <span>Creada: {new Date(reservation.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {reservation.approvedAt && (
                        <p className="mt-2 text-xs text-slate-400">
                          {reservation.approvalStatus === "approved" ? "Aprobada" : "Rechazada"} el{" "}
                          {new Date(reservation.approvedAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    <Badge
                      variant="outline"
                      className={
                        reservation.estado === "Programado"
                          ? "bg-blue-50 text-blue-700 border-blue-300 self-start"
                          : "bg-slate-50 text-slate-600 border-slate-200 self-start"
                      }
                    >
                      {reservation.estado}
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
