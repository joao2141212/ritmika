import { useCallback, useEffect, useState } from 'react';
import { parityService } from '../services/checklistProducaoService';
import { logger } from '../lib/logger';

export const usePlatformAdmin = () => {
    const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
    const [loadingPlatformAccess, setLoadingPlatformAccess] = useState(true);

    const refreshPlatformAccess = useCallback(async () => {
        try {
            setLoadingPlatformAccess(true);
            setIsPlatformAdmin(await parityService.isPlatformAdmin());
        } catch (error) {
            setIsPlatformAdmin(false);
            logger.error({
                fn: 'usePlatformAdmin.refreshPlatformAccess',
                status: 'error',
                errorCode: error?.code || 'PLATFORM_ACCESS_CHECK_FAILED',
                error: error instanceof Error ? error.message : String(error),
            });
        } finally {
            setLoadingPlatformAccess(false);
        }
    }, []);

    useEffect(() => {
        refreshPlatformAccess();
    }, [refreshPlatformAccess]);

    return { isPlatformAdmin, loadingPlatformAccess, refreshPlatformAccess };
};
