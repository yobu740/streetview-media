import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import AdminSidebar from "@/components/AdminSidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  FileText,
  Building2,
  Eye,
  Download,
  Loader2,
  X,
  ChevronLeft,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

// ─── Types ───────────────────────────────────────────────────────────────────

type Cliente = {
  id: number;
  nombre: string;
  esAgencia: number;
  direccion: string | null;
  ciudad: string | null;
  estado: string | null;
  codigoPostal: string | null;
  email: string | null;
  telefono: string | null;
  contactoPrincipal: string | null;
  notas: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ContratoItem = {
  id?: number;
  cantidad: number;
  concepto: string;
  precioPorUnidad: string;
  total: string;
};

type Contrato = {
  id: number;
  clienteId: number;
  numeroContrato: string;
  numeroPO: string | null;
  fecha: Date;
  customerId: string | null;
  salesDuration: string | null;
  vendedor: string | null;
  metodoPago: string | null;
  fechaVencimiento: Date | null;
  subtotal: string | null;
  total: string | null;
  notas: string | null;
  pdfUrl: string | null;
  estado: "Borrador" | "Enviado" | "Firmado" | "Cancelado";
  createdAt: Date;
  items?: ContratoItem[];
};

// ─── Contract PDF Generator ──────────────────────────────────────────────────

function generateContractPDF(contrato: Contrato, cliente: Cliente) {
  const logoUrl = "https://files.manuscdn.com/user_upload_by_module/session_file/310519663148968393/YbohNlnEDVQCkCgw.png";

  const formatDate = (d: Date | null) => {
    if (!d) return "__ / __ / __";
    const date = new Date(d);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    const yy = String(date.getFullYear()).slice(-2);
    return `${mm} / ${dd}/ ${yy}`;
  };

  const calcSubtotal = () => {
    if (contrato.subtotal) return contrato.subtotal;
    if (!contrato.items) return "$0";
    let sum = 0;
    for (const item of contrato.items) {
      const t = item.total?.replace(/[^0-9.]/g, "");
      if (t) sum += parseFloat(t);
    }
    return `$${sum.toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
  };

  const itemRows = (contrato.items || []).map((item) => `
    <tr>
      <td style="padding:10px 8px;border:1px solid #ddd;text-align:center;">${item.cantidad}</td>
      <td style="padding:10px 8px;border:1px solid #ddd;">${item.concepto}</td>
      <td style="padding:10px 8px;border:1px solid #ddd;text-align:right;">${item.precioPorUnidad || ""}</td>
      <td style="padding:10px 8px;border:1px solid #ddd;text-align:right;">${item.total || ""}</td>
    </tr>
  `).join("");

  // Pad to at least 3 rows
  const emptyRows = Math.max(0, 3 - (contrato.items?.length || 0));
  const paddingRows = Array(emptyRows).fill(`
    <tr>
      <td style="padding:20px 8px;border:1px solid #ddd;"></td>
      <td style="padding:20px 8px;border:1px solid #ddd;"></td>
      <td style="padding:20px 8px;border:1px solid #ddd;"></td>
      <td style="padding:20px 8px;border:1px solid #ddd;"></td>
    </tr>
  `).join("");

  const subtotal = calcSubtotal();
  const total = contrato.total || subtotal;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #222; background: white; }
    .page { width: 800px; margin: 0 auto; padding: 40px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #1a4d3c; padding-bottom: 16px; }
    .logo img { height: 70px; }
    .contract-title { font-size: 52px; font-weight: 900; color: #222; letter-spacing: -1px; }
    .contact-info { text-align: right; font-size: 12px; color: #555; margin-top: 8px; }
    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 20px; }
    .para-block { }
    .para-label { color: #e05a00; font-weight: 700; font-size: 14px; margin-bottom: 4px; }
    .para-name { font-size: 16px; font-weight: 700; }
    .para-address { font-size: 13px; color: #555; }
    .meta-block { display: flex; flex-direction: column; gap: 6px; }
    .meta-row { display: flex; gap: 8px; align-items: baseline; }
    .meta-label { color: #e05a00; font-weight: 700; font-size: 13px; min-width: 120px; }
    .meta-value { font-size: 14px; font-weight: 600; }
    .duration-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .duration-table th { background: #f5f5f5; border: 1px solid #ddd; padding: 8px; font-size: 12px; text-align: left; }
    .duration-table td { border: 1px solid #ddd; padding: 10px 8px; font-size: 13px; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .items-table th { background: #222; color: white; padding: 10px 8px; font-size: 13px; text-align: left; }
    .items-table th:first-child { width: 60px; text-align: center; }
    .items-table th:nth-child(3), .items-table th:nth-child(4) { width: 130px; text-align: right; }
    .totals { display: flex; justify-content: flex-end; margin-bottom: 60px; }
    .totals-table { width: 260px; border-collapse: collapse; }
    .totals-table td { padding: 8px 12px; font-size: 14px; }
    .totals-table .label { font-weight: 600; }
    .totals-table .amount { text-align: right; background: #d4edda; font-weight: 700; }
    .totals-table .total-row td { font-size: 16px; font-weight: 900; }
    .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-bottom: 30px; }
    .sig-line { border-top: 2px solid #222; padding-top: 8px; font-size: 12px; font-weight: 600; text-align: center; }
    .footer { border-top: 3px solid #1a4d3c; padding-top: 12px; font-size: 10px; color: #666; text-align: center; line-height: 1.6; }
    .green-bar { height: 8px; background: linear-gradient(90deg, #1a4d3c, #ff6b35, #ffd700); margin-bottom: 0; }
  </style>
</head>
<body>
<div class="page">
  <div class="header">
    <div class="logo">
      <img src="${logoUrl}" alt="Streetview Media" />
      <div style="font-size:11px;color:#666;margin-top:4px;">TU MARCA EN EL CAMINO</div>
    </div>
    <div style="text-align:right;">
      <div class="contract-title">CONTRACT</div>
      <div class="contact-info">
        787-708-5115<br>
        www.streetviewmedia.com<br>
        130 Ave. Winston Churchill - PMB 167 &nbsp; San Juan, PR 00926
      </div>
    </div>
  </div>

  <div class="info-section">
    <div class="para-block">
      <div class="para-label">FOR:</div>
      <div class="para-name">${cliente.nombre}</div>
      <div class="para-address">${cliente.direccion || ""}<br>${cliente.ciudad || ""}${cliente.estado ? ", " + cliente.estado : ""} ${cliente.codigoPostal || ""}</div>
    </div>
    <div class="meta-block">
      <div class="meta-row">
        <span class="meta-label">CONTRACT N.°:</span>
        <span class="meta-value">${contrato.numeroContrato}${contrato.numeroPO ? " / " + contrato.numeroPO : ""}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">DATE:</span>
        <span class="meta-value">${formatDate(contrato.fecha)}</span>
      </div>
      <div class="meta-row">
        <span class="meta-label">CUSTOMER ID.:</span>
        <span class="meta-value">${contrato.customerId || ""}</span>
      </div>
    </div>
  </div>

  <table class="duration-table">
    <thead>
      <tr>
        <th>SALES DURATION</th>
        <th>SALESPERSON</th>
        <th>PAYMENT</th>
        <th>DUE DATE</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${contrato.salesDuration || ""}</td>
        <td>${contrato.vendedor || ""}</td>
        <td>${contrato.metodoPago || "ACH / Wire Transfer"}</td>
        <td>${contrato.fechaVencimiento ? formatDate(contrato.fechaVencimiento) : ""}</td>
      </tr>
    </tbody>
  </table>

  <table class="items-table">
    <thead>
      <tr>
        <th>QNTY</th>
        <th>CONCEPT</th>
        <th style="text-align:right;">PRICE PER UNIT</th>
        <th style="text-align:right;">TOTAL</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      ${paddingRows}
    </tbody>
  </table>

  <div class="totals">
    <table class="totals-table">
      <tr>
        <td class="label">SUBTOTAL</td>
        <td class="amount">${subtotal}</td>
      </tr>
      <tr>
        <td style="padding:8px 12px;"></td>
        <td class="amount" style="background:#e8f5e9;"></td>
      </tr>
      <tr class="total-row">
        <td class="label">TOTAL</td>
        <td class="amount">${total}</td>
      </tr>
    </table>
  </div>

  <div class="signatures">
    <div>
      <div style="height:50px;"></div>
      <div class="sig-line">SALESPERSON NAME</div>
    </div>
    <div>
      <div style="height:50px;"></div>
      <div class="sig-line">CLIENT</div>
    </div>
  </div>

  <div class="footer">
    PAYMENTS WILL BE MADE BY CHECK OR BANK TRANSFER. CHECKS WILL BE MADE UNDER THE NAME: STREETVIEW MEDIA<br>
    FIRST MONTH AND PRODUCTION MUST BE PAID IN ADVANCE. CANCELLATION MUST BE MADE 60 DAYS PRIOR TO CANCELLATION. 12 MONTH CONTRACT. NO CANCELLATION IN MONTHLY CONTRACTS. INVOICES WILL BE PAID MONTHLY.
  </div>
</div>
<div class="green-bar"></div>
</body>
</html>`;

  return html;
}

// ─── Estado badge ─────────────────────────────────────────────────────────────

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, string> = {
    Borrador: "bg-gray-100 text-gray-700",
    Enviado: "bg-blue-100 text-blue-700",
    Firmado: "bg-green-100 text-green-700",
    Cancelado: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${map[estado] || "bg-gray-100 text-gray-700"}`}>
      {estado}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Clientes() {
  const { user } = useAuth();
  const utils = trpc.useUtils();

  // ── Data ──
  const { data: clientes = [], isLoading } = trpc.clientes.list.useQuery();

  // ── State ──
  const [search, setSearch] = useState("");
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [view, setView] = useState<"list" | "detail">("list");

  // Client dialogs
  const [showClienteForm, setShowClienteForm] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);

  // Contract dialogs
  const [showContratoForm, setShowContratoForm] = useState(false);
  const [editingContrato, setEditingContrato] = useState<Contrato | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);

  // ── Mutations ──
  const createCliente = trpc.clientes.create.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cliente creado"); setShowClienteForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateCliente = trpc.clientes.update.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cliente actualizado"); setShowClienteForm(false); setEditingCliente(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteCliente = trpc.clientes.delete.useMutation({
    onSuccess: () => { utils.clientes.list.invalidate(); toast.success("Cliente eliminado"); setSelectedCliente(null); setView("list"); },
    onError: (e) => toast.error(e.message),
  });

  const createContrato = trpc.contratos.create.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); toast.success("Contrato creado"); setShowContratoForm(false); },
    onError: (e) => toast.error(e.message),
  });
  const updateContrato = trpc.contratos.update.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); toast.success("Contrato actualizado"); setShowContratoForm(false); setEditingContrato(null); },
    onError: (e) => toast.error(e.message),
  });
  const deleteContrato = trpc.contratos.delete.useMutation({
    onSuccess: () => { if (selectedCliente) utils.contratos.list.invalidate({ clienteId: selectedCliente.id }); toast.success("Contrato eliminado"); },
    onError: (e) => toast.error(e.message),
  });

  // ── Filtered list ──
  const filtered = clientes.filter((c) =>
    c.nombre.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.contactoPrincipal || "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Contratos for selected client ──
  const { data: contratos = [] } = trpc.contratos.list.useQuery(
    { clienteId: selectedCliente?.id },
    { enabled: !!selectedCliente }
  );

  // ── Handlers ──
  const handleSelectCliente = (c: Cliente) => {
    setSelectedCliente(c);
    setView("detail");
  };

  const handlePreviewContract = (contrato: Contrato) => {
    if (!selectedCliente) return;
    const html = generateContractPDF(contrato, selectedCliente);
    setPreviewHtml(html);
  };

  const handlePrintContract = (contrato: Contrato) => {
    if (!selectedCliente) return;
    const html = generateContractPDF(contrato, selectedCliente);
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  return (
    <div className="flex min-h-screen bg-[#f5f5f5]">
      <AdminSidebar />

      <main className="flex-1 p-6 overflow-auto">
        {view === "list" ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-display text-3xl text-[#1a4d3c] font-bold">Clientes</h1>
                <p className="text-body text-gray-500 mt-1">Gestión de clientes y contratos</p>
              </div>
              <Button
                className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white"
                onClick={() => { setEditingCliente(null); setShowClienteForm(true); }}
              >
                <Plus size={16} className="mr-2" />
                Nuevo Cliente
              </Button>
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Buscar por nombre, email o contacto..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Card className="border-l-4 border-[#1a4d3c]">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#1a4d3c]">{clientes.length}</div>
                  <div className="text-sm text-gray-500">Total Clientes</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-[#ff6b35]">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-[#ff6b35]">{clientes.filter(c => c.esAgencia).length}</div>
                  <div className="text-sm text-gray-500">Agencias</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-blue-500">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">{clientes.filter(c => !c.esAgencia).length}</div>
                  <div className="text-sm text-gray-500">Clientes Directos</div>
                </CardContent>
              </Card>
              <Card className="border-l-4 border-green-500">
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">{clientes.filter(c => c.email).length}</div>
                  <div className="text-sm text-gray-500">Con Email</div>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 size={32} className="animate-spin text-[#1a4d3c]" />
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-16 text-gray-400">
                    <Building2 size={48} className="mx-auto mb-4 opacity-30" />
                    <p className="text-lg">No hay clientes registrados</p>
                    <p className="text-sm mt-1">Haz clic en "Nuevo Cliente" para comenzar</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente / Agencia</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Contacto</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Teléfono</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((c) => (
                        <TableRow
                          key={c.id}
                          className="cursor-pointer hover:bg-[#f0f9f4]"
                          onClick={() => handleSelectCliente(c)}
                        >
                          <TableCell className="font-semibold text-[#1a4d3c]">{c.nombre}</TableCell>
                          <TableCell>
                            <Badge variant={c.esAgencia ? "default" : "secondary"} className={c.esAgencia ? "bg-[#ff6b35] text-white" : ""}>
                              {c.esAgencia ? "Agencia" : "Directo"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">{c.contactoPrincipal || "—"}</TableCell>
                          <TableCell className="text-gray-600">{c.email || "—"}</TableCell>
                          <TableCell className="text-gray-600">{c.telefono || "—"}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => { setEditingCliente(c); setShowClienteForm(true); }}
                              >
                                <Edit size={14} />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-500 hover:text-red-700"
                                onClick={() => {
                                  if (confirm(`¿Eliminar cliente "${c.nombre}"?`)) deleteCliente.mutate({ id: c.id });
                                }}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        ) : (
          // ── Detail View ──
          selectedCliente && (
            <ClienteDetail
              cliente={selectedCliente}
              contratos={contratos as Contrato[]}
              onBack={() => { setView("list"); setSelectedCliente(null); }}
              onEditCliente={() => { setEditingCliente(selectedCliente); setShowClienteForm(true); }}
              onNewContrato={() => { setEditingContrato(null); setShowContratoForm(true); }}
              onEditContrato={(c) => { setEditingContrato(c); setShowContratoForm(true); }}
              onDeleteContrato={(id) => { if (confirm("¿Eliminar este contrato?")) deleteContrato.mutate({ id }); }}
              onPreviewContrato={handlePreviewContract}
              onPrintContrato={handlePrintContract}
            />
          )
        )}
      </main>

      {/* Client Form Dialog */}
      <ClienteFormDialog
        open={showClienteForm}
        onClose={() => { setShowClienteForm(false); setEditingCliente(null); }}
        cliente={editingCliente}
        onSave={(data) => {
          if (editingCliente) {
            updateCliente.mutate({ id: editingCliente.id, ...data });
          } else {
            createCliente.mutate(data);
          }
        }}
        saving={createCliente.isPending || updateCliente.isPending}
      />

      {/* Contract Form Dialog */}
      {selectedCliente && (
        <ContratoFormDialog
          open={showContratoForm}
          onClose={() => { setShowContratoForm(false); setEditingContrato(null); }}
          contrato={editingContrato}
          clienteId={selectedCliente.id}
          onSave={(data) => {
            if (editingContrato) {
              updateContrato.mutate({ id: editingContrato.id, ...data });
            } else {
              createContrato.mutate({ clienteId: selectedCliente.id, ...data });
            }
          }}
          saving={createContrato.isPending || updateContrato.isPending}
        />
      )}

      {/* PDF Preview Modal */}
      {previewHtml && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="font-bold text-lg">Vista Previa del Contrato</h2>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    const win = window.open("", "_blank");
                    if (!win) return;
                    win.document.write(previewHtml);
                    win.document.close();
                    win.focus();
                    setTimeout(() => win.print(), 500);
                  }}
                >
                  <Download size={16} className="mr-2" />
                  Imprimir / Guardar PDF
                </Button>
                <Button variant="ghost" onClick={() => setPreviewHtml(null)}>
                  <X size={16} />
                </Button>
              </div>
            </div>
            <div className="flex-1 overflow-auto">
              <iframe
                srcDoc={previewHtml}
                className="w-full h-full border-0"
                title="Contract Preview"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cliente Detail View ──────────────────────────────────────────────────────

function ClienteDetail({
  cliente,
  contratos,
  onBack,
  onEditCliente,
  onNewContrato,
  onEditContrato,
  onDeleteContrato,
  onPreviewContrato,
  onPrintContrato,
}: {
  cliente: Cliente;
  contratos: Contrato[];
  onBack: () => void;
  onEditCliente: () => void;
  onNewContrato: () => void;
  onEditContrato: (c: Contrato) => void;
  onDeleteContrato: (id: number) => void;
  onPreviewContrato: (c: Contrato) => void;
  onPrintContrato: (c: Contrato) => void;
}) {
  return (
    <div>
      {/* Back button */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" onClick={onBack} className="text-gray-500">
          <ChevronLeft size={18} className="mr-1" />
          Clientes
        </Button>
        <span className="text-gray-400">/</span>
        <span className="font-semibold text-[#1a4d3c]">{cliente.nombre}</span>
      </div>

      {/* Client info card */}
      <Card className="mb-6 border-l-4 border-[#1a4d3c]">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#1a4d3c] flex items-center justify-center text-white font-bold text-xl">
                {cliente.nombre.charAt(0)}
              </div>
              <div>
                <CardTitle className="text-xl text-[#1a4d3c]">{cliente.nombre}</CardTitle>
                <Badge variant={cliente.esAgencia ? "default" : "secondary"} className={`mt-1 ${cliente.esAgencia ? "bg-[#ff6b35] text-white" : ""}`}>
                  {cliente.esAgencia ? "Agencia de Publicidad" : "Cliente Directo"}
                </Badge>
              </div>
            </div>
            <Button variant="outline" onClick={onEditCliente}>
              <Edit size={14} className="mr-2" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Dirección</p>
              <p className="text-sm font-medium">{cliente.direccion || "—"}</p>
              {(cliente.ciudad || cliente.estado) && (
                <p className="text-sm text-gray-500">{[cliente.ciudad, cliente.estado, cliente.codigoPostal].filter(Boolean).join(", ")}</p>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Contacto</p>
              <p className="text-sm font-medium">{cliente.contactoPrincipal || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email de Facturación</p>
              <p className="text-sm font-medium text-blue-600">{cliente.email || <span className="text-gray-400 italic">Sin email</span>}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Teléfono</p>
              <p className="text-sm font-medium">{cliente.telefono || "—"}</p>
            </div>
          </div>
          {cliente.notas && (
            <div className="mt-4 p-3 bg-yellow-50 rounded border border-yellow-200">
              <p className="text-xs text-yellow-700 font-semibold uppercase tracking-wide mb-1">Notas internas</p>
              <p className="text-sm text-yellow-800">{cliente.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contracts section */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-[#1a4d3c]">Contratos ({contratos.length})</h2>
        <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" onClick={onNewContrato}>
          <Plus size={16} className="mr-2" />
          Nuevo Contrato
        </Button>
      </div>

      {contratos.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            <FileText size={48} className="mx-auto mb-4 opacity-30" />
            <p className="text-lg">No hay contratos para este cliente</p>
            <p className="text-sm mt-1">Haz clic en "Nuevo Contrato" para crear el primero</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contratos.map((c) => (
            <Card key={c.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-bold text-[#1a4d3c] text-lg">#{c.numeroContrato}</span>
                      {c.numeroPO && <span className="text-sm text-gray-500">PO: {c.numeroPO}</span>}
                      <EstadoBadge estado={c.estado} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <span className="text-gray-400">Cliente ID:</span>
                        <span className="ml-1 font-medium">{c.customerId || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Duración:</span>
                        <span className="ml-1 font-medium">{c.salesDuration || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Vendedor:</span>
                        <span className="ml-1 font-medium">{c.vendedor || "—"}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total:</span>
                        <span className="ml-1 font-bold text-green-700">{c.total || "—"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Button size="sm" variant="outline" onClick={() => onPreviewContrato(c)}>
                      <Eye size={14} className="mr-1" />
                      Ver
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => onPrintContrato(c)}>
                      <Download size={14} className="mr-1" />
                      PDF
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => onEditContrato(c)}>
                      <Edit size={14} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-700"
                      onClick={() => onDeleteContrato(c.id)}
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Cliente Form Dialog ──────────────────────────────────────────────────────

function ClienteFormDialog({
  open,
  onClose,
  cliente,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  cliente: Cliente | null;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    nombre: cliente?.nombre || "",
    esAgencia: cliente?.esAgencia ?? 0,
    direccion: cliente?.direccion || "",
    ciudad: cliente?.ciudad || "",
    estado: cliente?.estado || "",
    codigoPostal: cliente?.codigoPostal || "",
    email: cliente?.email || "",
    telefono: cliente?.telefono || "",
    contactoPrincipal: cliente?.contactoPrincipal || "",
    notas: cliente?.notas || "",
  });

  // Reset form when cliente changes
  const prevCliente = useRef(cliente);
  if (prevCliente.current !== cliente) {
    prevCliente.current = cliente;
    setForm({
      nombre: cliente?.nombre || "",
      esAgencia: cliente?.esAgencia ?? 0,
      direccion: cliente?.direccion || "",
      ciudad: cliente?.ciudad || "",
      estado: cliente?.estado || "",
      codigoPostal: cliente?.codigoPostal || "",
      email: cliente?.email || "",
      telefono: cliente?.telefono || "",
      contactoPrincipal: cliente?.contactoPrincipal || "",
      notas: cliente?.notas || "",
    });
  }

  const handleSubmit = () => {
    if (!form.nombre.trim()) { toast.error("El nombre es requerido"); return; }
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar Cliente" : "Nuevo Cliente"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Nombre / Empresa *</Label>
              <Input value={form.nombre} onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Badillo Saatchi & Saatchi" />
            </div>
            <div className="col-span-2">
              <Label>Tipo</Label>
              <Select value={String(form.esAgencia)} onValueChange={(v) => setForm(f => ({ ...f, esAgencia: Number(v) }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Cliente Directo</SelectItem>
                  <SelectItem value="1">Agencia de Publicidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Dirección</Label>
              <Input value={form.direccion} onChange={(e) => setForm(f => ({ ...f, direccion: e.target.value }))} placeholder="Calle / PO Box" />
            </div>
            <div>
              <Label>Ciudad</Label>
              <Input value={form.ciudad} onChange={(e) => setForm(f => ({ ...f, ciudad: e.target.value }))} placeholder="San Juan" />
            </div>
            <div>
              <Label>Estado / País</Label>
              <Input value={form.estado} onChange={(e) => setForm(f => ({ ...f, estado: e.target.value }))} placeholder="PR" />
            </div>
            <div>
              <Label>Código Postal</Label>
              <Input value={form.codigoPostal} onChange={(e) => setForm(f => ({ ...f, codigoPostal: e.target.value }))} placeholder="00926" />
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={form.telefono} onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="787-000-0000" />
            </div>
            <div className="col-span-2">
              <Label>Contacto Principal</Label>
              <Input value={form.contactoPrincipal} onChange={(e) => setForm(f => ({ ...f, contactoPrincipal: e.target.value }))} placeholder="Nombre del contacto" />
            </div>
            <div className="col-span-2">
              <Label>Email de Facturación</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} placeholder="facturacion@empresa.com" />
              <p className="text-xs text-gray-400 mt-1">Se usará para enviar facturas directamente al cliente</p>
            </div>
            <div className="col-span-2">
              <Label>Notas Internas</Label>
              <Textarea value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Notas internas sobre este cliente..." />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {cliente ? "Guardar Cambios" : "Crear Cliente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Contrato Form Dialog ─────────────────────────────────────────────────────

function ContratoFormDialog({
  open,
  onClose,
  contrato,
  clienteId,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  contrato: Contrato | null;
  clienteId: number;
  onSave: (data: any) => void;
  saving: boolean;
}) {
  const today = new Date();
  const [form, setForm] = useState({
    numeroContrato: contrato?.numeroContrato || `2026-`,
    numeroPO: contrato?.numeroPO || "",
    fecha: contrato?.fecha ? new Date(contrato.fecha).toISOString().split("T")[0] : today.toISOString().split("T")[0],
    customerId: contrato?.customerId || "",
    salesDuration: contrato?.salesDuration || "",
    vendedor: contrato?.vendedor || "",
    metodoPago: contrato?.metodoPago || "ACH / Wire Transfer",
    subtotal: contrato?.subtotal || "",
    total: contrato?.total || "",
    notas: contrato?.notas || "",
    estado: (contrato?.estado || "Borrador") as "Borrador" | "Enviado" | "Firmado" | "Cancelado",
    items: (contrato?.items || [{ cantidad: 1, concepto: "", precioPorUnidad: "", total: "" }]) as ContratoItem[],
  });

  const prevContrato = useRef(contrato);
  if (prevContrato.current !== contrato) {
    prevContrato.current = contrato;
    setForm({
      numeroContrato: contrato?.numeroContrato || `2026-`,
      numeroPO: contrato?.numeroPO || "",
      fecha: contrato?.fecha ? new Date(contrato.fecha).toISOString().split("T")[0] : today.toISOString().split("T")[0],
      customerId: contrato?.customerId || "",
      salesDuration: contrato?.salesDuration || "",
      vendedor: contrato?.vendedor || "",
      metodoPago: contrato?.metodoPago || "ACH / Wire Transfer",
      subtotal: contrato?.subtotal || "",
      total: contrato?.total || "",
      notas: contrato?.notas || "",
      estado: (contrato?.estado || "Borrador") as "Borrador" | "Enviado" | "Firmado" | "Cancelado",
      items: (contrato?.items || [{ cantidad: 1, concepto: "", precioPorUnidad: "", total: "" }]) as ContratoItem[],
    });
  }

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { cantidad: 1, concepto: "", precioPorUnidad: "", total: "" }] }));
  const removeItem = (i: number) => setForm(f => ({ ...f, items: f.items.filter((_, idx) => idx !== i) }));
  const updateItem = (i: number, field: keyof ContratoItem, value: any) =>
    setForm(f => ({ ...f, items: f.items.map((item, idx) => idx === i ? { ...item, [field]: value } : item) }));

  // Auto-calculate subtotal
  const calcSubtotal = () => {
    let sum = 0;
    for (const item of form.items) {
      const t = item.total?.replace(/[^0-9.]/g, "");
      if (t) sum += parseFloat(t);
    }
    return sum > 0 ? `$${sum.toLocaleString("en-US", { minimumFractionDigits: 0 })}` : "";
  };

  const handleSubmit = () => {
    if (!form.numeroContrato.trim()) { toast.error("El número de contrato es requerido"); return; }
    const subtotal = form.subtotal || calcSubtotal();
    const total = form.total || subtotal;
    onSave({
      ...form,
      fecha: new Date(form.fecha),
      subtotal,
      total,
      numeroPO: form.numeroPO || null,
      customerId: form.customerId || null,
      salesDuration: form.salesDuration || null,
      vendedor: form.vendedor || null,
      notas: form.notas || null,
      items: form.items.filter(i => i.concepto.trim()),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{contrato ? "Editar Contrato" : "Nuevo Contrato"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Contract header fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Número de Contrato *</Label>
              <Input value={form.numeroContrato} onChange={(e) => setForm(f => ({ ...f, numeroContrato: e.target.value }))} placeholder="2026-1" />
            </div>
            <div>
              <Label>Número PO (si aplica)</Label>
              <Input value={form.numeroPO} onChange={(e) => setForm(f => ({ ...f, numeroPO: e.target.value }))} placeholder="161400" />
            </div>
            <div>
              <Label>Fecha</Label>
              <Input type="date" value={form.fecha} onChange={(e) => setForm(f => ({ ...f, fecha: e.target.value }))} />
            </div>
            <div>
              <Label>Customer ID (Marca)</Label>
              <Input value={form.customerId} onChange={(e) => setForm(f => ({ ...f, customerId: e.target.value }))} placeholder="Taco Bell, CLARO..." />
            </div>
            <div>
              <Label>Duración de Ventas</Label>
              <Input value={form.salesDuration} onChange={(e) => setForm(f => ({ ...f, salesDuration: e.target.value }))} placeholder="February 2026 - November 2026" />
            </div>
            <div>
              <Label>Vendedor(es)</Label>
              <Input value={form.vendedor} onChange={(e) => setForm(f => ({ ...f, vendedor: e.target.value }))} placeholder="Carmen Esteve" />
            </div>
            <div>
              <Label>Método de Pago</Label>
              <Input value={form.metodoPago} onChange={(e) => setForm(f => ({ ...f, metodoPago: e.target.value }))} placeholder="ACH / Wire Transfer" />
            </div>
            <div>
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm(f => ({ ...f, estado: v as any }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Borrador">Borrador</SelectItem>
                  <SelectItem value="Enviado">Enviado</SelectItem>
                  <SelectItem value="Firmado">Firmado</SelectItem>
                  <SelectItem value="Cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base font-semibold">Líneas del Contrato</Label>
              <Button size="sm" variant="outline" onClick={addItem}>
                <Plus size={14} className="mr-1" />
                Añadir Línea
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-left w-16">Cant.</th>
                    <th className="p-2 text-left">Concepto</th>
                    <th className="p-2 text-left w-32">Precio/Unidad</th>
                    <th className="p-2 text-left w-28">Total</th>
                    <th className="p-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.map((item, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-1">
                        <Input
                          type="number"
                          value={item.cantidad}
                          onChange={(e) => updateItem(i, "cantidad", Number(e.target.value))}
                          className="h-8 text-center"
                          min={1}
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.concepto}
                          onChange={(e) => updateItem(i, "concepto", e.target.value)}
                          className="h-8"
                          placeholder="Descripción..."
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.precioPorUnidad}
                          onChange={(e) => updateItem(i, "precioPorUnidad", e.target.value)}
                          className="h-8"
                          placeholder="$300"
                        />
                      </td>
                      <td className="p-1">
                        <Input
                          value={item.total}
                          onChange={(e) => updateItem(i, "total", e.target.value)}
                          className="h-8"
                          placeholder="$2,400"
                        />
                      </td>
                      <td className="p-1">
                        {form.items.length > 1 && (
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-400" onClick={() => removeItem(i)}>
                            <X size={12} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end mt-2 gap-6 text-sm pr-10">
              <span className="text-gray-500">Subtotal auto: <strong>{calcSubtotal() || "—"}</strong></span>
            </div>
          </div>

          {/* Totals override */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Subtotal (opcional, sobreescribe auto)</Label>
              <Input value={form.subtotal} onChange={(e) => setForm(f => ({ ...f, subtotal: e.target.value }))} placeholder="$24,000" />
            </div>
            <div>
              <Label>Total (opcional, sobreescribe auto)</Label>
              <Input value={form.total} onChange={(e) => setForm(f => ({ ...f, total: e.target.value }))} placeholder="$24,000" />
            </div>
          </div>

          <div>
            <Label>Notas Internas</Label>
            <Textarea value={form.notas} onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} rows={2} placeholder="Notas sobre este contrato..." />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button className="bg-[#1a4d3c] hover:bg-[#0f3a2a] text-white" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 size={14} className="animate-spin mr-2" /> : null}
            {contrato ? "Guardar Cambios" : "Crear Contrato"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
