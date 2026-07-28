import { useEffect } from 'react';
import { logger } from '../lib/logger';

// Centraliza o estado de conectividade para que operações offline não sejam silenciosas.
const OfflineSync = () => {
    useEffect(() => {
        const reportConnectivity = (source) => {
            const online = typeof navigator === 'undefined' ? true : navigator.onLine;
            const event = {
                file: 'client/src/components/OfflineSync.jsx',
                function: 'OfflineSync.reportConnectivity',
                operation: 'offline.connectivity',
                status: online ? 'success' : 'degraded',
                errorCode: online ? 'ONLINE' : 'OFFLINE_DETECTED',
                online,
                source,
            };

            logger[online ? 'info' : 'warn'](event);
            window.dispatchEvent(new CustomEvent('ritmika:offline-status', {
                detail: { online, at: new Date().toISOString(), source },
            }));
        };

        const handleOnline = () => reportConnectivity('browser-online');
        const handleOffline = () => reportConnectivity('browser-offline');

        reportConnectivity('mount');
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return null;
};

export default OfflineSync;
