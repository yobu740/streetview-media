import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Loader2, TrendingUp, Users, DollarSign, MapPin, Menu, FileDown, Printer, Calendar as CalendarIcon, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { getLoginUrl } from "@/const";
import { Link } from "wouter";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { SV_LOGO_BASE64 } from "@/lib/svLogo";

export default function Metrics() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedClient, setSelectedClient] = useState<string>("all");

  // Monthly Sales Report state
  const now2 = new Date();
  const [reportYear, setReportYear] = useState<number>(now2.getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(now2.getMonth() + 1);
  const [reportEnabled, setReportEnabled] = useState(false);
  const [generatedReports, setGeneratedReports] = useState<Array<{
    year: number; month: number; label: string;
    rows: Array<{ producto: string; cliente: string; paradasActivas: number; totalFacturado: number; pagoParadas: number; anuncioCount: number }>;
    generatedAt: string;
  }>>([]);
  const [expandedReports, setExpandedReports] = useState<Set<string>>(new Set());

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
  const { data: topClientsData } = trpc.anuncios.topClients.useQuery();

  // Monthly sales report query (only fires when reportEnabled is true)
  const { data: salesReportData, isFetching: salesReportLoading, refetch: refetchSalesReport } =
    trpc.anuncios.monthlySalesReport.useQuery(
      { year: reportYear, month: reportMonth },
      { enabled: false }
    );

  const MONTH_NAMES = [
    'Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
  ];

  const handleGenerateReport = async () => {
    const result = await refetchSalesReport();
    if (result.data) {
      const label = `${MONTH_NAMES[reportMonth - 1]} ${reportYear}`;
      const key = `${reportYear}-${reportMonth}`;
      setGeneratedReports(prev => {
        // Replace if same month/year already exists, otherwise prepend
        const filtered = prev.filter(r => !(r.year === reportYear && r.month === reportMonth));
        return [{ year: reportYear, month: reportMonth, label, rows: result.data!, generatedAt: new Date().toLocaleTimeString('es-PR') }, ...filtered];
      });
      setExpandedReports(prev => new Set([...prev, key]));
    }
  };

  const exportSalesReportToCSV = (report: typeof generatedReports[0]) => {
    const headers = ['Producto', 'Paradas Activas', 'Total Facturado', 'Pago Paradas'];
    const rows = report.rows.map(r => [
      r.producto,
      r.paradasActivas,
      r.totalFacturado.toFixed(2),
      r.pagoParadas.toFixed(2),
    ]);
    // Totals row
    const totals = report.rows.reduce((acc, r) => ({
      paradasActivas: acc.paradasActivas + r.paradasActivas,
      totalFacturado: acc.totalFacturado + r.totalFacturado,
      pagoParadas: acc.pagoParadas + r.pagoParadas,
    }), { paradasActivas: 0, totalFacturado: 0, pagoParadas: 0 });
    rows.push(['TOTAL', totals.paradasActivas, totals.totalFacturado.toFixed(2), totals.pagoParadas.toFixed(2)]);
    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte-ventas-${report.label.replace(' ', '-')}.csv`;
    link.click();
  };

  const exportSalesReportToPDF = (report: typeof generatedReports[0]) => {
    const totals = report.rows.reduce(
      (acc, r) => ({
        paradasActivas: acc.paradasActivas + r.paradasActivas,
        totalFacturado: acc.totalFacturado + r.totalFacturado,
        pagoParadas: acc.pagoParadas + r.pagoParadas,
      }),
      { paradasActivas: 0, totalFacturado: 0, pagoParadas: 0 }
    );

    const buildPDF = () => {
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pageW = doc.internal.pageSize.getWidth();
      const margin = 15;

      // ── Header bar ──────────────────────────────────────────────────────────
      doc.setFillColor(26, 77, 60); // #1a4d3c
      doc.rect(0, 0, pageW, 28, 'F');

      // Logo image — bundled as base64, no CORS issues
      doc.addImage(SV_LOGO_BASE64, 'PNG', margin, 3, 45, 22);

      // Report title
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(200, 230, 210);
      doc.text('Reporte de Ventas por Mes', margin, 26);

      // Month label (right-aligned)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text(report.label.toUpperCase(), pageW - margin, 16, { align: 'right' });

      // ── Meta line ───────────────────────────────────────────────────────────
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generado: ${new Date().toLocaleString('es-PR')}`, margin, 34);
      doc.text(`Total de productos: ${report.rows.length}`, pageW - margin, 34, { align: 'right' });

      // ── Summary chips ───────────────────────────────────────────────────────
      const chipY = 40;
      const chipData = [
        { label: 'Paradas Activas', value: String(totals.paradasActivas), color: [26, 77, 60] as [number,number,number] },
        { label: 'Total Facturado', value: `$${totals.totalFacturado.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`, color: [22, 101, 52] as [number,number,number] },
        { label: 'Pago Paradas', value: `$${totals.pagoParadas.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`, color: [194, 65, 12] as [number,number,number] },
      ];
      const chipW = (pageW - margin * 2 - 8) / 3;
      chipData.forEach((chip, i) => {
        const x = margin + i * (chipW + 4);
        doc.setFillColor(...chip.color);
        doc.roundedRect(x, chipY, chipW, 14, 2, 2, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(chip.value, x + chipW / 2, chipY + 6, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(chip.label, x + chipW / 2, chipY + 11, { align: 'center' });
      });

      // ── Table ───────────────────────────────────────────────────────────────
      const tableRows = report.rows.map((r, idx) => [
        idx + 1,
        r.producto,
        r.paradasActivas,
        `$${r.totalFacturado.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`,
        `$${r.pagoParadas.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`,
      ]);

      autoTable(doc, {
        startY: chipY + 20,
        margin: { left: margin, right: margin },
        head: [['#', 'Producto', 'Paradas', 'Total Facturado', 'Pago Paradas']],
        body: tableRows,
        foot: [['', 'TOTAL', totals.paradasActivas,
          `$${totals.totalFacturado.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`,
          `$${totals.pagoParadas.toLocaleString('es-PR', { minimumFractionDigits: 2 })}`,
        ]],
        showFoot: 'lastPage',
        headStyles: { fillColor: [26, 77, 60], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        footStyles: { fillColor: [240, 240, 240], textColor: [26, 77, 60], fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [40, 40, 40] },
        alternateRowStyles: { fillColor: [248, 250, 248] },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 22, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' },
        },
        didDrawPage: () => {
          // Footer on every page
          const pageH = doc.internal.pageSize.getHeight();
          doc.setFontSize(7);
          doc.setTextColor(150, 150, 150);
          doc.text('Streetview Media • streetviewmediapr.com', margin, pageH - 8);
          doc.text(
            `Página ${(doc.internal as any).getCurrentPageInfo().pageNumber}`,
            pageW - margin, pageH - 8, { align: 'right' }
          );
        },
      });

      doc.save(`reporte-ventas-${report.label.replace(/\s+/g, '-').toLowerCase()}.pdf`);
    }; // end buildPDF

    // Logo is bundled as base64 in svLogo.ts — no CORS issues
    buildPDF();
  };

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
  
  // Top clients from server (filtered to Feb 2026 onwards)
  const topClients: [string, number][] = (topClientsData || []).map(({ cliente, count }) => [cliente, count]);
  
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
  
  // Revenue calculation based on actual costoPorUnidad
  const currentRevenue = activeAnuncios.reduce((sum, anuncio) => {
    const cost = parseFloat(anuncio.costoPorUnidad?.toString() || "0");
    return sum + cost;
  }, 0);
  
  // Monthly billing calculation
  const getMonthlyRevenue = () => {
    const monthlyData: Record<string, number> = {};
    
    anuncios?.forEach(anuncio => {
      if (anuncio.estado === "Finalizado" || anuncio.estado === "Inactivo") return;
      
      const cost = parseFloat(anuncio.costoPorUnidad?.toString() || "0");
      if (cost === 0) return; // Skip bonificaciones
      
      const inicio = new Date(anuncio.fechaInicio);
      const fin = new Date(anuncio.fechaFin);
      
      // Calculate months covered by this anuncio
      let current = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
      const endMonth = new Date(fin.getFullYear(), fin.getMonth(), 1);
      
      while (current <= endMonth) {
        const monthKey = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + cost;
        current.setMonth(current.getMonth() + 1);
      }
    });
    
    // Sort by month and get last 12 months
    const sortedMonths = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12);
    
    return sortedMonths;
  };
  
  const monthlyRevenue = getMonthlyRevenue();
  const totalAnnualRevenue = monthlyRevenue.reduce((sum, [, revenue]) => sum + revenue, 0);

  // Get unique clients for filter dropdown
  const uniqueClients = Array.from(new Set(anuncios?.map(a => a.cliente) || [])).sort();

  // Filter reservations by date range and client
  const filteredReservations = anuncios?.filter(a => {
    // Client filter
    if (selectedClient !== "all" && a.cliente !== selectedClient) {
      return false;
    }
    
    // Date filter
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
    const clientSuffix = selectedClient !== "all" ? `-cliente-${selectedClient.replace(/\s+/g, '-')}` : "";
    const filename = `reporte-reservas${clientSuffix}${dateFrom ? `-desde-${dateFrom}` : ""}${dateTo ? `-hasta-${dateTo}` : ""}-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <AdminSidebar />
      
      {/* Main Content */}
      <div className="flex-1 min-w-0">

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
                Anual: ${totalAnnualRevenue.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Top Clients */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Clientes</CardTitle>
              <CardDescription>Clientes con más anuncios desde marzo 2026</CardDescription>
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

        {/* Monthly Billing Chart */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Facturación Mensual</CardTitle>
            <CardDescription>Ingresos mensuales basados en anuncios activos</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div>
                <div className="text-sm text-gray-600 mb-2">Revenue Mensual Actual</div>
                <div className="text-3xl font-bold text-green-600">
                  ${currentRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {activeAnuncios.length} anuncios activos
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Total Anual (12 meses)</div>
                <div className="text-3xl font-bold text-[#1a4d3c]">
                  ${totalAnnualRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Últimos 12 meses
                </div>
              </div>
              
              <div>
                <div className="text-sm text-gray-600 mb-2">Promedio Mensual</div>
                <div className="text-3xl font-bold text-[#ff6b35]">
                  ${Math.round(totalAnnualRevenue / 12).toLocaleString()}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Basado en últimos 12 meses
                </div>
              </div>
            </div>
            
            {/* Monthly Bar Chart */}
            <div className="mt-8">
              <div className="text-sm font-medium mb-4">Ingresos por Mes (Últimos 12 meses)</div>
              <div className="space-y-3">
                {monthlyRevenue.map(([month, revenue]) => {
                  const maxRevenue = Math.max(...monthlyRevenue.map(([, r]) => r));
                  const percentage = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                  const monthName = new Date(month + "-01").toLocaleDateString('es-PR', { year: 'numeric', month: 'short' });
                  
                  return (
                    <div key={month}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{monthName}</span>
                        <span className="text-sm text-gray-600">${revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-[#1a4d3c] to-[#ff6b35] h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <Label htmlFor="clientFilter">Filtrar por Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger id="clientFilter">
                    <SelectValue placeholder="Todos los clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos los clientes</SelectItem>
                    {uniqueClients.map(cliente => (
                      <SelectItem key={cliente} value={cliente}>{cliente}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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

        {/* Monthly Sales Report */}
        <Card className="mt-8">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#1a4d3c]" />
                  Reporte de Ventas por Mes
                </CardTitle>
                <CardDescription>
                  Productos activos, paradas físicas únicas (sin Holders), total facturado y pago de paradas ($25 c/u)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Month / Year selector + Generate button */}
            <div className="flex flex-wrap items-end gap-3 mb-6">
              <div>
                <Label htmlFor="reportMonth">Mes</Label>
                <Select
                  value={String(reportMonth)}
                  onValueChange={(v) => setReportMonth(Number(v))}
                >
                  <SelectTrigger id="reportMonth" className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((name, idx) => (
                      <SelectItem key={idx + 1} value={String(idx + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="reportYear">Año</Label>
                <Select
                  value={String(reportYear)}
                  onValueChange={(v) => setReportYear(Number(v))}
                >
                  <SelectTrigger id="reportYear" className="w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026, 2027].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerateReport}
                disabled={salesReportLoading}
                className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white flex items-center gap-2"
              >
                {salesReportLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4" />
                )}
                Generar Reporte
              </Button>
            </div>

            {/* List of generated reports */}
            {generatedReports.length === 0 ? (
              <div className="text-center py-10 text-gray-400 border-2 border-dashed rounded-lg">
                <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="text-sm">Selecciona un mes y haz clic en <strong>Generar Reporte</strong> para ver los datos.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {generatedReports.map((report) => {
                  const key = `${report.year}-${report.month}`;
                  const isExpanded = expandedReports.has(key);
                  const totals = report.rows.reduce(
                    (acc, r) => ({
                      paradasActivas: acc.paradasActivas + r.paradasActivas,
                      totalFacturado: acc.totalFacturado + r.totalFacturado,
                      pagoParadas: acc.pagoParadas + r.pagoParadas,
                    }),
                    { paradasActivas: 0, totalFacturado: 0, pagoParadas: 0 }
                  );

                  return (
                    <div key={key} className="border rounded-lg overflow-hidden">
                      {/* Report header */}
                      <div
                        className="flex items-center justify-between px-4 py-3 bg-[#1a4d3c]/5 cursor-pointer hover:bg-[#1a4d3c]/10 transition-colors"
                        onClick={() => setExpandedReports(prev => {
                          const next = new Set(prev);
                          if (next.has(key)) next.delete(key); else next.add(key);
                          return next;
                        })}
                      >
                        <div className="flex items-center gap-3">
                          <BarChart3 className="w-4 h-4 text-[#1a4d3c]" />
                          <span className="font-semibold text-[#1a4d3c]">{report.label}</span>
                          <span className="text-xs text-gray-500">Generado a las {report.generatedAt}</span>
                          <Badge variant="outline" className="text-xs">{report.rows.length} productos</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          {/* Summary chips */}
                          <span className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-700">
                            <MapPin className="w-3.5 h-3.5" />
                            {totals.paradasActivas} paradas
                          </span>
                          <span className="hidden md:flex items-center gap-1 text-sm font-medium text-green-700">
                            <DollarSign className="w-3.5 h-3.5" />
                            ${totals.totalFacturado.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); exportSalesReportToCSV(report); }}
                            className="flex items-center gap-1 text-xs"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => { e.stopPropagation(); exportSalesReportToPDF(report); }}
                            className="flex items-center gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            PDF
                          </Button>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                        </div>
                      </div>

                      {/* Report table */}
                      {isExpanded && (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow className="bg-gray-50">
                                <TableHead className="font-semibold">Producto</TableHead>
                                <TableHead className="font-semibold text-center">Paradas Activas</TableHead>
                                <TableHead className="font-semibold text-right">Total Facturado</TableHead>
                                <TableHead className="font-semibold text-right">Pago Paradas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {report.rows.map((row, idx) => (
                                <TableRow key={idx} className="hover:bg-gray-50">
                                  <TableCell className="font-medium">{row.producto}</TableCell>
                                  <TableCell className="text-center">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-[#1a4d3c]/10 text-[#1a4d3c] font-bold text-sm">
                                      {row.paradasActivas}
                                    </span>
                                  </TableCell>
                                  <TableCell className="text-right font-mono">
                                    ${row.totalFacturado.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                  <TableCell className="text-right font-mono text-orange-600">
                                    ${row.pagoParadas.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                            {/* Totals footer */}
                            <tfoot>
                              <tr className="border-t-2 border-[#1a4d3c] bg-[#1a4d3c]/5 font-bold">
                                <td className="px-4 py-3 text-[#1a4d3c]">TOTAL</td>
                                <td className="px-4 py-3 text-center text-[#1a4d3c]">{totals.paradasActivas}</td>
                                <td className="px-4 py-3 text-right font-mono text-[#1a4d3c]">
                                  ${totals.totalFacturado.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                                </td>
                                <td className="px-4 py-3 text-right font-mono text-orange-700">
                                  ${totals.pagoParadas.toLocaleString('es-PR', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            </tfoot>
                          </Table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
