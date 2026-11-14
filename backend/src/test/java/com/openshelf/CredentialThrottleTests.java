package com.openshelf;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.openshelf.exception.RateLimitException;
import com.openshelf.security.CredentialThrottle;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class CredentialThrottleTests {
    @Test
    void emailLimitCannotBeBypassedByChangingIpAndExpires() {
        MutableClock clock = new MutableClock();
        CredentialThrottle throttle = new CredentialThrottle(clock, 2, 100, 5);
        throttle.login("reader@example.com", "ip1");
        throttle.login("reader@example.com", "ip2");
        assertThatThrownBy(() -> throttle.login("reader@example.com", "ip3")).isInstanceOf(RateLimitException.class);
        clock.now = clock.now.plusSeconds(901);
        assertThatCode(() -> throttle.login("reader@example.com", "ip3")).doesNotThrowAnyException();
    }

    @Test
    void ipLimitAppliesAcrossEmailsAndRegistrationHasItsOwnWindow() {
        MutableClock clock = new MutableClock();
        CredentialThrottle throttle = new CredentialThrottle(clock, 100, 2, 1);
        throttle.login("a@example.com", "same-ip");
        throttle.login("b@example.com", "same-ip");
        assertThatThrownBy(() -> throttle.login("c@example.com", "same-ip")).isInstanceOf(RateLimitException.class);
        throttle.register("same-ip");
        assertThatThrownBy(() -> throttle.register("same-ip")).isInstanceOf(RateLimitException.class);
        clock.now = clock.now.plusSeconds(3601);
        assertThatCode(() -> throttle.register("same-ip")).doesNotThrowAnyException();
    }

    private static class MutableClock extends Clock {
        private Instant now = Instant.parse("2026-11-12T00:00:00Z");
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }
}
