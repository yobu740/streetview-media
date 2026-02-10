import { useState } from "react";
import { trpc } from "@/lib/trpc";
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
import { Download, Trash2, Search, FileText } from "lucide-react";
import { toast } from "sonner";

export default function Facturas() {
  const [clienteFilter, setClienteFilter] = useState("");
  
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

  const handleDelete = (id: number, numeroFactura: string) => {
    if (confirm(`¿Eliminar factura ${numeroFactura}?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const handleDownload = (pdfUrl: string, numeroFactura: string) => {
    // Open PDF in new tab for download
    window.open(pdfUrl, "_blank");
  };

  return (
    <div className="container mx-auto py-8">
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
          <div className="flex gap-4 mb-6">
            <div className="flex-1">
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
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleDelete(factura.id, factura.numeroFactura)
                            }
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
  );
}
