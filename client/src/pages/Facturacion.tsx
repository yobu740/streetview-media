import { useAuth } from "@/_core/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/lib/dateUtils";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, FileText, Check, Calendar } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";

export default function Facturacion() {
  const { user } = useAuth();
  const { data: facturas, isLoading } = trpc.invoices.list.useQuery();
  const updatePaymentStatus = trpc.invoices.updatePaymentStatus.useMutation();
  const utils = trpc.useUtils();

  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [selectedFactura, setSelectedFactura] = useState<any>(null);
  const [fechaPago, setFechaPago] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Cargando...</p>
      </div>
    );
  }

  const handleMarkAsPaid = (factura: any) => {
    setSelectedFactura(factura);
    setFechaPago(new Date().toISOString().split("T")[0]);
    setIsPaymentDialogOpen(true);
  };

  const confirmMarkAsPaid = () => {
    if (!selectedFactura || !fechaPago) {
      toast.error("Debe seleccionar una fecha de pago");
      return;
    }

    updatePaymentStatus.mutate(
      {
        facturaId: selectedFactura.id,
        estadoPago: "Pagada",
        fechaPago: new Date(fechaPago).toISOString(),
      },
      {
        onSuccess: () => {
          toast.success("Factura marcada como pagada");
          setIsPaymentDialogOpen(false);
          setSelectedFactura(null);
          setFechaPago("");
          utils.invoices.list.invalidate();
        },
        onError: (error: any) => {
          toast.error(error.message || "Error al actualizar estado de pago");
        },
      }
    );
  };

  const getStatusBadge = (estado: string) => {
    switch (estado) {
      case "Pagada":
        return <Badge className="bg-green-600 hover:bg-green-700">Pagada</Badge>;
      case "Pendiente":
        return <Badge className="bg-yellow-600 hover:bg-yellow-700">Pendiente</Badge>;
      case "Vencida":
        return <Badge className="bg-red-600 hover:bg-red-700">Vencida</Badge>;
      default:
        return <Badge>{estado}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminSidebar />
      <div className="ml-64 p-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="outline" size="sm">
                <ArrowLeft size={16} className="mr-2" />
                Volver
              </Button>
            </Link>
            <h1 className="text-3xl font-bold text-[#1a4d3c]">Facturación</h1>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Cargando facturas...</p>
          </div>
        ) : !facturas || facturas.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <FileText size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 mb-4">No hay facturas generadas</p>
            <Link href="/anuncios">
              <Button>Ir a Gestor de Anuncios</Button>
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No. Factura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Fecha Pago</TableHead>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturas.map((factura: any) => (
                  <TableRow key={factura.id}>
                    <TableCell className="font-medium">
                      {factura.numeroFactura}
                    </TableCell>
                    <TableCell>{factura.cliente}</TableCell>
                    <TableCell>
                      {formatDateDisplay(factura.createdAt)}
                    </TableCell>
                    <TableCell className="font-semibold">
                      ${parseFloat(factura.total).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>{getStatusBadge(factura.estadoPago)}</TableCell>
                    <TableCell>
                      {factura.fechaPago
                        ? formatDateDisplay(factura.fechaPago)
                        : "-"}
                    </TableCell>
                    <TableCell>{factura.vendedor || "-"}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(factura.pdfUrl, "_blank")}
                        >
                          <FileText size={16} className="mr-1" />
                          Ver PDF
                        </Button>
                        {factura.estadoPago !== "Pagada" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => handleMarkAsPaid(factura)}
                          >
                            <Check size={16} className="mr-1" />
                            Marcar Pagada
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Mark as Paid Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Marcar Factura como Pagada</DialogTitle>
              <DialogDescription>
                Confirma el pago de la factura {selectedFactura?.numeroFactura}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="cliente">Cliente</Label>
                <Input
                  id="cliente"
                  value={selectedFactura?.cliente || ""}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="total">Total</Label>
                <Input
                  id="total"
                  value={`$${parseFloat(selectedFactura?.total || "0").toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="fecha-pago">Fecha de Pago</Label>
                <Input
                  id="fecha-pago"
                  type="date"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsPaymentDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700"
                onClick={confirmMarkAsPaid}
              >
                <Check size={16} className="mr-2" />
                Confirmar Pago
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
