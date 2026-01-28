import { useState } from "react";
import { Upload, X, FileText, Check, AlertCircle } from "lucide-react";
import Button from "./Button";
import { parseCSV } from "../utils/csvHelper";

export default function ImportModal({ isOpen, onClose, onImport, title = "Import Data", templateHeaders = [] }) {
    const [file, setFile] = useState(null);
    const [previewData, setPreviewData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    if (!isOpen) return null;

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        if (selectedFile.type !== "text/csv" && !selectedFile.name.endsWith(".csv")) {
            setError("Please upload a valid CSV file.");
            return;
        }

        setFile(selectedFile);
        setError(null);
        setLoading(true);

        try {
            const data = await parseCSV(selectedFile);
            if (data.length === 0) {
                setError("The CSV file is empty.");
                setFile(null);
            } else {
                setPreviewData(data);
                // Simple validation: check if first row has required keys
                if (templateHeaders.length > 0) {
                    const fileHeaders = Object.keys(data[0]);
                    const missing = templateHeaders.filter(h => !fileHeaders.includes(h));
                    if (missing.length > 0) {
                        setError(`Missing required columns: ${missing.join(", ")}`);
                    }
                }
            }
        } catch (err) {
            setError("Failed to parse CSV file.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!previewData.length) return;
        setLoading(true);
        try {
            await onImport(previewData);
            onClose();
            setFile(null);
            setPreviewData([]);
        } catch (err) {
            setError("Import failed. Check console for details.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                        <X className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6">
                    {!file ? (
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:bg-gray-50 transition-colors">
                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="mt-4 flex text-sm text-gray-600 justify-center">
                                <label
                                    htmlFor="file-upload"
                                    className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none"
                                >
                                    <span>Upload a CSV file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-2">CSV files only</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                        <p className="text-xs text-gray-500">{previewData.length} records found</p>
                                    </div>
                                </div>
                                <button onClick={() => { setFile(null); setPreviewData([]); setError(null); }} className="text-gray-400 hover:text-red-500">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    {error}
                                </div>
                            )}

                            {!error && previewData.length > 0 && (
                                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg text-sm">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50 sticky top-0">
                                            <tr>
                                                {Object.keys(previewData[0]).slice(0, 5).map(header => (
                                                    <th key={header} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{header}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {previewData.slice(0, 5).map((row, i) => (
                                                <tr key={i}>
                                                    {Object.values(row).slice(0, 5).map((cell, j) => (
                                                        <td key={j} className="px-3 py-2 whitespace-nowrap text-gray-500">{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {previewData.length > 5 && (
                                        <div className="px-3 py-2 text-center text-xs text-gray-500 bg-gray-50 border-t">
                                            ...and {previewData.length - 5} more rows
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="px-6 flex justify-end">
                    <button
                        onClick={() => {
                            const headers = templateHeaders.length > 0 ? templateHeaders : ["Client", "Phone", "Product", "Quantity", "Price", "Cost Price", "Status", "Date"];
                            const csvContent = headers.join(",") + "\n" + headers.map(() => "").join(","); // Empty row example
                            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                            const link = document.createElement("a");
                            const url = URL.createObjectURL(blob);
                            link.setAttribute("href", url);
                            link.setAttribute("download", "import_template.csv");
                            link.style.visibility = 'hidden';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                    >
                        <FileText className="h-4 w-4" />
                        Download Sample CSV
                    </button>
                </div>

                <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t border-gray-100">
                    <Button variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!file || !!error || loading}
                        isLoading={loading}
                        icon={Check}
                    >
                        Import {previewData.length > 0 ? `${previewData.length} Items` : ''}
                    </Button>
                </div>
            </div>
        </div>
    );
}
