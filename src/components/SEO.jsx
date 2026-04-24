import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, image, url }) {
    const siteTitle = "BayIIn";
    const fullTitle = title ? `${title} | ${siteTitle}` : siteTitle;
    const siteDescription = "بايعين - La plateforme n°1 pour le e-commerce local au Maroc. Gérez vos commandes, livreurs et finances en toute simplicité.";

    return (
        <Helmet>
            <title>{fullTitle}</title>
            <meta name="description" content={description || siteDescription} />
            <meta name="keywords" content={keywords || "commerce, saas, orders, management, business"} />

            {/* Open Graph */}
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={description || siteDescription} />
            <meta property="og:type" content="website" />
            <meta property="og:url" content={url || window.location.href} />
            {image && <meta property="og:image" content={image} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={description || siteDescription} />
            {image && <meta name="twitter:image" content={image} />}
        </Helmet>
    );
}
