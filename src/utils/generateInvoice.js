import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper to load image
const loadImage = (url) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = url;
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(e);
    });
};

export const generateInvoice = async (order, store) => {
    const doc = new jsPDF();
    let startY = 20;

    // --- Header ---
    // Logo & Store Info (Top Left)
    if (store?.logoUrl) {
        try {
            const img = await loadImage(store.logoUrl);
            const logoWidth = 25;
            const aspectRatio = img.width / img.height;
            const logoHeight = logoWidth / aspectRatio;

            doc.addImage(img, 'JPEG', 20, 20, logoWidth, logoHeight);

            // Store Name below logo
            doc.setFontSize(16);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            doc.text(store?.name || "My Store", 20, 20 + logoHeight + 8);

            startY = 20 + logoHeight + 20; // Update Y position for next elements if needed
        } catch (err) {
            console.warn("Error loading logo:", err);
            // Fallback
            doc.setFontSize(22);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(40, 40, 40);
            doc.text(store?.name || "My Store", 20, 20);
        }
    } else {
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 40);
        doc.text(store?.name || "My Store", 20, 20);
    }

    // Invoice Meta (Top Right)
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);

    // Align to right
    const rightX = 140;
    doc.text("INVOICE", rightX, 30);
    doc.text(`#${order.orderNumber}`, rightX, 35);
    doc.text(`Date: ${order.date}`, rightX, 40);

    // Bill To (Below Meta)
    doc.setFontSize(11);
    doc.setTextColor(40, 40, 40);
    doc.text("Bill To:", rightX, 55);
    doc.setFontSize(10);
    doc.text(order.clientName || "Customer", rightX, 61);
    if (order.clientPhone) doc.text(order.clientPhone, rightX, 67);
    if (order.clientAddress) doc.text(order.clientAddress, rightX, 73, { maxWidth: 50 });

    // --- Table ---
    const tableStartY = Math.max(startY, 85); // Ensure we don't overlap header

    const tableColumn = ["Description", "Quantity", "Price", "Total"];
    const itemTotal = (parseFloat(order.price) || 0) * (parseInt(order.quantity) || 1);
    const shippingCost = parseFloat(order.shippingCost) || 0;
    const grandTotal = itemTotal + shippingCost;

    const tableRows = [
        [
            `${order.articleName} (${order.size}/${order.color})`,
            order.quantity,
            `${parseFloat(order.price).toFixed(2)} DH`,
            `${itemTotal.toFixed(2)} DH`
        ]
    ];

    if (shippingCost > 0) {
        tableRows.push([
            "Frais de Livraison",
            "1",
            `${shippingCost.toFixed(2)} DH`,
            `${shippingCost.toFixed(2)} DH`
        ]);
    }

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: tableStartY,
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
    doc.text(`${grandTotal.toFixed(2)} DH`, 140, finalY + 7);

    // Footer Message
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Thank you for your business!", 20, finalY + 30);

    // Save
    doc.save(`invoice_${order.orderNumber}.pdf`);
};
