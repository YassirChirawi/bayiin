const fs = require('fs');
let content = fs.readFileSync('src/pages/Settings.jsx', 'utf8');

const correctStart = `import { Link } from "react-router-dom";

export default function Settings() {
    const { store, setStore } = useTenant();
    const { t } = useLanguage(); // NEW

    const [activeTab, setActiveTab] = useState("general");
    const [loading, setLoading] = useState(null); // 'starter' | 'pro' | null
    const { uploadImage, uploading, error: uploadError } = useImageUpload();
    const { runReconciliation, isRecalculating } = useReconciliation(store?.id);

    const [isValidatingPayment, setIsValidatingPayment] = useState(false);
`;

// Replace lines 29 up to the tabs definition with the correctStart
const index1 = content.indexOf('export default function Settings() {');
if (index1 !== -1) {
    const index2 = content.indexOf('const tabs = useMemo', index1);
    if (index2 !== -1) {
        content = content.substring(0, index1 - 38) + correctStart + "\n    " + content.substring(index2);
    }
}
fs.writeFileSync('src/pages/Settings.jsx', content);
console.log('Fixed');
