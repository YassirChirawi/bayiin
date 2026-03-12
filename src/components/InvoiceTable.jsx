import { useState, useMemo } from "react";
import { Search, Download, FileText, X } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TVA_RATE = 0.20;

/** Generate a readable invoice number from order id and date */
const toInvoiceNumber = (order, index) => {
    const year = order.date ? order.date.substring(0, 4) : new Date().getFullYear();
    const seq = String(index + 1).padStart(4, "0");
    return `FAC-${year}-${seq}`;
};

/** Determine if order is considered "paid" */
const isPaidOrder = (o) =>
    o.isPaid === true || o.isPaid === "true" || o.paymentStatus === "remitted";

/** Get customer type badge label */
const getCustomerType = (o) => {
    if (o.customerType === "PRO") return "PRO";
    if (o.customerType === "RETAIL") return "RETAIL";
    return o.clientType || "RETAIL";
};

/** Export an array of objects to CSV download */
const exportToCSV = (rows, filename = "transactions.csv") => {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
    const csv = [
        headers.join(","),
        ...rows.map(r =>
            headers.map(h => `"${String(r[h] ?? "").replace(/"/g, '""')}"`).join(",")
        )
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

// ─── PDF Generator ─────────────────────────────────────────────────────────────

const generateInvoicePDF = (order, invoiceNumber, store) => {
    const qty = parseInt(order.quantity) || 1;
    const priceTTC = parseFloat(order.price) || 0;
    const totalTTC = priceTTC * qty;
    const totalHT = totalTTC / (1 + TVA_RATE);
    const tva = totalTTC - totalHT;
    const date = order.date || new Date().toISOString().split("T")[0];

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8"/>
  <title>Facture ${invoiceNumber}</title>
  <style>
    * { box-sizing: border-box; font-family: Arial, sans-serif; }
    body { margin: 0; padding: 40px; color: #111; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #6366f1; padding-bottom: 20px; margin-bottom: 24px; }
    .brand h1 { margin: 0; font-size: 24px; color: #6366f1; font-weight: 900; }
    .brand p { margin: 2px 0; color: #555; font-size: 11px; }
    .invoice-meta { text-align: right; }
    .invoice-meta h2 { margin: 0; font-size: 20px; font-weight: bold; }
    .invoice-meta p { margin: 2px 0; color: #555; font-size: 11px; }
    .parties { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 24px; }
    .party h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin: 0 0 8px 0; }
    .party p { margin: 2px 0; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
    th { background: #f5f5ff; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #6366f1; border-bottom: 1px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f3f4f6; }
    .totals { margin-left: auto; width: 280px; }
    .totals table { margin-bottom: 0; }
    .totals td { padding: 6px 12px; }
    .totals .total-row { font-weight: bold; font-size: 15px; background: #f5f5ff; color: #6366f1; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #888; text-align: center; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; margin-left: 8px; }
    .badge-pro { background: #ede9fe; color: #7c3aed; }
    .badge-retail { background: #e0f2fe; color: #0284c7; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <h1>${store?.name || "BayIIn"}</h1>
      ${store?.address ? `<p>${store.address}</p>` : ""}
      ${store?.ice ? `<p><strong>ICE:</strong> ${store.ice}</p>` : ""}
      ${store?.if_fiscal ? `<p><strong>IF:</strong> ${store.if_fiscal}</p>` : ""}
      ${store?.rc ? `<p><strong>RC:</strong> ${store.rc}</p>` : ""}
      ${store?.patente ? `<p><strong>Patente:</strong> ${store.patente}</p>` : ""}
    </div>
    <div class="invoice-meta">
      <h2>FACTURE</h2>
      <p><strong>${invoiceNumber}</strong></p>
      <p>Date: ${date}</p>
      <p>Devise: ${store?.currency || "MAD"}</p>
    </div>
  </div>

  <div class="parties">
    <div class="party">
      <h3>Émetteur</h3>
      <p><strong>${store?.name || "—"}</strong></p>
      ${store?.phone ? `<p>Tél: ${store.phone}</p>` : ""}
      ${store?.email ? `<p>Email: ${store.email}</p>` : ""}
    </div>
    <div class="party">
      <h3>Client</h3>
      <p><strong>${order.clientName || "Client"}</strong>
        <span class="badge ${getCustomerType(order) === "PRO" ? "badge-pro" : "badge-retail"}">${getCustomerType(order)}</span>
      </p>
      ${order.clientPhone ? `<p>Tél: ${order.clientPhone}</p>` : ""}
      ${order.clientCity ? `<p>Ville: ${order.clientCity}</p>` : ""}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Référence commande</th>
        <th>Désignation</th>
        ${order.batchNumber ? "<th>N° Lot</th>" : ""}
        <th style="text-align:center;">Qté</th>
        <th style="text-align:right;">P.U. HT</th>
        <th style="text-align:right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>${order.reference || order.id || "—"}</td>
        <td>${order.articleName || order.productName || "Produit"}</td>
        ${order.batchNumber ? `<td>${order.batchNumber}</td>` : ""}
        <td style="text-align:center;">${qty}</td>
        <td style="text-align:right;">${(priceTTC / (1 + TVA_RATE)).toFixed(2)} ${store?.currency || "MAD"}</td>
        <td style="text-align:right;">${totalHT.toFixed(2)} ${store?.currency || "MAD"}</td>
      </tr>
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Sous-total HT</td>
        <td style="text-align:right;">${totalHT.toFixed(2)} ${store?.currency || "MAD"}</td>
      </tr>
      <tr>
        <td>TVA (20%)</td>
        <td style="text-align:right;">${tva.toFixed(2)} ${store?.currency || "MAD"}</td>
      </tr>
      <tr class="total-row">
        <td>TOTAL TTC</td>
        <td style="text-align:right;">${totalTTC.toFixed(2)} ${store?.currency || "MAD"}</td>
      </tr>
    </table>
  </div>

  <div class="footer">
    <p>Statut paiement : <strong>${isPaidOrder(order) ? "✓ Payé" : "⏳ En attente"}</strong></p>
    <p style="margin-top:8px;">Merci pour votre confiance — TVA en vigueur au Maroc (20%). Ce document tient lieu de facture.</p>
    ${store?.ice ? `<p>ICE: ${store.ice} | IF: ${store.if_fiscal || "—"} | RC: ${store.rc || "—"} | Patente: ${store.patente || "—"}</p>` : ""}
  </div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
};

// ─── Badge Components ──────────────────────────────────────────────────────────

const PaymentBadge = ({ isPaid }) => (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isPaid ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"
        }`}>
        <span className={`mr-1.5 h-1.5 w-1.5 rounded-full ${isPaid ? "bg-green-500" : "bg-amber-500"}`} />
        {isPaid ? "Payé" : "En attente"}
    </span>
);

const TypeBadge = ({ type }) => (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${type === "PRO" ? "bg-violet-100 text-violet-700" : "bg-sky-100 text-sky-700"
        }`}>
        {type}
    </span>
);

// ─── Main Component ────────────────────────────────────────────────────────────

/**
 * InvoiceTable
 * @param {Array} orders - All orders in the selected date range
 * @param {Object} store - Store configuration (name, ICE, currency, etc.)
 */
export default function InvoiceTable({ orders = [], store }) {
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    // Only show delivered or paid orders as "invoiceable" transactions
    const invoiceableOrders = useMemo(() =>
        orders.filter(o =>
            o.status === "livré" ||
            o.isPaid === true ||
            o.isPaid === "true" ||
            o.paymentStatus === "remitted"
        ),
        [orders]
    );

    const filtered = useMemo(() => {
        let rows = invoiceableOrders;
        if (search.trim()) {
            const q = search.toLowerCase();
            rows = rows.filter(o =>
                (o.clientName || "").toLowerCase().includes(q) ||
                (o.reference || "").toLowerCase().includes(q) ||
                (o.id || "").toLowerCase().includes(q)
            );
        }
        if (typeFilter !== "all") {
            rows = rows.filter(o => getCustomerType(o) === typeFilter);
        }
        return rows;
    }, [invoiceableOrders, search, typeFilter]);

    const handleExportCSV = () => {
        const rows = filtered.map((o, i) => ({
            "N° Facture": toInvoiceNumber(o, i),
            "Client": o.clientName || "—",
            "Type": getCustomerType(o),
            "Référence": o.reference || o.id || "—",
            "Produit": o.articleName || o.productName || "—",
            "N° Lot": o.batchNumber || "—",
            "Qté": parseInt(o.quantity) || 1,
            "Montant TTC": ((parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1)).toFixed(2),
            "Montant HT": (((parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1)) / 1.2).toFixed(2),
            "TVA 20%": (((parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1)) - (((parseFloat(o.price) || 0) * (parseInt(o.quantity) || 1)) / 1.2)).toFixed(2),
            "Statut Paiement": isPaidOrder(o) ? "Payé" : "En attente",
            "Date": o.date || "—",
            "Ville": o.clientCity || "—",
        }));
        exportToCSV(rows, `transactions-kuos-${new Date().toISOString().split("T")[0]}.csv`);
    };

    return (
        <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Transactions &amp; Factures
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">{filtered.length} transaction(s) — Commandes livrées &amp; payées</p>
                </div>
                <button
                    onClick={handleExportCSV}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg transition-colors"
                >
                    <Download className="w-4 h-4" />
                    Exporter CSV
                </button>
            </div>

            {/* Filters */}
            <div className="px-6 py-3 bg-gray-50/60 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
                {/* Search */}
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Rechercher nom client, N° commande…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                    />
                    {search && (
                        <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Type filter */}
                <select
                    value={typeFilter}
                    onChange={e => setTypeFilter(e.target.value)}
                    className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
                >
                    <option value="all">Tous les clients</option>
                    <option value="PRO">Instituts (PRO)</option>
                    <option value="RETAIL">Particuliers (RETAIL)</option>
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
                {filtered.length === 0 ? (
                    <div className="py-16 text-center text-gray-400 text-sm">
                        <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                        <p>Aucune transaction trouvée pour ces filtres.</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">N° Facture</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Produit / Lot</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Montant TTC</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Paiement</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-50">
                            {filtered.map((order, idx) => {
                                const invNum = toInvoiceNumber(order, idx);
                                const qty = parseInt(order.quantity) || 1;
                                const totalTTC = (parseFloat(order.price) || 0) * qty;
                                const paid = isPaidOrder(order);
                                const custType = getCustomerType(order);

                                return (
                                    <tr key={order.id || idx} className="hover:bg-indigo-50/30 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="text-sm font-mono font-medium text-indigo-700">{invNum}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900">{order.clientName || "—"}</span>
                                                <TypeBadge type={custType} />
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="text-sm text-gray-700">{order.articleName || order.productName || "—"}</div>
                                            {order.batchNumber && (
                                                <span className="text-xs text-emerald-600 font-mono bg-emerald-50 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                                                    Lot: {order.batchNumber}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <span className="text-sm font-bold text-gray-900">{totalTTC.toFixed(2)}</span>
                                            <span className="text-xs text-gray-400 ml-1">{store?.currency || "MAD"}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <PaymentBadge isPaid={paid} />
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-sm text-gray-500">{order.date || "—"}</span>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <button
                                                onClick={() => generateInvoicePDF(order, invNum, store)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-100"
                                            >
                                                <FileText className="w-3.5 h-3.5" />
                                                Facture PDF
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
