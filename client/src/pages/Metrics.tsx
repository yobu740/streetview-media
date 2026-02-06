import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Users, DollarSign, MapPin, Menu, FileDown, Printer, Calendar as CalendarIcon } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function Metrics() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Add print styles
  const printStyles = `
    @media print {
      nav, button.print\\:hidden, .print\\:hidden { display: none !important; }
      body { background: white !important; }
      .container { max-width: 100% !important; padding: 20px !important; }
      h1 { font-size: 24px !important; margin-bottom: 10px !important; }
      .bg-gray-50 { background: white !important; }
      table { page-break-inside: auto; }
      tr { page-break-inside: avoid; page-break-after: auto; }
    }
  `;
  
  // Inject print styles
  if (typeof document !== 'undefined') {
    const styleElement = document.getElementById('metrics-print-styles');
    if (!styleElement) {
      const style = document.createElement('style');
      style.id = 'metrics-print-styles';
      style.textContent = printStyles;
      document.head.appendChild(style);
    }
  }
  
  const { data: paradas } = trpc.paradas.list.useQuery();
  const { data: anuncios } = trpc.anuncios.list.useQuery();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1a4d3c]" />
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = getLoginUrl();
    return null;
  }

  // Calculate metrics
  const totalParadas = paradas?.length || 0;
  const paradasFijas = paradas?.filter(p => p.tipoFormato === "Fija").length || 0;
  const paradasDigitales = paradas?.filter(p => p.tipoFormato === "Digital").length || 0;
  
  const now = new Date();
  const activeAnuncios = anuncios?.filter(a => {
    const inicio = new Date(a.fechaInicio);
    const fin = new Date(a.fechaFin);
    return now >= inicio && now <= fin && a.estado === "Activo";
  }) || [];
  
  const occupiedParadaIds = new Set(activeAnuncios.map(a => a.paradaId));
  const occupiedCount = occupiedParadaIds.size;
  const availableCount = totalParadas - occupiedCount;
  const occupancyRate = totalParadas > 0 ? Math.round((occupiedCount / totalParadas) * 100) : 0;
  
  // Client frequency
  const clientFrequency = anuncios?.reduce((acc, anuncio) => {
    acc[anuncio.cliente] = (acc[anuncio.cliente] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};
  
  const topClients = Object.entries(clientFrequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);
  
  // Occupation by zone (using ruta as proxy for zone)
  const occupationByRuta = paradas?.reduce((acc, parada) => {
    const ruta = parada.ruta || "Sin Ruta";
    const isOccupied = occupiedParadaIds.has(parada.id);
    
    if (!acc[ruta]) {
      acc[ruta] = { total: 0, occupied: 0 };
    }
    acc[ruta].total++;
    if (isOccupied) acc[ruta].occupied++;
    
    return acc;
  }, {} as Record<string, { total: number; occupied: number }>) || {};
  
  const rutasWithOccupancy = Object.entries(occupationByRuta)
    .map(([ruta, data]) => ({
      ruta,
      ...data,
      rate: Math.round((data.occupied / data.total) * 100)
    }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
  
  // Revenue projection (assuming $500/month per parada)
  const pricePerMonth = 500;
  const currentRevenue = occupiedCount * pricePerMonth;
  const potentialRevenue = totalParadas * pricePerMonth;
  const revenueGap = potentialRevenue - currentRevenue;

  // Filter reservations by date range
  const filteredReservations = anuncios?.filter(a => {
    if (!dateFrom && !dateTo) return true;
    
    const inicio = new Date(a.fechaInicio);
    const fin = new Date(a.fechaFin);
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    
    if (from && to) {
      return (inicio >= from && inicio <= to) || (fin >= from && fin <= to) || (inicio <= from && fin >= to);
    } else if (from) {
      return fin >= from;
    } else if (to) {
      return inicio <= to;
    }
    return true;
  }) || [];

  // Export reservations to Excel
  const exportReservationsToExcel = () => {
    if (filteredReservations.length === 0) return;

    const headers = ["ID Parada", "Cliente", "Tipo", "Fecha Inicio", "Fecha Fin", "Estado", "Aprobación"];
    const rows = filteredReservations.map((r: any) => [
      `#${r.paradaId}`,
      r.cliente,
      r.tipo,
      new Date(r.fechaInicio).toLocaleDateString(),
      new Date(r.fechaFin).toLocaleDateString(),
      r.estado,
      r.approvalStatus === "approved" ? "Aprobada" : r.approvalStatus === "rejected" ? "Rechazada" : "Pendiente"
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const filename = `reporte-reservas${dateFrom ? `-desde-${dateFrom}` : ""}${dateTo ? `-hasta-${dateTo}` : ""}-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b-4 border-[#1a4d3c]">
        <div className="container flex items-center justify-between h-20">
          <Link href="/admin">
            <img 
              src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
              alt="Streetview Media" 
              className="h-12 cursor-pointer"
            />
          </Link>
          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm text-gray-600">Hola, {user?.name || user?.email}</span>
            <Button variant="outline" asChild>
              <Link href="/admin">Volver al Panel</Link>
            </Button>
          </div>
          
          {/* Mobile Menu Button */}
          <Button 
            variant="outline" 
            size="icon"
            className="md:hidden"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </nav>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-white border-b-2 border-[#1a4d3c] shadow-lg">
          <div className="container py-4 space-y-2">
            <div className="text-sm text-gray-600 mb-4">Hola, {user?.name || user?.email}</div>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>Volver al Panel</Link>
            </Button>
          </div>
        </div>
      )}

      <div className="container py-12">
        <div className="mb-8">
          <h1 className="text-display text-4xl text-[#1a4d3c] mb-2">Dashboard de Métricas</h1>
          <p className="text-body text-lg text-gray-600">Análisis y estadísticas del inventario</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paradas</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalParadas}</div>
              <p className="text-xs text-muted-foreground">
                {paradasFijas} Fijas, {paradasDigitales} Digitales
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasa de Ocupación</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-[#ff6b35]">{occupancyRate}%</div>
              <p className="text-xs text-muted-foreground">
                {occupiedCount} ocupadas, {availableCount} disponibles
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{new Set(activeAnuncios.map(a => a.cliente)).size}</div>
              <p className="text-xs text-muted-foreground">
                {activeAnuncios.length} anuncios activos
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Actual</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${currentRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Potencial: ${potentialRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clientes</CardTitle>
              <CardDescription>Clientes con más anuncios históricos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {topClients.map(([cliente, count], index) => {
                  const maxCount = topClients[0][1];
                  const percentage = (count / maxCount) * 100;
                  
                  return (
                    <div key={cliente}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{index + 1}. {cliente}</span>
                        <span className="text-sm text-gray-600">{count} anuncios</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#1a4d3c] h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Occupation by Route */}
          <Card>
            <CardHeader>
              <CardTitle>Ocupación por Ruta</CardTitle>
              <CardDescription>Top 10 rutas con mayor ocupación</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rutasWithOccupancy.map((ruta, index) => (
                  <div key={ruta.ruta}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{index + 1}. {ruta.ruta}</span>
                      <span className="text-sm text-gray-600">
                        {ruta.occupied}/{ruta.total} ({ruta.rate}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-[#ff6b35] h-2 rounded-full"
                        style={{ width: `${ruta.rate}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Projection */}
        <Card>
          <CardHeader>
            <CardTitle>Proyección de Revenue</CardTitle>
            <CardDescription>Basado en $500/mes por parada</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Revenue Actual (Mensual)</div>
                <div className="text-3xl font-bold text-green-600">
                  ${currentRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {occupiedCount} paradas ocupadas
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Revenue Potencial (100%)</div>
                <div className="text-3xl font-bold text-[#1a4d3c]">
                  ${potentialRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {totalParadas} paradas totales
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Oportunidad de Crecimiento</div>
                <div className="text-3xl font-bold text-[#ff6b35]">
                  ${revenueGap.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {availableCount} paradas disponibles
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progreso hacia 100%</span>
                <span className="text-sm text-gray-600">{occupancyRate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="bg-gradient-to-r from-[#1a4d3c] to-[#ff6b35] h-4 rounded-full transition-all"
                  style={{ width: `${occupancyRate}%` }}
                ></div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reservations Report */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle>Reporte de Reservas</CardTitle>
                <CardDescription>Filtrar reservas por rango de fechas</CardDescription>
              </div>
              {filteredReservations.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={exportReservationsToExcel}
                    className="flex items-center gap-2"
                  >
                    <FileDown className="w-4 h-4" />
                    Exportar Excel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.print()}
                    className="flex items-center gap-2 print:hidden"
                  >
                    <Printer className="w-4 h-4" />
                    Imprimir
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <Label htmlFor="dateFrom">Fecha Desde</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="dateTo">Fecha Hasta</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            {filteredReservations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>No hay reservas en el rango de fechas seleccionado</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID Parada</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Fecha Inicio</TableHead>
                      <TableHead>Fecha Fin</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Aprobación</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReservations.map((reserva: any) => (
                      <TableRow key={reserva.id}>
                        <TableCell>#{reserva.paradaId}</TableCell>
                        <TableCell className="font-medium">{reserva.cliente}</TableCell>
                        <TableCell>{reserva.tipo}</TableCell>
                        <TableCell>{new Date(reserva.fechaInicio).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(reserva.fechaFin).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{reserva.estado}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              reserva.approvalStatus === "approved"
                                ? "bg-green-50 text-green-700 border-green-300"
                                : reserva.approvalStatus === "rejected"
                                ? "bg-red-50 text-red-700 border-red-300"
                                : "bg-yellow-50 text-yellow-700 border-yellow-300"
                            }
                          >
                            {reserva.approvalStatus === "approved" ? "Aprobada" : reserva.approvalStatus === "rejected" ? "Rechazada" : "Pendiente"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 text-sm text-gray-600">
                  Mostrando {filteredReservations.length} reserva(s)
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
