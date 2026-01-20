import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateInvoice = (order, store) => {
    const doc = new jsPDF();

    // --- Header ---
    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    // Store Name
    doc.text(store?.name || "My Store", 20, 20);

    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("INVOICE", 20, 30);
    doc.text(`#${order.orderNumber}`, 20, 35);
    doc.text(`Date: ${order.date}`, 20, 40);

    // --- Customer Info (Right Side) ---
    const rightX = 140;
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Bill To:", rightX, 30);
    doc.setFontSize(10);
    doc.text(order.clientName || "Customer", rightX, 36);
    doc.text(order.clientPhone || "", rightX, 42);
    doc.text(order.clientAddress || "", rightX, 48, { maxWidth: 50 });

    // --- Table ---
    const tableColumn = ["Description", "Quantity", "Price", "Total"];
    const itemTotal = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
    const tableRows = [
        [
            `${order.articleName} (${order.size}/${order.color})`,
            order.quantity,
            `${parseFloat(order.price).toFixed(2)} DH`,
            `${itemTotal.toFixed(2)} DH`
        ]
    ];

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 65,
        theme: 'grid',
        headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
        styles: { fontSize: 10, cellPadding: 3 },
    });

    // --- Footer Totals ---
    const finalY = (doc).lastAutoTable.finalY + 10;

    doc.setFontSize(10);
    doc.text("TOTAL AMOUNT:", 140, finalY);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${itemTotal.toFixed(2)} DH`, 140, finalY + 7);

    // Footer Message
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 20, finalY + 30);

    // Save
    doc.save(`invoice_${order.orderNumber}.pdf`);
};
