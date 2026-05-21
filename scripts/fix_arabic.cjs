const fs = require('fs');

let content = fs.readFileSync('src/locales/translations.js', 'utf8');

// Find the start of the 'ar:' block
const arIndex = content.indexOf('ar: {');

if (arIndex !== -1) {
    // Keep everything before 'ar: {'
    const beforeAr = content.substring(0, arIndex);
    
    // Create a new 'ar' block based on French, but with Arabic translations for the landing page
    const newArBlock = `ar: {
        // Landing Page - Arabic
        nav_home: "الرئيسية",
        nav_features: "المميزات",
        nav_pricing: "الأسعار",
        nav_login: "تسجيل الدخول",
        nav_signup: "ابدأ مجاناً",
        hero_badge: "نسخة جديدة 2026 متاحة",
        hero_arabic_caption: "بايعين.. باش يبقى الرزق باين والحساب باين.",
        hero_title_1: "نظم تجارتك الإلكترونية",
        hero_title_2: "بدون فوضى.",
        hero_subtitle: "المنصة المتكاملة للتجار المغاربة اللي بغاو يكبرو الخدمة بلا ما يفقدو السيطرة.",
        hero_cta_start: "ابدأ الآن",
        hero_cta_demo: "شاهد العرض",
        stats_uptime: "متاح",
        stats_support: "دعم",
        features_team_title: "فريقك،\\nقوتك.",
        features_team_subtitle: "الإعدادات والفريق",
        features_team_desc: "نسا الدفتر وملفات الإكسيل المشتركة. عطي لفريقك الأدوات باش ينجحو، مع صلاحيات دقيقة.",
        features_team_quote: "نسا الستيلو والكارني. نظم خدمتك وعرض على فريقك باش يسيرو الطلبيات.",
        features_team_list_1: "أدوار مخصصة (مدير، موظف، موزع)",
        features_team_list_2: "تتبع نشاط المستخدم",
        features_team_list_3: "أمان معزز",
        features_antiretour_title: "فلتر ضد الروتور.",
        features_antiretour_subtitle: "نقص الروتور بالواتساب",
        features_antiretour_desc: "أكد الطلبيات بضغطة وحدة عبر الواتساب. نظام كيكتاشف الكليان اللي فاللائحة السوداء أوتوماتيكيا.",
        features_antiretour_card1_title: "ملء تلقائي ذكي",
        features_antiretour_card1_desc: "يلا كان الكليان ديجا تقدى، المعلومات كتعمر بوحدها. بلا ما تكتب.",
        features_antiretour_card2_title: "قوالب الواتساب",
        features_antiretour_card2_desc: "صيفط تأكيدات بالدارجة/الفرنسية بضغطة وحدة. كينقص الروتور ب 30%.",
        features_finance_title: "المالية والأرباح.",
        features_finance_title_highlight: "واضحة وضوح الشمس.",
        features_finance_desc: "مبقاتش الضبابة... دابا كلشي باين.",
        features_finance_revenue: "المداخيل",
        features_finance_net_profit: "الربح الصافي",
        features_finance_expenses: "مجموع المصاريف",
        features_security_title: "أمان بيومتري.\\nبياناتك، قوانينك.",
        features_security_subtitle: "أمان الهاتف",
        features_security_desc: "البيانات المالية ديالك حساسة. بايعين هو تطبيق محمي ببصمة الوجه أو الأصبع.",
        pricing_title: "أسعار بسيطة.",
        pricing_subtitle: "بدا صغير، وكبر بالزربة. بلا التزام.",
        pricing_starter_desc: "للمبتدئين اللي يالاه بادين.",
        pricing_starter_period: "/شهر",
        pricing_feature_50: "50 طلبية/الشهر",
        pricing_feature_1user: "مستخدم 1",
        pricing_feature_analytics: "إحصائيات أساسية",
        pricing_cta_trial: "14 يوم تجربة مجانية",
        pricing_pro_desc: "للشركات اللي باغيا تكبر.",
        pricing_pro_popular: "الأكثر شعبية",
        pricing_feature_unlimited_orders: "طلبيات غير محدودة",
        pricing_feature_unlimited_users: "مستخدمين غير محدودين",
        pricing_feature_returns: "إدارة متقدمة للروتور",
        pricing_feature_support: "دعم واتساب ذو أولوية",
        pricing_cta_pro: "اختار خطة Pro",
        faq_title: "أسئلة متكررة",
        faq_subtitle: "كل ما تحتاج معرفته للبدء مع بايعين.",
        faq_start_q: "واش نقدر نستعمل بايعين بلا مهارات تقنية؟",
        faq_start_a: "طبعا! بايعين مصمم باش يكون ساهل وبديهي. ماكتحتاجش لمهارات برمجية. الواجهة ديالنا بسيطة وغادي نوجهوك فكل خطوة.",
        faq_multi_q: "واش نقدر نسير بزاف ديال المتاجر؟",
        faq_multi_a: "أيه، خطة Pro كتمكنك تسير متاجر متعددة من حساب واحد، مع سهولة التنقل بيناتهم.",
        faq_billing_q: "كيفاش كتتم الفوترة؟",
        faq_billing_a: "كنقدمو اشتراك شهري بسيط وشفاف. تقدر تخلص بالبطاقة المغربية أو الدولية. بلا مصاريف مخفية.",
        faq_integration_q: "واش كتربطو مع شركات التوصيل المحلية؟",
        faq_integration_a: "أيه، كدعمو الربط مع شركات الشحن الرئيسية فالمغرب باش نتأتمتو الشحنات والتتبع ديالك.",
        faq_security_q: "واش البيانات ديالي آمنة؟",
        faq_security_a: "الأمان هو أولويتنا. البيانات ديالك مشفرة ومخزنة فخوادم آمنة. كنحترمو قانون 09-08 لحماية البيانات.",
        faq_import_q: "واش نقدر نستورد منتجات من منصة أخرى؟",
        faq_import_a: "أيه، كنوفرو أداة استيراد سهلة عبر ملف CSV باش تنقل الكتالوج ديالك فبضع نقرات.",
        footer_description: "الحل المتكامل للتجار المغاربة. بسط التسيير، زيد المبيعات، ووفر الوقت.",
        footer_nav_title: "تصفح",
        footer_nav_features: "المميزات",
        footer_nav_pricing: "الأسعار",
        footer_nav_testimonials: "آراء العملاء",
        footer_nav_login: "تسجيل الدخول",
        footer_legal_title: "قانوني",
        footer_legal_privacy: "الخصوصية (قانون 09-08)",
        footer_legal_terms: "الشروط والأحكام",
        footer_legal_cookies: "ملفات تعريف الارتباط",
        footer_contact_title: "اتصل بنا",
        footer_support_avail: "دعم متوفر 7/7",
        footer_copyright: "© {year} BayIIn. جميع الحقوق محفوظة.",
        footer_made_with_love: "صنع بـ ❤️ في المغرب 🇲🇦",

        // Default Fallbacks for app (We leave them in French so it works and isn't gibberish)
        loading: "Chargement...",
        search_placeholder: "Rechercher...",
        btn_search: "Rechercher",
        btn_cancel: "Effacer",
        actions: "Actions",
        status: "Statut",
        cancel: "Annuler",
        save: "Enregistrer",
        delete: "Supprimer",
        edit: "Modifier",
        update: "Mettre à jour",
        create: "Créer",
        import: "Importer",
        export: "Exporter",
        view_details: "Voir Détails",
        confirm_delete: "Êtes-vous sûr de vouloir supprimer ceci ?",
        no_data: "Aucune donnée trouvée",
        active: "Actifs",
        trash: "Corbeille",
        yes: "Oui",
        no: "Non",
        dashboard: "Tableau de Bord",
        orders: "Commandes",
        products: "Produits",
        customers: "Clients",
        finances: "Finances",
        team: "Équipe",
        settings: "Paramètres",
        help: "Aide & Support",
        logout: "Déconnexion"
    }
};

export default translations;
`;

    // Now write it back
    fs.writeFileSync('src/locales/translations.js', beforeAr + newArBlock, 'utf8');
    console.log("Replaced the corrupt Arabic section with a fresh translated block.");
}
