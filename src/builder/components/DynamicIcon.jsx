import React from 'react';
import {
    ShoppingCart, ShoppingBag, Package, PackageCheck, PackageOpen, Box, Boxes, Store, Tag, Tags, Barcode, QrCode, Receipt, CreditCard, Wallet, Banknote, Coins, DollarSign, TrendingUp, BarChart2,
    Truck, Plane, Ship, Train, Bike, Car, MapPin, Map, Navigation, Route, ArrowRight, MoveRight, PackagePlus, PackageMinus, Send, SendHorizonal, Milestone, Timer, Clock, AlarmClock,
    Shield, ShieldCheck, ShieldAlert, Lock, LockKeyhole, Key, KeyRound, Fingerprint, BadgeCheck, Award, Medal, Trophy, Star, StarHalf, ThumbsUp, CheckCircle, CheckCircle2, CircleCheck, Check, CheckSquare,
    MessageCircle, MessageSquare, MessagesSquare, Mail, MailOpen, Phone, PhoneCall, PhoneIncoming, Headphones, HeadphoneOff, Bell, BellRing, BellDot, Info, HelpCircle, LifeBuoy, Zap, ZapOff, Radio, Wifi,
    User, Users, UserCheck, UserPlus, UserCircle, Heart, HeartHandshake, Handshake, Share2, Share, Link, ExternalLink, Globe, Globe2, Instagram, Facebook, Twitter, Youtube,
    Sun, Moon, Leaf, Flower, Flower2, TreePine, Palmtree, Sunrise, Sunset, Cloud, Sparkles, Gem, Diamond, Crown, Feather, Wind, Droplets, Flame, Snowflake,
    Home, Building, Building2, Landmark, Sofa, Lamp, LampDesk, Bed, Bath, Shirt, Glasses, Watch, Scissors, Palette, Brush, PenTool, Pencil, Edit3,
    Apple, Coffee, Soup, Sandwich, Pizza, Salad, Cookie, Candy, Wine, Beer, Activity, Stethoscope, Pill, Thermometer, Dumbbell, PersonStanding, Baby, Smile,
    Smartphone, Laptop, Monitor, Tablet, Printer, Camera, Video, Mic, Volume2, Speaker, Cpu, Database, Server, Code, Terminal, Settings, Sliders, ToggleLeft, Gauge,
    Gift, PartyPopper, Rocket, Lightbulb, Magnet, Target, Crosshair, Focus, Eye, EyeOff, Bookmark, Flag, Ribbon, Ticket, Percent, Hash, AtSign, Asterisk, Plus
} from 'lucide-react';

