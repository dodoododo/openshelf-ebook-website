package com.openshelf.security;

import com.openshelf.exception.RateLimitException;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/** Fixed windows with bounded memory, for the initial single-instance deployment. */
@Component
public class CredentialThrottle {
    private static final int MAX_KEYS = 10_000;
    private record Window(int attempts, Instant expiresAt) { }
    private final Map<String, Window> windows = new HashMap<>();
    private final Clock clock;
    private final int loginEmailLimit;
    private final int loginIpLimit;
    private final int registrationLimit;

    public CredentialThrottle(Clock clock,
            @Value("${openshelf.auth.login-email-limit:10}") int loginEmailLimit,
            @Value("${openshelf.auth.login-ip-limit:30}") int loginIpLimit,
            @Value("${openshelf.auth.registration-ip-limit:5}") int registrationLimit) {
        this.clock = clock;
        this.loginEmailLimit = loginEmailLimit;
        this.loginIpLimit = loginIpLimit;
        this.registrationLimit = registrationLimit;
    }

    public synchronized void login(String email, String ip) {
        expire();
        consume("login-ip:" + ip, loginIpLimit, Duration.ofMinutes(15));
        consume("login-email:" + email, loginEmailLimit, Duration.ofMinutes(15));
    }

    public synchronized void register(String ip) {
        expire();
        consume("register-ip:" + ip, registrationLimit, Duration.ofHours(1));
    }

    private void expire() {
        Instant now = clock.instant();
        windows.entrySet().removeIf(entry -> !entry.getValue().expiresAt().isAfter(now));
    }

    private void consume(String key, int limit, Duration duration) {
        Instant now = clock.instant();
        Window window = windows.get(key);
        if (window != null && window.attempts() >= limit) {
            throw new RateLimitException(Math.max(1, Duration.between(now, window.expiresAt()).toSeconds()));
        }
        if (window == null && windows.size() >= MAX_KEYS) { throw new RateLimitException(60); }
        windows.put(key, window == null ? new Window(1, now.plus(duration))
                : new Window(window.attempts() + 1, window.expiresAt()));
    }
}
