import HeroModern from './sections/hero/variants/HeroModern';
import HeroSplit from './sections/hero/variants/HeroSplit';
import HeroBlocks from './sections/hero/variants/HeroBlocks';
import HeroVideoFullScreen from './sections/hero/variants/HeroVideoFullScreen';
import HeroMarketplace from './sections/hero/variants/HeroMarketplace';
import HeroProductFocus from './sections/hero/variants/HeroProductFocus';
import FeaturesGlass from './sections/features/variants/FeaturesGlass';
import FeaturesMinimal from './sections/features/variants/FeaturesMinimal';
import FeaturesBlocks from './sections/features/variants/FeaturesBlocks';
import FeaturesBento from './sections/features/variants/FeaturesBento';
import FeaturesTimeline from './sections/features/variants/FeaturesTimeline';
import ImageTextBlocks from './sections/imagetext/variants/ImageTextBlocks';
import ImageTextAlternated from './sections/imagetext/variants/ImageTextAlternated';
import ImageTextStandard from './sections/imagetext/variants/ImageTextStandard';
import ProductGridClassic from './sections/products/variants/ProductGridClassic';
import ProductCarousel from './sections/products/variants/ProductCarousel';
import TestimonialsGlass from './sections/testimonials/variants/TestimonialsGlass';
import TestimonialsSlider from './sections/testimonials/variants/TestimonialsSlider';
import TestimonialsMasonry from './sections/testimonials/variants/TestimonialsMasonry';
import FAQAccordion from './sections/faq/variants/FAQAccordion';
import ContactFormClassic from './sections/contact/variants/ContactFormClassic';
import CODReassurance from './sections/ecommerce/variants/CODReassurance';
import CountdownTimer from './sections/ecommerce/variants/CountdownTimer';
import TrustBadges from './sections/ecommerce/variants/TrustBadges';
import StatsCounter from './sections/stats/variants/StatsCounter';
import ProcessSteps from './sections/process/variants/ProcessSteps';
import HeaderGlobal from './sections/global/variants/HeaderGlobal';
import HeaderTransparent from './sections/global/variants/HeaderTransparent';
import HeaderCentered from './sections/global/variants/HeaderCentered';
import FooterGlobal from './sections/global/variants/FooterGlobal';
import CustomHTML from './sections/custom/CustomHTML';

export const BuilderRegistry = {
    Hero: {
        variants: {
            Modern: HeroModern,
            Split: HeroSplit,
            Blocks: HeroBlocks,
            VideoFullScreen: HeroVideoFullScreen,
            Marketplace: HeroMarketplace,
            ProductFocus: HeroProductFocus
        },
        defaultVariant: 'Modern'
    },
    Features: {
        variants: {
            Glass: FeaturesGlass,
            Minimal: FeaturesMinimal,
            Blocks: FeaturesBlocks,
            Bento: FeaturesBento,
            Timeline: FeaturesTimeline
        },
        defaultVariant: 'Blocks'
    },
    ImageText: {
        variants: {
            Blocks: ImageTextBlocks,
            Alternated: ImageTextAlternated,
            Standard: ImageTextStandard
        },
        defaultVariant: 'Blocks'
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
            Glass: TestimonialsGlass,
            Slider: TestimonialsSlider,
            Masonry: TestimonialsMasonry
        },
        defaultVariant: 'Slider'
    },
    FAQ: {
        variants: {
            Accordion: FAQAccordion
        },
        defaultVariant: 'Accordion'
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
            Global: HeaderGlobal,
            Transparent: HeaderTransparent,
            Centered: HeaderCentered
        },
        defaultVariant: 'Global'
    },
    FooterGlobal: {
        variants: {
            Classic: FooterGlobal
        },
        defaultVariant: 'Classic'
    },
    CustomHTML: {
        variants: {
            Blocks: CustomHTML
        },
        defaultVariant: 'Blocks'
    }
};

export const getAvailableVariants = (sectionType) => {
    return BuilderRegistry[sectionType] ? Object.keys(BuilderRegistry[sectionType].variants) : [];
};
