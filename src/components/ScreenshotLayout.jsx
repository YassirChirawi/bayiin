
import React, { createContext, useContext, useState } from "react";
import Sidebar from "./Sidebar";
import { Toaster } from 'react-hot-toast';

// MOCK AUTH
const AuthContext = createContext();
const MockAuthProvider = ({ children }) => {
    return (
        <AuthContext.Provider value={{ user: { uid: 'demo-user', email: 'demo@bayiin.com' }, logout: () => console.log('logout'), loading: false }}>
            {children}
        </AuthContext.Provider>
    );
};
// We need to override the import in Sidebar, but we can't easily without module mocking.
// However, Sidebar imports from "../context/AuthContext".
// If we cannot change the import, we must rely on the fact that Context uses the Provider.
// BUT, Sidebar imports the Context object from the real file.
// So we must use the REAL contexts' Providers, but pass MOCK values.

import { AuthContext as RealAuthContext } from "../context/AuthContext";
import { TenantContext as RealTenantContext } from "../context/TenantContext";

export default function ScreenshotLayout({ children }) {
    // Mock Store
    const mockStore = {
        id: 'demo-store',
        name: 'BayIIn Demo',
        role: 'owner',
        currency: 'MAD',
        olivraisonApiKey: 'demo-key',
        subscription: 'pro'
    };

    const mockStores = [mockStore];

    return (
        <RealAuthContext.Provider value={{ user: { uid: 'demo' }, logout: () => { }, loading: false }}>
            <RealTenantContext.Provider value={{
                store: mockStore,
                stores: mockStores,
                loading: false,
                setStore: () => { },
                refreshTenant: () => { }
            }}>
                <div className="flex h-screen bg-slate-50 overflow-hidden">
                    <Sidebar isOpen={true} />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {/* Fake Header if needed, or just padding */}
                        <main className="flex-1 overflow-y-auto p-4 md:p-8">
                            {children}
                        </main>
                    </div>
                </div>
            </RealTenantContext.Provider>
        </RealAuthContext.Provider>
    );
}
