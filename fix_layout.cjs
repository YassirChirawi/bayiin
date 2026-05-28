const fs = require('fs');
const path = require('path');
const file = path.join('src', 'pages', 'HybridStoreBuilder.jsx');
let content = fs.readFileSync(file, 'utf8');

// Replace layout class
content = content.replace(
    '<div className="h-[calc(100vh-6rem)] -m-4 md:-m-8 bg-slate-200 overflow-hidden relative flex flex-col">',
    '<div className="h-screen w-screen bg-slate-200 overflow-hidden relative flex flex-col">'
);

// We also need to add 'useNavigate' and a 'Quitter' button.
if (!content.includes('useNavigate')) {
    content = content.replace(
        'import { useHistory } from \'../builder/hooks/useHistory\';',
        'import { useHistory } from \'../builder/hooks/useHistory\';\nimport { useNavigate } from \'react-router-dom\';'
    );
}

// add `const navigate = useNavigate();`
content = content.replace(
    'const { store } = useTenant();',
    'const { store } = useTenant();\n    const navigate = useNavigate();'
);

// Add 'Quitter' button before the AlignLeft button
content = content.replace(
    '<AlignLeft size={20} />\n                    </button>\n                    <div className="h-6 w-px bg-slate-200 mx-1"></div>',
    '<AlignLeft size={20} />\n                    </button>\n                    <div className="h-6 w-px bg-slate-200 mx-1"></div>\n                    <button onClick={() => navigate(\'/dashboard\')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"><ChevronLeft size={16} /> Quitter</button>\n                    <div className="h-6 w-px bg-slate-200 mx-1"></div>'
);

// also fix the loader which is using h-[calc(100vh-6rem)]
content = content.replace(
    '<div className="h-[calc(100vh-6rem)] flex items-center justify-center">',
    '<div className="h-screen flex items-center justify-center">'
);

fs.writeFileSync(file, content);