export const LUCIDE_MAP = {
    // E-Commerce
    ShoppingCart, ShoppingBag, Package, PackageCheck, PackageOpen, Box, Boxes, Store, Tag, Tags, Barcode, QrCode, Receipt, CreditCard, Wallet, Banknote, Coins, DollarSign, TrendingUp, BarChart2,
    // Livraison & Logistique
    Truck, Plane, Ship, Train, Bike, Car, MapPin, Map, Navigation, Route, ArrowRight, MoveRight, PackagePlus, PackageMinus, Send, SendHorizonal, Milestone, Timer, Clock, AlarmClock,
    // Paiement & Sécurité
    Shield, ShieldCheck, ShieldAlert, Lock, LockKeyhole, Key, KeyRound, Fingerprint, BadgeCheck, Award, Medal, Trophy, Star, StarHalf, ThumbsUp, CheckCircle, CheckCircle2, CircleCheck, Check, CheckSquare,
    // Support & Communication
    MessageCircle, MessageSquare, MessagesSquare, Mail, MailOpen, Phone, PhoneCall, PhoneIncoming, Headphones, HeadphoneOff, Bell, BellRing, BellDot, Info, HelpCircle, LifeBuoy, Zap, ZapOff, Radio, Wifi,
    // Utilisateurs & Social
    User, Users, UserCheck, UserPlus, UserCircle, Heart, HeartHandshake, Handshake, Share2, Share, Link, ExternalLink, Globe, Globe2, Instagram, Facebook, Twitter, Youtube,
    // Nature & Maroc
    Sun, Moon, Leaf, Flower, Flower2, TreePine, Palmtree, Sunrise, Sunset, Cloud, Sparkles, Gem, Diamond, Crown, Feather, Wind, Droplets, Flame, Snowflake,
    // Maison & Style
    Home, Building, Building2, Landmark, Sofa, Lamp, LampDesk, Bed, Bath, Shirt, Glasses, Watch, Scissors, Palette, Brush, PenTool, Pencil, Edit3,
    // Nourriture & Santé
    Apple, Coffee, Soup, Sandwich, Pizza, Salad, Cookie, Candy, Wine, Beer, Activity, Stethoscope, Pill, Thermometer, Dumbbell, PersonStanding, Baby, Smile,
    // Tech & Business
    Smartphone, Laptop, Monitor, Tablet, Printer, Camera, Video, Mic, Volume2, Speaker, Cpu, Database, Server, Code, Terminal, Settings, Sliders, ToggleLeft, Gauge,
    // Divers
    Gift, PartyPopper, Rocket, Lightbulb, Magnet, Target, Crosshair, Focus, Eye, EyeOff, Bookmark, Flag, Ribbon, Ticket, Percent, Hash, AtSign, Asterisk, Plus
};

// Helper for generic color parsing
const resolveColor = (colorCode) => {
    if (!colorCode) return 'currentColor';
    if (colorCode === 'primary') return 'var(--color-primary, #4f46e5)'; // Example generic fallback
    if (colorCode === 'secondary') return 'var(--color-secondary, #64748b)';
    if (colorCode === 'white') return '#ffffff';
    return colorCode; // HEX or specific color
};

const DynamicIcon = ({
    icon,           // L'objet icon complet du schéma item
    className = '',
    override        // Overrides optionnels (size, color)
}) => {
    // Si la donnée est passée à l'ancienne (string direct), on l'enveloppe
    const iconObj = typeof icon === 'string' ? { type: 'lucide', value: icon } : icon;

    if (!iconObj || iconObj.type === 'none') return null;

    const size = override?.size || iconObj.size || 24;
    const color = resolveColor(override?.color || iconObj.color);

    // Wrapper avec background optionnel
    const WrapperStyle = iconObj.background?.enabled ? {
        background: iconObj.background.color || '#f1f5f9',
        borderRadius: iconObj.background.shape === 'circle' ? '50%'
            : iconObj.background.shape === 'square' ? '0'
            : '8px',
        padding: iconObj.background.padding || 12,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    } : { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 };

    const content = (() => {
        switch (iconObj.type) {
            case 'lucide':
                const LucideIcon = LUCIDE_MAP[iconObj.value];
                return LucideIcon
                    ? <LucideIcon size={size} color={color} strokeWidth={1.5} />
                    : <Package size={size} color={color} />; // fallback

            case 'emoji':
                return (
                    <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>
                        {iconObj.value}
                    </span>
                );

            case 'custom':
                return (
                    <img
                        src={iconObj.value}
                        alt="custom icon"
                        width={size}
                        height={size}
                        style={{ 
                            objectFit: 'contain', 
                            filter: iconObj.color && iconObj.color !== 'original' ? 'opacity(1)' : 'none',
                            width: size,
                            height: size
                        }}
                    />
                );

            default:
                // Fallback for older schema where type might be missing but string is Lucide
                const FallbackIcon = LUCIDE_MAP[iconObj.value];
                if (FallbackIcon) {
                    return <FallbackIcon size={size} color={color} strokeWidth={1.5} />;
                }
                return null;
        }
    })();

    return (
        <div style={WrapperStyle} className={className}>
            {content}
        </div>
    );
};

export default DynamicIcon;
