import { createContext, useContext, useState, useEffect } from 'react';
import { fetchSettings } from '../services/supabaseService';

const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);

    const refreshSettings = async () => {
        try {
            const data = await fetchSettings();
            // Transformar array de key-value a objeto plano si es necesario, 
            // pero fetchSettings ya suele devolver un objeto { [key]: value } 
            // basado en lo que vi en supabaseService.js
            setSettings(data || {});
        } catch (err) {
            console.error('Error fetching global settings:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshSettings();
    }, []);

    return (
        <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
            {children}
        </SettingsContext.Provider>
    );
}

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};
