import { Client, IMessage } from '@stomp/stompjs';

const REPORT_SERVICE_URL = import.meta.env.VITE_REPORT_SERVICE_URL || 'http://localhost:8083';

/**
 * Derive a ws:// or wss:// URL from the HTTP base URL.
 * Required because @stomp/stompjs's brokerURL expects a WebSocket URL,
 * not an HTTP URL. e.g. http://localhost:8083 → ws://localhost:8083
 */
function toBrokerUrl(httpBase: string): string {
    return httpBase.replace(/^http(s?):\/\//, (_, s) => `ws${s}://`) + '/ws';
}

const BROKER_URL = toBrokerUrl(REPORT_SERVICE_URL);

export interface AssessmentNotification {
    event: 'REPORT_READY' | 'RECOMMENDATIONS_READY' | 'ASSESSMENT_FAILED';
    sessionId: string;
    reportId?: string;
    error?: string;
}

export const subscribeToAssessment = (
    sessionId: string,
    onMessage: (notification: AssessmentNotification) => void,
    onError?: (error: any) => void
): (() => void) => {
    const client = new Client({
        brokerURL: BROKER_URL,
        reconnectDelay: 2000,
        debug: (str) => {
            if (import.meta.env.DEV) {
                console.log('[STOMP]', str);
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
