import Papa from 'papaparse';

/**
 * Export data to CSV
 * @param {Array} data - Array of objects to export
 * @param {String} filename - Name of the file (without .csv)
 * @param {Array} headers - Optional array of header names. If null, keys of first object are used.
 */
export const exportToCSV = (data, filename = 'export', headers = null) => {
    if (!data || !data.length) return;

    // Format data if needed (flatten objects etc, but PapaParse handles basics well)
    // For specific fields, the caller maps the data first preferably.

    // Explicit headers handling if provided
    let csvData = data;
    if (headers) {
        // Just rely on PapaParse to unzip if array of arrays, or map to object with header keys
        // Simplest: The Caller passes an array of simple flat objects matching the desired headers.
    }

    const csv = Papa.unparse(csvData, {
        quotes: true, // Quote all strings
        header: true
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

/**
 * Parse CSV File
 * @param {File} file 
 * @returns {Promise<Array>} Parsed data
 */
export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    // console.warn("CSV Parse Errors:", results.errors);
                    // Resolve with what we have, or reject? Let's resolve with data content.
                }
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};
