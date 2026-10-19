package com.cadence.report.security;

import com.cadence.report.config.StompSecurityInterceptor;
import com.cadence.report.repository.AssessmentSessionRepository;
import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.context.ActiveProfiles;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

@SpringBootTest
@ActiveProfiles("test")
public class ReportWebSocketSecurityIntegrationTest {

    private static final String TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    private static final String TEST_ISSUER = "https://auth.test.cadence.ai/auth/v1";
    private static final String TEST_AUDIENCE = "authenticated";

    @Autowired
    private StompSecurityInterceptor interceptor;

    @Autowired
    private AssessmentSessionRepository sessionRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private MessageChannel mockChannel;

    private UUID learnerAId;
    private UUID learnerBId;
    private UUID sessionAId;
    private UUID sessionBId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM assessment_sessions");

        learnerAId = UUID.randomUUID();
        learnerBId = UUID.randomUUID();
        sessionAId = UUID.randomUUID();
        sessionBId = UUID.randomUUID();

        jdbcTemplate.update(
                "INSERT INTO assessment_sessions (id, user_id, status) VALUES (?, ?, ?)",
                sessionAId, learnerAId, "completed"
        );
        jdbcTemplate.update(
                "INSERT INTO assessment_sessions (id, user_id, status) VALUES (?, ?, ?)",
                sessionBId, learnerBId, "completed"
        );

        mockChannel = mock(MessageChannel.class);
    }

    private String createToken(UUID userId, String email, String role, long expirySeconds) {
        SecretKey key = Keys.hmacShaKeyFor(TEST_SECRET.getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId.toString())
                .claim("email", email)
                .claim("role", role)
                .issuer(TEST_ISSUER)
                .audience().add(TEST_AUDIENCE).and()
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plusSeconds(expirySeconds)))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    @Test
    @DisplayName("STOMP CONNECT without credentials is rejected")
    void testConnectWithoutCredentialsRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(message, mockChannel)
        );
        assertTrue(ex.getMessage().contains("Missing authorization"));
    }

    @Test
    @DisplayName("STOMP CONNECT with invalid/expired token is rejected")
    void testConnectWithInvalidTokenRejected() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer invalid-jwt-token");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(message, mockChannel)
        );
        assertTrue(ex.getMessage().contains("Invalid or expired"));
    }

    @Test
    @DisplayName("STOMP CONNECT with valid learner token sets authenticated principal")
    void testConnectWithValidTokenAccepted() {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.addNativeHeader("Authorization", "Bearer " + tokenA);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        Message<?> result = interceptor.preSend(message, mockChannel);
        assertNotNull(result);

        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);
        assertNotNull(resultAccessor.getUser());
        assertTrue(resultAccessor.getUser() instanceof CadenceLearnerAuthenticationToken);

        CadenceLearnerAuthenticationToken authToken = (CadenceLearnerAuthenticationToken) resultAccessor.getUser();
        assertEquals(learnerAId, authToken.getPrincipal().userId());
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE to own session topic is authorized")
    void testSubscribeToOwnSessionAuthorized() {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);

        // 1. Connect
        StompHeaderAccessor connectAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connectAccessor.addNativeHeader("Authorization", "Bearer " + tokenA);
        Message<?> connectMsg = interceptor.preSend(MessageBuilder.createMessage(new byte[0], connectAccessor.getMessageHeaders()), mockChannel);

        // 2. Subscribe to sessionA (owned by learnerA)
        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/assessment/" + sessionAId);
        subAccessor.setUser(StompHeaderAccessor.wrap(connectMsg).getUser());
        Message<byte[]> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        Message<?> subResult = interceptor.preSend(subMsg, mockChannel);
        assertNotNull(subResult);
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE by Learner A to Learner B's session topic is rejected (cross-user isolation)")
    void testSubscribeToOtherLearnerSessionRejected() {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);

        // Connect as Learner A
        StompHeaderAccessor connectAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connectAccessor.addNativeHeader("Authorization", "Bearer " + tokenA);
        Message<?> connectMsg = interceptor.preSend(MessageBuilder.createMessage(new byte[0], connectAccessor.getMessageHeaders()), mockChannel);

        // Attempt subscribe to sessionB (owned by learnerB)
        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/assessment/" + sessionBId);
        subAccessor.setUser(StompHeaderAccessor.wrap(connectMsg).getUser());
        Message<byte[]> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(subMsg, mockChannel)
        );
        assertTrue(ex.getMessage().contains("does not belong to the authenticated learner"));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE to nonexistent session is rejected")
    void testSubscribeToNonexistentSessionRejected() {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);
        UUID randomSessionId = UUID.randomUUID();

        StompHeaderAccessor connectAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connectAccessor.addNativeHeader("Authorization", "Bearer " + tokenA);
        Message<?> connectMsg = interceptor.preSend(MessageBuilder.createMessage(new byte[0], connectAccessor.getMessageHeaders()), mockChannel);

        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/assessment/" + randomSessionId);
        subAccessor.setUser(StompHeaderAccessor.wrap(connectMsg).getUser());
        Message<byte[]> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(subMsg, mockChannel)
        );
        assertTrue(ex.getMessage().contains("does not belong to the authenticated learner"));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE without authentication is rejected")
    void testSubscribeWithoutAuthRejected() {
        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/assessment/" + sessionAId);
        Message<byte[]> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(subMsg, mockChannel)
        );
        assertTrue(ex.getMessage().contains("requires authenticated learner"));
    }

    @Test
    @DisplayName("STOMP SUBSCRIBE to unauthorized destination is rejected")
    void testSubscribeToUnauthorizedDestinationRejected() {
        String tokenA = createToken(learnerAId, "learnerA@cadence.ai", "authenticated", 3600);

        StompHeaderAccessor connectAccessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        connectAccessor.addNativeHeader("Authorization", "Bearer " + tokenA);
        Message<?> connectMsg = interceptor.preSend(MessageBuilder.createMessage(new byte[0], connectAccessor.getMessageHeaders()), mockChannel);

        StompHeaderAccessor subAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        subAccessor.setDestination("/topic/admin/broadcast");
        subAccessor.setUser(StompHeaderAccessor.wrap(connectMsg).getUser());
        Message<byte[]> subMsg = MessageBuilder.createMessage(new byte[0], subAccessor.getMessageHeaders());

        AccessDeniedException ex = assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(subMsg, mockChannel)
        );
        assertTrue(ex.getMessage().contains("Unauthorized subscription destination"));
    }

    @Test
    @DisplayName("Client STOMP SEND is rejected")
    void testClientSendRejected() {
        StompHeaderAccessor sendAccessor = StompHeaderAccessor.create(StompCommand.SEND);
        sendAccessor.setDestination("/app/chat");
        Message<byte[]> sendMsg = MessageBuilder.createMessage(new byte[0], sendAccessor.getMessageHeaders());

        assertThrows(AccessDeniedException.class, () ->
                interceptor.preSend(sendMsg, mockChannel)
        );
    }
}
