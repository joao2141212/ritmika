import { createClient } from '@supabase/supabase-js'
import { logger } from './logger'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Configuração Supabase ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.')
}

const nativeFetch = globalThis.fetch.bind(globalThis)

const safeRequestPath = (input) => {
  try {
    const rawUrl = typeof input === 'string' ? input : input?.url
    return new URL(rawUrl, globalThis.location?.origin || 'http://localhost').pathname
  } catch {
    return 'unknown'
  }
}

const tracedFetch = async (input, init = {}) => {
  const correlationId = logger.createCorrelationId()
  const headers = new Headers(
    init.headers || (typeof input !== 'string' ? input?.headers : undefined),
  )
  const method = init.method || (typeof input !== 'string' ? input?.method : undefined) || 'GET'
  const route = safeRequestPath(input)
  const startedAt = Date.now()

  headers.set('x-ritmika-correlation-id', correlationId)
  headers.set('x-ritmika-client', 'ritmika-web')

  try {
    const response = await nativeFetch(input, { ...init, headers })

    if (!response.ok) {
      const level = response.status >= 500 ? 'error' : 'warn'
      logger[level]({
        file: 'client/src/lib/supabase.js',
        function: 'tracedFetch',
        operation: 'supabase.http',
        layer: 'client-data',
        status: level,
        errorCode: `SUPABASE_HTTP_${response.status}`,
        correlationId,
        route,
        method,
        httpStatus: response.status,
        durationMs: Date.now() - startedAt,
        requestId:
          response.headers.get('x-request-id') ||
          response.headers.get('x-sb-request-id') ||
          null,
      })
    }

    return response
  } catch (error) {
    logger.error({
      file: 'client/src/lib/supabase.js',
      function: 'tracedFetch',
      operation: 'supabase.http',
      layer: 'client-data',
      status: 'error',
      errorCode: 'SUPABASE_NETWORK_ERROR',
      correlationId,
      route,
      method,
      durationMs: Date.now() - startedAt,
      error,
    })
    throw error
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: tracedFetch,
    headers: {
      'x-ritmika-client': 'ritmika-web',
    },
  },
})
