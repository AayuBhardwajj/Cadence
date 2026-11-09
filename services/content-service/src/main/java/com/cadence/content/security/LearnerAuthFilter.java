package com.cadence.content.security;

/**
 * RETIRED — see DECISIONS.md D27.
 *
 * This class base64-decoded JWT payloads without verifying the signature,
 * issuer, audience or expiry, allowing any forged token to authenticate.
 *
 * Replaced by com.cadence.security.filter.CadenceJwtAuthenticationFilter
 * (cadence-security-starter), which performs cryptographic HMAC/ECDSA
 * verification via JwtValidator before trusting any claim.
 *
 * The class is kept (empty) so the git diff is unambiguous. It is NOT
 * registered as a @Bean or added to any SecurityFilterChain.
 */
public final class LearnerAuthFilter {
    private LearnerAuthFilter() {}
}

