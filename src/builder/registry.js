import HeroModern from './sections/hero/variants/HeroModern';
import HeroSplit from './sections/hero/variants/HeroSplit';
import FeaturesGlass from './sections/features/variants/FeaturesGlass';
import FeaturesMinimal from './sections/features/variants/FeaturesMinimal';
import ProductGridClassic from './sections/products/variants/ProductGridClassic';
import ProductCarousel from './sections/products/variants/ProductCarousel';
import TestimonialsGlass from './sections/testimonials/variants/TestimonialsGlass';
import FAQAccordion from './sections/faq/variants/FAQAccordion';
import ImageTextStandard from './sections/imagetext/variants/ImageTextStandard';
import ContactFormClassic from './sections/contact/variants/ContactFormClassic';

import CODReassurance from './sections/ecommerce/variants/CODReassurance';
import CountdownTimer from './sections/ecommerce/variants/CountdownTimer';
import TrustBadges from './sections/ecommerce/variants/TrustBadges';

import StatsCounter from './sections/stats/variants/StatsCounter';
import ProcessSteps from './sections/process/variants/ProcessSteps';

import HeaderGlobal from './sections/global/variants/HeaderGlobal';
import FooterGlobal from './sections/global/variants/FooterGlobal';

export const BuilderRegistry = {
    Hero: {
        variants: {
            Modern: HeroModern,
            Split: HeroSplit
        },
        defaultVariant: 'Modern'
    },
    Features: {
        variants: {
            Glass: FeaturesGlass,
            Minimal: FeaturesMinimal
        },
        defaultVariant: 'Glass'
    },
    ProductGrid: {
        variants: {
            Classic: ProductGridClassic,
            Carousel: ProductCarousel
        },
        defaultVariant: 'Classic'
    },
    Testimonials: {
        variants: {
            Glass: TestimonialsGlass
        },
        defaultVariant: 'Glass'
    },
    FAQ: {
        variants: {
            Accordion: FAQAccordion
        },
        defaultVariant: 'Accordion'
    },
    ImageText: {
        variants: {
            Standard: ImageTextStandard
        },
        defaultVariant: 'Standard'
    },
    ContactForm: {
        variants: {
            Classic: ContactFormClassic
        },
        defaultVariant: 'Classic'
    },
    CODReassurance: {
        variants: {
            Classic: CODReassurance
        },
        defaultVariant: 'Classic'
    },
    CountdownTimer: {
        variants: {
            Classic: CountdownTimer
        },
        defaultVariant: 'Classic'
    },
    TrustBadges: {
        variants: {
            Classic: TrustBadges
        },
        defaultVariant: 'Classic'
    },
    StatsCounter: {
        variants: {
            Classic: StatsCounter
        },
        defaultVariant: 'Classic'
    },
    ProcessSteps: {
        variants: {
            Classic: ProcessSteps
        },
        defaultVariant: 'Classic'
    },
    HeaderGlobal: {
        variants: {
            Classic: HeaderGlobal
        },
        defaultVariant: 'Classic'
    },
    FooterGlobal: {
        variants: {
            Classic: FooterGlobal
        },
        defaultVariant: 'Classic'
    }
};

export const getAvailableVariants = (sectionType) => {
    return BuilderRegistry[sectionType] ? Object.keys(BuilderRegistry[sectionType].variants) : [];
};
