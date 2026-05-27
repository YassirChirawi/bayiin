import HeroModern from './sections/hero/variants/HeroModern';
import HeroSplit from './sections/hero/variants/HeroSplit';
import FeaturesGlass from './sections/features/variants/FeaturesGlass';
import FeaturesMinimal from './sections/features/variants/FeaturesMinimal';
import ProductGridClassic from './sections/products/variants/ProductGridClassic';
import TestimonialsGlass from './sections/testimonials/variants/TestimonialsGlass';
import FAQAccordion from './sections/faq/variants/FAQAccordion';
import ImageTextStandard from './sections/imagetext/variants/ImageTextStandard';
import ContactFormClassic from './sections/contact/variants/ContactFormClassic';

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
            Classic: ProductGridClassic
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
    }
};

export const getAvailableVariants = (sectionType) => {
    return BuilderRegistry[sectionType] ? Object.keys(BuilderRegistry[sectionType].variants) : [];
};
