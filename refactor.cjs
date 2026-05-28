const fs = require('fs');
const path = require('path');
const file = path.join('src', 'pages', 'HybridStoreBuilder.jsx');
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
/const updateSection = \(id, updates\) => \{[\s\S]*?\n    \};\n/m,
`const updateSection = (id, updates) => {
        markUnsaved();
        setStorefrontData(prev => {
            if (id === 'global-header' || id === 'global-footer') {
                const globalKey = id === 'global-header' ? 'header' : 'footer';
                return { ...prev, global: { ...prev.global, [globalKey]: { ...prev.global[globalKey], ...updates } } };
            }
            const currentSections = prev.pages[currentPage]?.sections || [];
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: currentSections.map(s => s.id === id ? { ...s, ...updates } : s)
                    }
                }
            };
        });
    };
`
);

content = content.replace(
/const updateSectionSetting = \(id, key, value\) => \{[\s\S]*?\n    \};\n/m,
`const updateSectionSetting = (id, key, value) => {
        markUnsaved();
        setStorefrontData(prev => {
            if (id === 'global-header' || id === 'global-footer') {
                const globalKey = id === 'global-header' ? 'header' : 'footer';
                return { ...prev, global: { ...prev.global, [globalKey]: { ...prev.global[globalKey], settings: { ...(prev.global[globalKey].settings || {}), [key]: value } } } };
            }
            const currentSections = prev.pages[currentPage]?.sections || [];
            return {
                ...prev,
                pages: {
                    ...prev.pages,
                    [currentPage]: {
                        ...prev.pages[currentPage],
                        sections: currentSections.map(s => s.id === id ? { ...s, settings: { ...s.settings, [key]: value } } : s)
                    }
                }
            };
        });
    };
`
);

content = content.replace(
/const updateSectionInline = \(id, updates\) => \{[\s\S]*?\n    \};\n/m,
`const updateSectionInline = (id, updates) => {
        updateSection(id, updates);
    };
`
);

fs.writeFileSync(file, content);
