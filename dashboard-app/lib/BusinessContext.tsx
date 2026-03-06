'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface Business {
    id: string;
    name: string;
    logo_url: string | null;
}

interface BusinessContextType {
    activeBusinessId: string | null;
    setActiveBusinessId: (id: string) => void;
    businesses: Business[];
    setBusinesses: (businesses: Business[]) => void;
    isLoading: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

export function BusinessProvider({ children }: { children: ReactNode }) {
    const [activeBusinessId, setActiveBusinessIdState] = useState<string | null>(null);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize from cookie on mount
    useEffect(() => {
        const getCookie = (name: string) => {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop()?.split(';').shift();
            return null;
        };

        const savedId = getCookie('active_business_id');
        if (savedId) {
            setActiveBusinessIdState(savedId);
        }

        // Fetch user's businesses
        fetch('/api/businesses')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.businesses) {
                    setBusinesses(data.businesses);
                    // If no cookie or invalid cookie, set first business as default
                    if (!savedId || !data.businesses.find((b: Business) => b.id === savedId)) {
                        if (data.businesses.length > 0) {
                            const defaultId = data.businesses[0].id;
                            setActiveBusinessIdState(defaultId);
                            document.cookie = `active_business_id=${defaultId}; path=/; max-age=31536000; SameSite=Lax`;
                        }
                    }
                }
            })
            .finally(() => setIsLoading(false));
    }, []);

    const setActiveBusinessId = (id: string) => {
        setActiveBusinessIdState(id);
        document.cookie = `active_business_id=${id}; path=/; max-age=31536000; SameSite=Lax`;
        // Refresh the page or trigger a data reload to update all components
        window.location.reload();
    };

    return (
        <BusinessContext.Provider
            value={{
                activeBusinessId,
                setActiveBusinessId,
                businesses,
                setBusinesses,
                isLoading
            }}
        >
            {children}
        </BusinessContext.Provider>
    );
}

export function useBusiness() {
    const context = useContext(BusinessContext);
    if (context === undefined) {
        throw new Error('useBusiness must be used within a BusinessProvider');
    }
    return context;
}
