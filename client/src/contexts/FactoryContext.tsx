import React, { createContext, useContext, useState, useEffect } from 'react';
import { Factory } from '../types/factory';
import api from '../api/api';
import { useAuth } from './AuthContext';

interface FactoryContextType {
    factories: Factory[];
    currentFactory: Factory | null;
    setCurrentFactory: (factory: Factory) => void;
    isLoading: boolean;
    refreshFactories: () => Promise<void>;
}

const FactoryContext = createContext<FactoryContextType | undefined>(undefined);

export const FactoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    console.log('FactoryProvider: Mounting...');
    const { user, isAuthenticated } = useAuth();
    const [factories, setFactories] = useState<Factory[]>([]);
    const [currentFactory, setCurrentFactoryState] = useState<Factory | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    // Helper to safely set factory and persist ID
    const setCurrentFactory = (factory: Factory) => {
        setCurrentFactoryState(factory);
        localStorage.setItem('activeFactoryId', factory._id);
        // Reload window to ensure all API calls use new header? 
        // Or just rely on context updates if axios interceptor is dynamic.
        // Ideally axios interceptor reads from localStorage dynamically.
    };

    const refreshFactories = async () => {
        if (!isAuthenticated || !user) {
            setFactories([]);
            setCurrentFactoryState(null);
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            // We assume user object has factories populated or we fetch them
            // If user object from AuthContext already has factories, use them.
            // But AuthContext might not have full factory details, just IDs.
            // Let's verify what /api/auth/me returns or if we need a new endpoint.
            // For now, let's assume we can fetch allowed factories.
            // Since we don't have a specific endpoint for "my factories", we might need to rely on the User object
            // or create an endpoint.

            // OPTION: Fetch user details again with populates
            const response = await api.get('/api/auth/me');
            console.log('FactoryContext: /api/auth/me response:', response.data);

            // Handle both structure possibilities just in case
            const fullUser = response.data.user || response.data;

            if (fullUser && fullUser.factories && Array.isArray(fullUser.factories)) {
                console.log('FactoryContext: Factories found:', fullUser.factories.length);
                // Assuming factories are populated in the response
                setFactories(fullUser.factories);

                // Determine active factory
                const storedId = localStorage.getItem('activeFactoryId');
                const storedFactory = fullUser.factories.find((f: any) => f._id === storedId);
                const defaultFactory = fullUser.factories.find((f: any) => f._id === fullUser.defaultFactory) || fullUser.factories[0];

                if (storedFactory) {
                    setCurrentFactoryState(storedFactory);
                } else if (defaultFactory) {
                    setCurrentFactory(defaultFactory);
                }
            } else {
                console.warn('FactoryContext: No factories found in user object', fullUser);
            }
        } catch (error) {
            console.error('Failed to load factories', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        console.log('FactoryProvider: User changed', {
            isAuthenticated,
            hasUser: !!user,
            factoriesCount: user?.factories?.length,
            factories: user?.factories
        });
        refreshFactories();
    }, [isAuthenticated, user]);

    return (
        <FactoryContext.Provider value={{ factories, currentFactory, setCurrentFactory, isLoading, refreshFactories }}>
            {children}
        </FactoryContext.Provider>
    );
};

export const useFactory = () => {
    const context = useContext(FactoryContext);
    if (context === undefined) {
        throw new Error('useFactory must be used within a FactoryProvider');
    }
    return context;
};
