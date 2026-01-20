import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import SEO from "../components/SEO";

export default function Demo() {
    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <SEO
                title="Product Demo"
                description="See how Commerce SaaS can help you manage your store, track orders, and grow your business."
            />

            {/* Navbar */}
            <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <Link to="/" className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-lg">C</span>
                            </div>
                            <span className="font-bold text-xl text-slate-900 tracking-tight">Commerce</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link to="/signup" className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-all shadow-lg shadow-indigo-200">
                                Start Free Trial <ArrowRight className="w-4 h-4" />
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">See it in action</h1>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto">
                        Take a tour of the most intuitive commerce platform. No credit card required.
                    </p>
                </div>

                {/* Screenshots Gallery */}
                <div className="space-y-24">
                    {/* Dashboard */}
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wide">
                                Dashboard
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Your entire business at a glance.</h2>
                            <p className="text-lg text-slate-500 leading-relaxed">
                                Monitor your real-time revenue, active orders, and customer growth from a single, beautiful dashboard.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    "Real-time KPI updates",
                                    "Recent order activity feed",
                                    "Visual revenue charts"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
                            <img src="https://ui.shadcn.com/dashboard-light.png" alt="Dashboard" className="w-full h-auto" />
                        </div>
                    </div>

                    {/* Orders */}
                    <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
                        <div className="flex-1 space-y-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-xs font-bold uppercase tracking-wide">
                                Order Management
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900">Process orders in seconds.</h2>
                            <p className="text-lg text-slate-500 leading-relaxed">
                                Streamline your fulfillment process. Update statuses, print invoices, and manage returns with just a few clicks.
                            </p>
                            <ul className="space-y-3">
                                {[
                                    "Bulk status updates",
                                    "One-click invoice generation",
                                    "Advanced filtering and search"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3 text-slate-700 font-medium">
                                        <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="flex-1 rounded-2xl border border-slate-200 shadow-2xl overflow-hidden bg-white">
                            <img src="https://ui.shadcn.com/tasks-light.png" alt="Orders" className="w-full h-auto" />
                        </div>
                    </div>
                </div>

                {/* Bottom CTA */}
                <div className="mt-32 text-center bg-indigo-600 rounded-3xl p-12 md:p-20 text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
                    <div className="relative z-10">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to start your journey?</h2>
                        <p className="text-indigo-100 text-lg mb-8 max-w-xl mx-auto">
                            Join thousands of merchants growing their business with Commerce SaaS.
                        </p>
                        <Link to="/signup" className="inline-flex items-center gap-2 px-8 py-4 bg-white text-indigo-600 rounded-full font-bold text-lg hover:bg-indigo-50 transition-colors shadow-xl">
                            Start 14-Day Free Trial <ArrowRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}
