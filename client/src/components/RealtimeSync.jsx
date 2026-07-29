import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { invalidateServerState } from '../lib/serverState';
import { logger } from '../lib/logger';

const FALLBACK_INTERVAL_MS = 60_000;

const RealtimeSync = () => {
    const { user } = useAuth();
    const workspaceId = user?.workspace_id;

    useEffect(() => {
        if (!workspaceId) return undefined;

        let active = true;
        let fallbackTimer;
        const topic = `workspace:${workspaceId}`;

        const stopFallback = () => {
            if (fallbackTimer) window.clearInterval(fallbackTimer);
            fallbackTimer = undefined;
        };

        const startFallback = (reason) => {
            if (fallbackTimer) return;
            logger.warn({
                file: 'client/src/components/RealtimeSync.jsx',
                function: 'startFallback',
                operation: 'realtime.polling_fallback',
                layer: 'client-data',
                status: 'degraded',
                errorCode: 'REALTIME_BROADCAST_UNAVAILABLE',
                workspaceId,
                reason,
                intervalMs: FALLBACK_INTERVAL_MS,
            });
            fallbackTimer = window.setInterval(() => {
                if (document.visibilityState === 'visible' && navigator.onLine) {
                    void invalidateServerState('realtime.polling_fallback', { workspaceId });
                }
            }, FALLBACK_INTERVAL_MS);
        };

        const channel = supabase.channel(topic, { config: { private: true } });
        channel
            .on('broadcast', { event: 'INSERT' }, (payload) => {
                void invalidateServerState('realtime.broadcast', { workspaceId, event: 'INSERT', table: payload?.payload?.table });
            })
            .on('broadcast', { event: 'UPDATE' }, (payload) => {
                void invalidateServerState('realtime.broadcast', { workspaceId, event: 'UPDATE', table: payload?.payload?.table });
            })
            .on('broadcast', { event: 'DELETE' }, (payload) => {
                void invalidateServerState('realtime.broadcast', { workspaceId, event: 'DELETE', table: payload?.payload?.table });
            });

        void supabase.realtime.setAuth().then(() => {
            if (!active) return;
            channel.subscribe((status, error) => {
                if (status === 'SUBSCRIBED') {
                    stopFallback();
                    logger.info({
                        file: 'client/src/components/RealtimeSync.jsx',
                        function: 'subscribe',
                        operation: 'realtime.broadcast_subscribe',
                        layer: 'client-data',
                        status: 'ok',
                        workspaceId,
                    });
                    return;
                }

                if (['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(status)) {
                    logger.error({
                        file: 'client/src/components/RealtimeSync.jsx',
                        function: 'subscribe',
                        operation: 'realtime.broadcast_subscribe',
                        layer: 'client-data',
                        status: 'error',
                        errorCode: `REALTIME_${status}`,
                        workspaceId,
                        error,
                    });
                    startFallback(status);
                }
            });
        }).catch((error) => {
            logger.error({
                file: 'client/src/components/RealtimeSync.jsx',
                function: 'setAuth',
                operation: 'realtime.authenticate',
                layer: 'client-data',
                status: 'error',
                errorCode: 'REALTIME_AUTH_FAILED',
                workspaceId,
                error,
            });
            startFallback('AUTH_FAILED');
        });

        return () => {
            active = false;
            stopFallback();
            void supabase.removeChannel(channel);
        };
    }, [workspaceId]);

    return null;
};

export default RealtimeSync;
