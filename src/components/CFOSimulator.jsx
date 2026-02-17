import { useState, useEffect } from "react";
import { TrendingUp, DollarSign, Activity, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import Button from "./Button";
import { generateAIResponse } from "../services/aiService";

export default function CFOSimulator({ currentStats, onAiAnalysis }) {
    // Sliders State (Percentage changes)
    const [scenarios, setScenarios] = useState({
        adSpend: 0, // 0% change
        price: 0,   // 0% change
        cogs: 0,    // 0% change (improvement means negative value)
    });

    const [projections, setProjections] = useState(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    // Calculate Projections on change
    useEffect(() => {
        if (!currentStats) return;

        // Base values
        const baseRevenue = parseFloat(currentStats.realizedRevenue) || 0;
        const baseAds = parseFloat(currentStats.totalAds) || 0; // Need to ensure this is passed or derived
        const baseCOGS = parseFloat(currentStats.totalCOGS) || 0;
        const baseShipping = parseFloat(currentStats.totalShipping) || 0;
        const baseOrders = parseInt(currentStats.orderCount) || 1;
        const baseProfit = parseFloat(currentStats.netResult) || 0;

        // 1. Ad Spend Impact
        // Assumption: ROAS stays roughly constant for small changes, but decays for large increases
        // Decay factor: for every +100% spend, efficiency drops by 10% (heuristic)
        const newAdSpend = baseAds * (1 + scenarios.adSpend / 100);
        let roasEfficiency = 1;
        if (scenarios.adSpend > 0) {
            roasEfficiency = Math.max(0.5, 1 - (scenarios.adSpend / 100) * 0.1);
        }

        // Revenue scales with Ads (if Ads > 0), otherwise linear? 
        // If Base Ads is 0, we can't simulate ad scaling easily without a baseline ROAS.
        // Fallback: If Ads=0, assume organic growth isn't affected by this slider.
        let projectedRevenue = baseRevenue;
        if (baseAds > 0) {
            // New Revenue = (New Spend * Base ROAS * Efficiency) + Organic(assumed 0 for simplification or detached)
            // Let's keep it simple: Revenue scales with spend * efficiency
            const baseROAS = baseRevenue / baseAds;
            projectedRevenue = newAdSpend * baseROAS * roasEfficiency;
        }

        // 2. Price Impact
        // Assumption: Price increase drops conversion rate.
        // Elasticity: +10% price -> -10% volume (Unit Elasticity for simplicity, usually higher)
        // New Price = Old Avg Price * (1 + change)
        const priceFactor = 1 + scenarios.price / 100;
        const conversionDrop = 1 / (1 + scenarios.price / 100); // Simple demand curve: Revenue stays constant-ish? No/
        // Actually, let's assume Volume drops by factor matching price increase
        // Volume = Base Volume * (1 - elasticity * change)
        // Elasticity 1.5
        const volumeChange = -1.5 * (scenarios.price / 100);
        const newVolumeFactor = Math.max(0.1, 1 + volumeChange);

        // Re-calculate Revenue based on Volume * NewPrice
        // projectedRevenue (from Ads) represents "Potential Revenue at old price".
        // Now apply price/volume effect.
        const finalRevenue = projectedRevenue * newVolumeFactor * priceFactor;

        // 3. Costs
        // Shipping scales with Volume
        const finalShipping = baseShipping * (newVolumeFactor * (newAdSpend / (baseAds || 1))); // approximate scaling by ads too

        // COGS scales with Volume AND COGS change
        const cogsFactor = 1 + scenarios.cogs / 100;
        const finalCOGS = baseCOGS * (newVolumeFactor * (newAdSpend / (baseAds || 1))) * cogsFactor;

        // Net Profit
        const finalProfit = finalRevenue - newAdSpend - finalCOGS - finalShipping;
        const finalMargin = (finalProfit / finalRevenue) * 100;

        setProjections({
            revenue: finalRevenue,
            profit: finalProfit,
            margin: finalMargin,
            adSpend: newAdSpend,
            volumeFactor: newVolumeFactor * (newAdSpend / (baseAds || 1))
        });

    }, [scenarios, currentStats]);

    const handleAnalyze = async () => {
        setLoadingAnalysis(true);
        try {
            await onAiAnalysis(scenarios, projections);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAnalysis(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-50 to-white px-6 py-4 border-b border-indigo-100 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <Activity className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900">Simulateur CFO</h3>
                        <p className="text-xs text-gray-500">Analysez l'impact de vos décisions (What-If)</p>
                    </div>
                </div>
                <div className="hidden sm:block">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        Beta (IA)
                    </span>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controls */}
                <div className="space-y-6 lg:col-span-1 border-r border-gray-100 pr-0 lg:pr-6">
                    {/* Ad Spend Slider */}
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                            <span>Budget Publicitaire (Ads)</span>
                            <span className={scenarios.adSpend >= 0 ? "text-green-600" : "text-red-600"}>
                                {scenarios.adSpend > 0 ? '+' : ''}{scenarios.adSpend}%
                            </span>
                        </label>
                        <input
                            type="range" min="-50" max="200" step="10"
                            value={scenarios.adSpend}
                            onChange={(e) => setScenarios({ ...scenarios, adSpend: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Impact: Revenu (ROAS) & Volume</p>
                    </div>

                    {/* Price Slider */}
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                            <span>Prix de Vente</span>
                            <span className={scenarios.price >= 0 ? "text-green-600" : "text-red-600"}>
                                {scenarios.price > 0 ? '+' : ''}{scenarios.price}%
                            </span>
                        </label>
                        <input
                            type="range" min="-30" max="50" step="5"
                            value={scenarios.price}
                            onChange={(e) => setScenarios({ ...scenarios, price: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Impact: Marge & Conversion (Élasticité)</p>
                    </div>

                    {/* COGS Slider */}
                    <div>
                        <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                            <span>Coût Produit (COGS)</span>
                            <span className={scenarios.cogs <= 0 ? "text-green-600" : "text-red-600"}>
                                {scenarios.cogs > 0 ? '+' : ''}{scenarios.cogs}%
                            </span>
                        </label>
                        <input
                            type="range" min="-30" max="30" step="5"
                            value={scenarios.cogs}
                            onChange={(e) => setScenarios({ ...scenarios, cogs: parseInt(e.target.value) })}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <p className="text-xs text-gray-400 mt-1">Impact: Marge Nette</p>
                    </div>

                    <div className="pt-4">
                        <Button
                            onClick={() => setScenarios({ adSpend: 0, price: 0, cogs: 0 })}
                            variant="secondary"
                            size="sm"
                            className="w-full justify-center"
                            icon={RefreshCw}
                        >
                            Réinitialiser
                        </Button>
                    </div>
                </div>

                {/* Results Visualization */}
                <div className="lg:col-span-2 space-y-6">
                    {projections && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {/* Revenue Card */}
                            <div className={`p-4 rounded-xl border ${projections.revenue >= (parseFloat(currentStats.realizedRevenue) || 0) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-sm text-gray-500 font-medium">Chiffre d'Affaires Projeté</p>
                                <p className={`text-2xl font-bold mt-1 ${projections.revenue >= (parseFloat(currentStats.realizedRevenue) || 0) ? 'text-green-700' : 'text-red-700'}`}>
                                    {projections.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })} DH
                                </p>
                                <div className="text-xs mt-1 flex justify-between">
                                    <span>Actuel: {(parseFloat(currentStats.realizedRevenue) || 0).toLocaleString()}</span>
                                    <span className="font-bold">
                                        {projections.revenue >= (parseFloat(currentStats.realizedRevenue) || 0) ? '+' : ''}
                                        {((projections.revenue - (parseFloat(currentStats.realizedRevenue) || 0)) / (parseFloat(currentStats.realizedRevenue) || 1) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Profit Card */}
                            <div className={`p-4 rounded-xl border ${projections.profit >= (parseFloat(currentStats.netResult) || 0) ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-sm text-gray-500 font-medium">Profit Net Projeté</p>
                                <p className={`text-2xl font-bold mt-1 ${projections.profit >= (parseFloat(currentStats.netResult) || 0) ? 'text-green-700' : 'text-red-700'}`}>
                                    {projections.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })} DH
                                </p>
                                <div className="text-xs mt-1 flex justify-between">
                                    <span>Actuel: {(parseFloat(currentStats.netResult) || 0).toLocaleString()}</span>
                                    <span className="font-bold">
                                        {projections.profit >= (parseFloat(currentStats.netResult) || 0) ? '+' : ''}
                                        {((projections.profit - (parseFloat(currentStats.netResult) || 0)) / (Math.abs(parseFloat(currentStats.netResult)) || 1) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>

                            {/* Margin Card */}
                            <div className={`p-4 rounded-xl border ${projections.margin >= (parseFloat(currentStats.margin) || 0) ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                                <p className="text-sm text-gray-500 font-medium">Marge Nette %</p>
                                <p className="text-2xl font-bold text-gray-800 mt-1">
                                    {projections.margin.toFixed(1)}%
                                </p>
                                <div className="text-xs mt-1 flex justify-between text-gray-500">
                                    <span>Actuel: {currentStats.margin}%</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* AI Analysis Button */}
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex justify-between items-center">
                            <div>
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-indigo-600" />
                                    L'avis du CFO (IA)
                                </h4>
                                <p className="text-sm text-gray-500">Demandez à Beya3 d'analyser la viabilité de ce scénario.</p>
                            </div>
                            <Button
                                onClick={handleAnalyze}
                                isLoading={loadingAnalysis}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                Analyser Risques
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
