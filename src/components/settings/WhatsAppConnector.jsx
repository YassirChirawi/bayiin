import React, { useEffect, useState } from 'react';
import { useLanguage } from "../../context/LanguageContext";
import { MessageSquare, AlertCircle, CheckCircle } from "lucide-react";
import Button from "../Button";
import { db } from "../../lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { toast } from "react-hot-toast";

export default function WhatsAppConnector({ store, setStore }) {
    const { t } = useLanguage();
    const [isSdkLoaded, setIsSdkLoaded] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // L'ID de l'application Facebook Meta
    const FACEBOOK_APP_ID = import.meta.env.VITE_FACEBOOK_APP_ID;

    // Charger dynamiquement le SDK Facebook
    useEffect(() => {
        if (!FACEBOOK_APP_ID) return;

        if (window.FB) {
            setIsSdkLoaded(true);
            return;
        }

        window.fbAsyncInit = function() {
            window.FB.init({
                appId      : FACEBOOK_APP_ID,
                cookie     : true,
                xfbml      : true,
                version    : 'v21.0'
            });
            setIsSdkLoaded(true);
        };

        (function(d, s, id){
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) {return;}
            js = d.createElement(s); js.id = id;
            js.src = "https://connect.facebook.net/fr_FR/sdk.js";
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }, [FACEBOOK_APP_ID]);

    const handleConnect = () => {
        if (!window.FB) {
            toast.error("Le SDK Facebook n'a pas pu être chargé.");
            return;
        }

        setIsConnecting(true);

        // Lancement de Meta Embedded Signup
        window.FB.login((response) => {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                
                // Appel à notre Cloud Function pour échanger le token et configurer le webhook
                exchangeTokenWithBackend(accessToken);
            } else {
                setIsConnecting(false);
                toast.error("Connexion annulée.");
            }
        }, {
            config_id: import.meta.env.VITE_FACEBOOK_CONFIG_ID || '', // Config ID depuis Meta App Dashboard
            response_type: 'code', // or token
            override_default_response_type: true,
            extras: {
                setup: {
                    // Optionnel : Pré-remplir le nom de l'entreprise
                }
            }
        });
    };

    const exchangeTokenWithBackend = async (shortLivedToken) => {
        try {
            // Appel à la Cloud Function "connectWhatsApp"
            const baseUrl = import.meta.env.VITE_API_URL || "https://us-central1-bayiin.cloudfunctions.net";
            
            const response = await fetch(`${baseUrl}/connectWhatsApp`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    storeId: store.id,
                    accessToken: shortLivedToken 
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Erreur de configuration");
            }

            // Mise à jour de l'état local (la db est déjà mise à jour par la fonction)
            setStore(prev => ({
                ...prev,
                whatsappAccessToken: data.whatsappAccessToken,
                whatsappPhoneNumberId: data.whatsappPhoneNumberId,
                whatsappWabaId: data.whatsappWabaId,
                whatsappEnabled: true
            }));

            toast.success("WhatsApp Business connecté avec succès !");
        } catch (error) {
            console.error("Erreur Embedded Signup:", error);
            toast.error(`Échec: ${error.message}`);
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!window.confirm("Voulez-vous vraiment déconnecter ce numéro WhatsApp ?")) return;
        
        try {
            await updateDoc(doc(db, "stores", store.id), {
                whatsappAccessToken: null,
                whatsappPhoneNumberId: null,
                whatsappWabaId: null,
                whatsappEnabled: false
            });
            
            setStore(prev => ({
                ...prev,
                whatsappAccessToken: null,
                whatsappPhoneNumberId: null,
                whatsappWabaId: null,
                whatsappEnabled: false
            }));
            
            toast.success("WhatsApp déconnecté.");
        } catch (err) {
            toast.error("Erreur lors de la déconnexion.");
        }
    };

    if (!FACEBOOK_APP_ID) {
        return (
            <div className="bg-amber-50 p-4 rounded-md border border-amber-100 flex gap-3">
                <AlertCircle className="text-amber-500 mt-0.5" size={20} />
                <div>
                    <h4 className="text-sm font-bold text-amber-900">Configuration Meta manquante</h4>
                    <p className="text-xs text-amber-700 mt-1">
                        L'application n'est pas configurée pour l'Embedded Signup. 
                        Veuillez configurer VITE_FACEBOOK_APP_ID.
                    </p>
                </div>
            </div>
        );
    }

    const isConnected = !!store?.whatsappPhoneNumberId;

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6">
            <div className="flex items-start justify-between">
                <div className="flex gap-4">
                    <div className={`p-3 rounded-2xl ${isConnected ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                        <MessageSquare size={28} />
                    </div>
                    <div>
                        <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                            WhatsApp Business API
                            {isConnected && <CheckCircle className="text-green-500" size={18} />}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1 max-w-lg">
                            Connectez votre propre numéro WhatsApp pour automatiser les confirmations 
                            de commande et communiquer directement avec vos clients via notre IA Beya3.
                        </p>
                    </div>
                </div>
                
                <div>
                    {!isConnected ? (
                        <Button
                            onClick={handleConnect}
                            isLoading={isConnecting || !isSdkLoaded}
                            disabled={!isSdkLoaded}
                            className="bg-[#1877F2] hover:bg-[#166FE5] border-none text-white"
                        >
                            Connecter avec Facebook
                        </Button>
                    ) : (
                        <div className="flex flex-col items-end gap-2">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                Connecté
                            </span>
                            <button 
                                onClick={handleDisconnect}
                                className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors"
                            >
                                Déconnecter
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {isConnected && (
                <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">Phone Number ID</span>
                        <span className="block text-sm font-mono text-gray-900 mt-1">{store.whatsappPhoneNumberId}</span>
                    </div>
                    <div>
                        <span className="block text-xs font-medium text-gray-500 uppercase">WABA ID</span>
                        <span className="block text-sm font-mono text-gray-900 mt-1">{store.whatsappWabaId || "Non défini"}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
