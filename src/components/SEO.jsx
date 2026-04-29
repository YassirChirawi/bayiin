import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, image, url, type = "website" }) {
    const siteTitle = "BayIIn";
    const fullTitle = title ? `${title} | ${siteTitle}` : `${siteTitle} — Plateforme e-commerce Maroc`;
    const siteDescription = description || "BayIIn, la plateforme tout-en-un pour gérer votre boutique en ligne au Maroc. Commandes, livraisons, finances et WhatsApp en un seul endroit.";
    const siteUrl = url || (typeof window !== 'undefined' ? window.location.href : "https://bayiin.shop");
    const siteImage = image || "https://bayiin.shop/og-image.png";

    return (
        <Helmet>
            {/* Essentiels */}
            <title>{fullTitle}</title>
            <meta name="description" content={siteDescription} />
            <meta name="keywords" content={keywords || "gestion commandes maroc, logiciel e-commerce maroc, suivi livraison whatsapp maroc, tableau de bord boutique en ligne, sendit olivraison integration, gestion stock boutique maroc, saas ecommerce maroc"} />
            <meta name="robots" content="index, follow" />
            <link rel="canonical" href={siteUrl} />
            <meta name="author" content="BayIIn" />
            <meta name="language" content="fr-MA" />

            {/* Open Graph */}
            <meta property="og:site_name" content="BayIIn" />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={siteDescription} />
            <meta property="og:type" content={type} />
            <meta property="og:url" content={siteUrl} />
            <meta property="og:image" content={siteImage} />
            <meta property="og:image:width" content="1200" />
            <meta property="og:image:height" content="630" />
            <meta property="og:locale" content="fr_MA" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:site" content="@bayiin" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={siteDescription} />
            <meta name="twitter:image" content={siteImage} />

            {/* Schema.org JSON-LD */}
            <script type="application/ld+json">{JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "BayIIn",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web, iOS, Android",
                "description": siteDescription,
                "url": "https://bayiin.shop",
                "offers": {
                    "@type": "Offer",
                    "price": "0",
                    "priceCurrency": "MAD"
                },
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.8",
                    "ratingCount": "120"
                }
            })}</script>
        </Helmet>
    );
}
