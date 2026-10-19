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

export const subscribeToAssessment = (
    sessionId: string,
    onMessage: (notification: AssessmentNotification) => void,
    onError?: (error: any) => void
): (() => void) => {
    const client = new Client({
        brokerURL: BROKER_URL,
        reconnectDelay: 2000,
        beforeConnect: async () => {
            try {
                // Obtain current Supabase access token using established session pattern
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error || !session?.access_token) {
                    const authError = new Error('No active Supabase session for WebSocket connection');
                    console.warn('[STOMP] Connection aborted: missing or expired authentication session');
                    if (onError) onError(authError);
                    client.deactivate();
                    throw authError;
                }
                // Dynamically update connectHeaders on initial connection and reconnects
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
        onStompError: (frame) => {
            console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
            if (onError) onError(frame);
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

