import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toBrokerUrl, buildStompConnectHeaders } from '../websocket';

describe('Frontend WebSocket Authentication & URL Derivation', () => {
    it('converts http and https base URLs to ws:// and wss:// broker URLs', () => {
        assert.equal(toBrokerUrl('http://localhost:8083'), 'ws://localhost:8083/ws');
        assert.equal(toBrokerUrl('https://api.cadence.com'), 'wss://api.cadence.com/ws');
        assert.equal(toBrokerUrl('http://127.0.0.1:8083'), 'ws://127.0.0.1:8083/ws');
    });

    it('builds STOMP connectHeaders with Authorization Bearer prefix', () => {
        const mockAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.mock';
        const headers = buildStompConnectHeaders(mockAccessToken);

        assert.deepEqual(headers, {
            Authorization: `Bearer ${mockAccessToken}`,
        });
    });

    it('trims leading/trailing whitespace around access token', () => {
        const headers = buildStompConnectHeaders('  jwt.token.here  ');
        assert.equal(headers.Authorization, 'Bearer jwt.token.here');
    });

    it('fails closed when token is missing, null, undefined, or empty', () => {
        assert.throws(() => buildStompConnectHeaders(null), {
            name: 'Error',
            message: 'Valid access token is required for STOMP authentication',
        });

        assert.throws(() => buildStompConnectHeaders(undefined), {
            name: 'Error',
            message: 'Valid access token is required for STOMP authentication',
        });

        assert.throws(() => buildStompConnectHeaders(''), {
            name: 'Error',
            message: 'Valid access token is required for STOMP authentication',
        });

        assert.throws(() => buildStompConnectHeaders('   '), {
            name: 'Error',
            message: 'Valid access token is required for STOMP authentication',
        });
    });

    it('matches the header format expected by report-service StompSecurityInterceptor', () => {
        const testToken = 'valid-learner-token-123';
        const headers = buildStompConnectHeaders(testToken);

        // Interceptor inspects accessor.getFirstNativeHeader("Authorization")
        // and checks if authHeader.startsWith("Bearer ")
        const authHeader = headers['Authorization'];
        assert.ok(authHeader.startsWith('Bearer '));
        const extracted = authHeader.substring('Bearer '.length).trim();
        assert.equal(extracted, testToken);
    });
});
