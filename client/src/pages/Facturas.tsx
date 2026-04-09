import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Download, Trash2, Search, FileText, FileSpreadsheet, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function Facturas() {
  const [clienteFilter, setClienteFilter] = useState("");
  const [regeneratingId, setRegeneratingId] = useState<number | null>(null);

  const { data: facturas, isLoading, refetch } = trpc.facturas.list.useQuery({
    cliente: clienteFilter || undefined,
  });

  const deleteMutation = trpc.facturas.delete.useMutation({
    onSuccess: () => {
      toast.success("Factura eliminada exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al eliminar: ${error.message}`);
    },
  });

  const regenerateMutation = trpc.facturas.regenerate.useMutation({
    onSuccess: (data) => {
      toast.success("PDF regenerado correctamente");
      refetch();
      window.open(data.pdfUrl, "_blank");
    },
    onError: (error) => {
      toast.error(`Error al regenerar: ${error.message}`);
    },
    onSettled: () => setRegeneratingId(null),
  });

  const handleRegenerate = (id: number, numeroFactura: string) => {
    if (!confirm(`¿Regenerar PDF de la factura ${numeroFactura}?\nEl enlace anterior seguirá siendo accesible.`)) return;
    setRegeneratingId(id);
    regenerateMutation.mutate({ facturaId: id });
  };

  const handleDelete = (id: number, numeroFactura: string) => {
    if (confirm(`¿Eliminar factura ${numeroFactura}?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDownload = (pdfUrl: string, numeroFactura: string) => {
    // Open PDF in new tab for download
    window.open(pdfUrl, "_blank");
  };

  const handleExportExcel = () => {
    if (!facturas || facturas.length === 0) {
      toast.error("No hay facturas para exportar");
      return;
    }

    // Prepare data for Excel
    const excelData = facturas.map((factura) => ({
      "No. Factura": factura.numeroFactura,
      "Fecha": new Date(factura.createdAt).toLocaleDateString("es-PR"),
      "Cliente": factura.cliente,
      "Título": factura.titulo,
      "Descripción": factura.descripcion || "",
      "Cantidad Anuncios": factura.cantidadAnuncios,
      "Subtotal": parseFloat(factura.subtotal),
      "Costo Producción": factura.costoProduccion ? parseFloat(factura.costoProduccion) : 0,
      "Otros Servicios": factura.otrosServiciosDescripcion || "",
      "Costo Otros Servicios": factura.otrosServiciosCosto ? parseFloat(factura.otrosServiciosCosto) : 0,
      "Total": parseFloat(factura.total),
      "Vendedor": factura.vendedor || "",
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws["!cols"] = [
      { wch: 20 }, // No. Factura
      { wch: 12 }, // Fecha
      { wch: 25 }, // Cliente
      { wch: 30 }, // Título
      { wch: 40 }, // Descripción
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Subtotal
      { wch: 15 }, // Costo Producción
      { wch: 30 }, // Otros Servicios
      { wch: 18 }, // Costo Otros
      { wch: 12 }, // Total
      { wch: 20 }, // Vendedor
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Facturas");

    // Generate filename with current date
    const filename = `Facturas_${new Date().toISOString().split("T")[0]}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    toast.success(`Exportado ${facturas.length} facturas a Excel`);
  };

  const handleExportSingleInvoiceExcel = (factura: any) => {
    // Create detailed invoice export with line items
    const invoiceData = [
      { Campo: "No. Factura", Valor: factura.numeroFactura },
      { Campo: "Fecha", Valor: new Date(factura.createdAt).toLocaleDateString("es-PR") },
      { Campo: "Cliente", Valor: factura.cliente },
      { Campo: "Título", Valor: factura.titulo },
      { Campo: "Descripción", Valor: factura.descripcion || "" },
      { Campo: "Vendedor", Valor: factura.vendedor || "" },
      { Campo: "", Valor: "" }, // Empty row
      { Campo: "DETALLE", Valor: "" },
      { Campo: "Cantidad de Anuncios", Valor: factura.cantidadAnuncios },
      { Campo: "Subtotal", Valor: parseFloat(factura.subtotal) },
      { Campo: "", Valor: "" }, // Empty row
    ];

    // Add production cost if present
    if (factura.costoProduccion && parseFloat(factura.costoProduccion) > 0) {
      invoiceData.push({
        Campo: "Costo de Producción",
        Valor: parseFloat(factura.costoProduccion),
      });
    }

    // Add other services if present
    if (factura.otrosServiciosCosto && parseFloat(factura.otrosServiciosCosto) > 0) {
      invoiceData.push({
        Campo: "Otros Servicios",
        Valor: factura.otrosServiciosDescripcion || "",
      });
      invoiceData.push({
        Campo: "Costo Otros Servicios",
        Valor: parseFloat(factura.otrosServiciosCosto),
      });
    }

    // Add total
    invoiceData.push(
      { Campo: "", Valor: "" }, // Empty row
      { Campo: "TOTAL", Valor: parseFloat(factura.total) }
    );

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(invoiceData);

    // Set column widths
    ws["!cols"] = [
      { wch: 30 }, // Campo
      { wch: 50 }, // Valor
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Factura");

    // Generate filename
    const filename = `${factura.numeroFactura}_${factura.cliente.replace(/\s+/g, "_")}.xlsx`;

    // Download file
    XLSX.writeFile(wb, filename);
    toast.success(`Factura ${factura.numeroFactura} exportada a Excel`);
  };

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="hidden lg:block bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="container py-4">
            <div className="flex items-center gap-4">
              <img 
                src="https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png" 
                alt="Streetview Media" 
                className="h-12"
              />
              <div>
                <h1 className="text-2xl font-bold text-[#1a4d3c]">Sistema de Facturación</h1>
                <p className="text-sm text-gray-600">Gestión de facturas y cobros</p>
              </div>
            </div>
          </div>
        </div>
        <div className="container py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Historial de Facturas
          </CardTitle>
          <CardDescription>
            Consulta y gestiona todas las facturas generadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente..."
                  value={clienteFilter}
                  onChange={(e) => setClienteFilter(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => setClienteFilter("")}
            >
              Limpiar Filtros
            </Button>
            <Button
              variant="default"
              onClick={handleExportExcel}
              className="bg-[#1a4d3c] hover:bg-[#0f3a2a]"
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Cargando facturas...
            </div>
          ) : !facturas || facturas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron facturas
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No. Factura</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Anuncios</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {facturas.map((factura) => (
                    <TableRow key={factura.id}>
                      <TableCell className="font-mono text-sm">
                        {factura.numeroFactura}
                      </TableCell>
                      <TableCell>
                        {new Date(factura.createdAt).toLocaleDateString("es-PR")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {factura.cliente}
                      </TableCell>
                      <TableCell>{factura.titulo}</TableCell>
                      <TableCell>{factura.cantidadAnuncios}</TableCell>
                      <TableCell className="font-semibold">
                        ${parseFloat(factura.total).toLocaleString("en-US", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell>{factura.vendedor || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDownload(factura.pdfUrl, factura.numeroFactura)
                            }
                            title="Ver / Descargar PDF"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {(factura as any).anuncioIdsJson && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRegenerate(factura.id, factura.numeroFactura)}
                              title="Regenerar PDF con nuevo formato"
                              disabled={regeneratingId === factura.id}
                            >
                              <RefreshCw className={`h-4 w-4 ${regeneratingId === factura.id ? "animate-spin" : ""}`} />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportSingleInvoiceExcel(factura)}
                            title="Exportar a Excel"
                          >
                            <FileSpreadsheet className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(factura.id, factura.numeroFactura)
                            }
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
        </div>
      </div>
    </div>
  );
}
