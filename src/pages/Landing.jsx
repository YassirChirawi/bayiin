import { ArrowRight, BarChart3, Check, Globe, RefreshCw, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "../components/SEO";
import Newsletter from "../components/Newsletter";

export default function Landing() {
    return (
        <div className="bg-white min-h-screen font-sans text-slate-900">
            <SEO
                title="Home"
                description="Launch your online store in minutes. The Commerce SaaS platform for modern businesses."
            />
            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">C</span>
                            </div>
                            <span className="font-bold text-xl tracking-tight">Commerce</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                            <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
                            <a href="#pricing" className="hover:text-indigo-600 transition-colors">Pricing</a>
                            <a href="#testimonials" className="hover:text-indigo-600 transition-colors">Testimonials</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors">
                                Log in
                            </Link>
                            <Link to="/signup" className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-200">
                                Get Started <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-sm font-medium mb-8">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                    </span>
                    New: Advanced Analytics Dashboard
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-indigo-800 to-slate-900 pb-2">
                    Manage your store <br className="hidden md:block" /> with superpowers.
                </h1>
                <p className="text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
                    The all-in-one platform to track orders, manage customers, and grow your business. Simple enough for beginners, powerful enough for enterprises.
                </p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 px-4">
                    <Link to="/signup" className="w-full sm:w-auto px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold text-lg transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2">
                        Start Free Trial
                    </Link>
                    <Link to="/demo" className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-full font-semibold text-lg transition-all flex items-center justify-center gap-2">
                        View Demo
                    </Link>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-500">
                    <span className="flex h-2 w-2 rounded-full bg-indigo-500"></span>
                    Available on mobile very soon! 📱
                </div>

                {/* Hero Image / Dashboard Preview */}
                <div className="mt-16 relative mx-auto max-w-5xl">
                    <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl blur opacity-20 animate-pulse"></div>
                    <div className="relative rounded-2xl border border-slate-200 bg-slate-50/50 p-2 backdrop-blur-sm">
                        <img
                            src="/hero-dashboard.png"
                            alt="App Dashboard"
                            className="rounded-xl shadow-2xl border border-slate-200 w-full"
                        />
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Everything you need to scale</h2>
                        <p className="text-slate-500 max-w-2xl mx-auto">Stop juggling spreadsheets and multiple tools. Get everything in one place.</p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: <BarChart3 className="w-6 h-6 text-indigo-600" />,
                                title: "Real-time Analytics",
                                description: "Track revenue, orders, and customer growth as it happens with beautiful interactive charts."
                            },
                            {
                                icon: <RefreshCw className="w-6 h-6 text-indigo-600" />,
                                title: "Automated Workflows",
                                description: "Save time with automated order status updates and customer notifications."
                            },
                            {
                                icon: <Globe className="w-6 h-6 text-indigo-600" />,
                                title: "Global Selling",
                                description: "Multi-currency support and localized checkout experiences for international customers."
                            },
                            {
                                icon: <Shield className="w-6 h-6 text-indigo-600" />,
                                title: "Enterprise Security",
                                description: "Bank-grade encryption and secure data handling to keep your business safe."
                            },
                            {
                                icon: <Zap className="w-6 h-6 text-indigo-600" />,
                                title: "Lightning Fast",
                                description: "Optimized for speed. No loading screens, no waiting. Just instant action."
                            },
                            {
                                icon: <Globe className="w-6 h-6 text-indigo-600" />,
                                title: "24/7 Support",
                                description: "Our dedicated support team is always here to help you solve any issues."
                            }
                        ].map((feature, i) => (
                            <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-6">
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
                        <p className="text-slate-500">No hidden fees. Cancel anytime.</p>
                    </div>
                    <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                        <div className="bg-white p-8 rounded-3xl border border-slate-200">
                            <h3 className="text-lg font-medium text-slate-500 mb-4">Starter</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold">79</span>
                                <span className="text-xl font-bold">DH</span>
                                <span className="text-slate-500">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    "Up to 50 orders/month",
                                    "Basic Analytics",
                                    "Email Support",
                                    "1 Team Member",
                                    "14-Day Free Trial"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-600">
                                        <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="block w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-900 text-center rounded-xl font-semibold transition-colors">
                                Start 14-Day Free Trial
                            </Link>
                        </div>
                        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-indigo-500 text-xs font-bold px-3 py-1 rounded-bl-xl">POPULAR</div>
                            <h3 className="text-lg font-medium text-indigo-200 mb-4">Pro</h3>
                            <div className="flex items-baseline gap-1 mb-8">
                                <span className="text-4xl font-bold">179</span>
                                <span className="text-xl font-bold">DH</span>
                                <span className="text-slate-400">/month</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                {[
                                    "Unlimited Orders",
                                    "Advanced Analytics & Export",
                                    "Priority 24/7 Support",
                                    "Unlimited Team Members",
                                    "Custom Domain"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-300">
                                        <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link to="/signup" className="block w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-center rounded-xl font-semibold transition-colors shadow-lg shadow-indigo-900/20">
                                Get Pro
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Newsletter / Waiting List */}
            <Newsletter />

            {/* Footer */}
            <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <div className="flex items-center gap-2 mb-6">
                                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">C</span>
                                </div>
                                <span className="font-bold text-xl">Commerce</span>
                            </div>
                            <p className="text-slate-500 text-sm">
                                Empowering businesses to grow without limits. The modern commerce OS.
                            </p>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Product</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-indigo-600">Features</a></li>
                                <li><a href="#" className="hover:text-indigo-600">Pricing</a></li>
                                <li><a href="#" className="hover:text-indigo-600">Roadmap</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Company</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-indigo-600">About</a></li>
                                <li><a href="#" className="hover:text-indigo-600">Careers</a></li>
                                <li><a href="#" className="hover:text-indigo-600">Contact</a></li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold mb-4">Legal</h4>
                            <ul className="space-y-2 text-sm text-slate-500">
                                <li><a href="#" className="hover:text-indigo-600">Privacy</a></li>
                                <li><a href="#" className="hover:text-indigo-600">Terms</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="pt-8 border-t border-slate-200 text-center text-sm text-slate-500">
                        © {new Date().getFullYear()} Commerce SaaS. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
