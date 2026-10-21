import { Client, IMessage } from '@stomp/stompjs';
import { supabase } from '../lib/supabase';

const REPORT_SERVICE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_REPORT_SERVICE_URL) || 'http://localhost:8083';

/**
 * Derive a ws:// or wss:// URL from the HTTP base URL.
 * Required because @stomp/stompjs's brokerURL expects a WebSocket URL,
 * not an HTTP URL. e.g. http://localhost:8083 → ws://localhost:8083
 */
export function toBrokerUrl(httpBase: string): string {
    return httpBase.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`) + '/ws';
}

const BROKER_URL = toBrokerUrl(REPORT_SERVICE_URL);

export interface AssessmentNotification {
    event: 'REPORT_READY' | 'RECOMMENDATIONS_READY' | 'ASSESSMENT_FAILED';
    sessionId: string;
    reportId?: string;
    error?: string;
}

/**
 * Builds STOMP connect headers using a learner Supabase access token.
 * Never supply anon key or service role key here.
 */
export function buildStompConnectHeaders(accessToken?: string | null): Record<string, string> {
    if (!accessToken || !accessToken.trim()) {
        throw new Error('Valid access token is required for STOMP authentication');
    }
    return {
        Authorization: `Bearer ${accessToken.trim()}`,
    };
}

/**
 * Checks if a STOMP broker error indicates an authentication/authorization rejection.
 */
export function isAuthError(message?: string, body?: string): boolean {
    const combined = `${message || ''} ${body || ''}`.toLowerCase();
    return (
        combined.includes('denied') ||
        combined.includes('auth') ||
        combined.includes('token') ||
        combined.includes('credential') ||
        combined.includes('forbidden') ||
        combined.includes('unauthorized') ||
        combined.includes('accessdenied')
    );
}

export const subscribeToAssessment = (
    sessionId: string,
    onMessage: (notification: AssessmentNotification) => void,
    onError?: (error: any) => void
): (() => void) => {
    let authFailureCount = 0;

    const client = new Client({
        brokerURL: BROKER_URL,
        reconnectDelay: 2000,
        beforeConnect: async () => {
            try {
                // If previous attempt failed for auth reasons, refresh the session once before retry
                if (authFailureCount === 1) {
                    console.log('[STOMP] Refreshing session after auth failure before retry');
                    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
                    if (refreshError || !refreshData?.session?.access_token) {
                        const err = refreshError || new Error('Failed to refresh Supabase session');
                        console.warn('[STOMP] Session refresh failed:', err);
                        client.deactivate();
                        if (onError) onError(err);
                        throw err;
                    }
                    client.connectHeaders = buildStompConnectHeaders(refreshData.session.access_token);
                    return;
                }

                // Normal connection: get current session
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session?.access_token) {
                    const authError = new Error('No active Supabase session for WebSocket connection');
                    console.warn('[STOMP] Connection aborted: missing or expired authentication session');
                    client.deactivate();
                    if (onError) onError(authError);
                    throw authError;
                }
                client.connectHeaders = buildStompConnectHeaders(session.access_token);
            } catch (err) {
                if (onError) onError(err);
                client.deactivate();
                throw err;
            }
        },
        debug: (str) => {
            if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
                // Sanitize any Bearer access tokens before logging
                const sanitized = str.replace(/Bearer\s+[^\r\n\s]+/gi, 'Bearer [REDACTED]');
                console.log('[STOMP]', sanitized);
            }
        },
        onConnect: () => {
            authFailureCount = 0; // Reset consecutive auth failures upon successful connection
            console.log(`[STOMP] Connected to report-service. Subscribing to /topic/assessment/${sessionId}`);
            client.subscribe(`/topic/assessment/${sessionId}`, (message: IMessage) => {
                try {
                    const data: AssessmentNotification = JSON.parse(message.body);
                    console.log(`[STOMP] Received notification on /topic/assessment/${sessionId}:`, data);
                    onMessage(data);
                } catch (err) {
                    console.error('[STOMP] Failed to parse message body:', message.body, err);
                }
            });
        },
        onStompError: async (frame) => {
            const message = frame.headers['message'] || '';
            const body = frame.body || '';
            console.error('[STOMP] Broker error:', message, body);

            if (isAuthError(message, body)) {
                authFailureCount++;
                console.warn(`[STOMP] Auth failure detected (attempt ${authFailureCount}/2)`);
                if (authFailureCount >= 2) {
                    console.error('[STOMP] Consecutive auth failures reached limit. Deactivating client.');
                    client.deactivate();
                    if (onError) onError(new Error(`WebSocket authentication failed after retry: ${message}`));
                    return;
                }
                // Proactively refresh session token for the retry
                try {
                    const { data } = await supabase.auth.refreshSession();
                    if (data?.session?.access_token) {
                        client.connectHeaders = buildStompConnectHeaders(data.session.access_token);
                    }
                } catch {
                    // Ignored - beforeConnect will also attempt refresh
                }
            } else {
                // Network or non-auth broker error: keep reconnectDelay active
                if (onError) onError(frame);
            }
        },
        onWebSocketError: (event) => {
            console.error('[STOMP] WebSocket error:', event);
            if (onError) onError(event);
        },
    });

    client.activate();

    return () => {
        console.log(`[STOMP] Deactivating client for session ${sessionId}`);
        client.deactivate();
    };
};
