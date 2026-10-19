package com.cadence.report.config;

import com.cadence.report.entity.AssessmentSession;
import com.cadence.report.repository.AssessmentSessionRepository;
import com.cadence.security.auth.CadenceLearnerAuthenticationToken;
import com.cadence.security.jwt.JwtClaims;
import com.cadence.security.jwt.JwtValidator;
import com.cadence.security.model.LearnerPrincipal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Component;

import java.security.Principal;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * WebSocket STOMP channel interceptor for report-service.
 * Authenticates CONNECT frames using the Cadence JWT validator and
 * authorizes SUBSCRIBE requests against the owning assessment session.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 99)
public class StompSecurityInterceptor implements ChannelInterceptor {

    private static final Logger log = LoggerFactory.getLogger(StompSecurityInterceptor.class);
    private static final Pattern ASSESSMENT_TOPIC_PATTERN = Pattern.compile("^/topic/assessment/([0-9a-fA-F\\-]+)$");
    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtValidator jwtValidator;
    private final AssessmentSessionRepository sessionRepository;

    public StompSecurityInterceptor(JwtValidator jwtValidator, AssessmentSessionRepository sessionRepository) {
        this.jwtValidator = jwtValidator;
        this.sessionRepository = sessionRepository;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            Principal authentication = handleConnect(accessor);
            if (accessor.isMutable()) {
                accessor.setUser(authentication);
                return message;
            } else {
                return MessageBuilder.fromMessage(message)
                        .setHeader(SimpMessageHeaderAccessor.USER_HEADER, authentication)
                        .build();
            }
        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            handleSubscribe(accessor);
        } else if (StompCommand.SEND.equals(accessor.getCommand())) {
            throw new AccessDeniedException("Client publish not permitted");
        }

        return message;
    }

    private Principal handleConnect(StompHeaderAccessor accessor) {
        String authHeader = accessor.getFirstNativeHeader("Authorization");
        if (authHeader == null || authHeader.isBlank()) {
            authHeader = accessor.getFirstNativeHeader("authorization");
        }
        if (authHeader == null || authHeader.isBlank()) {
            authHeader = accessor.getPasscode();
        }

        if (authHeader == null || authHeader.isBlank()) {
            log.warn("STOMP CONNECT rejected: missing authorization credentials");
            throw new AccessDeniedException("Missing authorization credentials for WebSocket connection");
        }

        String token = authHeader.startsWith(BEARER_PREFIX)
                ? authHeader.substring(BEARER_PREFIX.length()).trim()
                : authHeader.trim();

        if (token.isEmpty()) {
            log.warn("STOMP CONNECT rejected: empty authorization token");
            throw new AccessDeniedException("Empty authorization token for WebSocket connection");
        }

        try {
            JwtClaims claims = jwtValidator.validate(token);
            LearnerPrincipal principal = new LearnerPrincipal(claims.userId(), claims.email(), claims.role());
            CadenceLearnerAuthenticationToken authentication = new CadenceLearnerAuthenticationToken(principal);
            log.debug("STOMP CONNECT authenticated for learner {}", claims.userId());
            return authentication;
        } catch (Exception e) {
            log.warn("STOMP CONNECT rejected: token validation failed: {}", e.getMessage());
            throw new AccessDeniedException("Invalid or expired authentication token for WebSocket connection");
        }
    }

    private void handleSubscribe(StompHeaderAccessor accessor) {
        String destination = accessor.getDestination();
        if (destination == null || destination.isBlank()) {
            throw new AccessDeniedException("Missing subscription destination");
        }

        Matcher matcher = ASSESSMENT_TOPIC_PATTERN.matcher(destination);
        if (!matcher.matches()) {
            log.warn("STOMP SUBSCRIBE rejected: destination {} is not allowed", destination);
            throw new AccessDeniedException("Unauthorized subscription destination");
        }

        UUID sessionId;
        try {
            sessionId = UUID.fromString(matcher.group(1));
        } catch (IllegalArgumentException e) {
            log.warn("STOMP SUBSCRIBE rejected: invalid sessionId format in destination {}", destination);
            throw new AccessDeniedException("Invalid session ID in subscription destination");
        }

        Principal user = accessor.getUser();
        if (!(user instanceof CadenceLearnerAuthenticationToken learnerAuth)) {
            log.warn("STOMP SUBSCRIBE rejected: unauthenticated subscription attempt to {}", destination);
            throw new AccessDeniedException("Subscription requires authenticated learner");
        }

        UUID learnerId = learnerAuth.getPrincipal().userId();
        Optional<AssessmentSession> sessionOpt = sessionRepository.findById(sessionId);

        if (sessionOpt.isEmpty() || !learnerId.equals(sessionOpt.get().getUserId())) {
            log.warn("STOMP SUBSCRIBE rejected: learner {} does not own session {}", learnerId, sessionId);
            throw new AccessDeniedException("Access denied: session does not belong to the authenticated learner");
        }

        log.debug("STOMP SUBSCRIBE authorized: learner {} subscribed to session {}", learnerId, sessionId);
    }
}
