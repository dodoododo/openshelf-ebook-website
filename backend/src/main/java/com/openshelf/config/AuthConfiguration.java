package com.openshelf.config;

import java.time.Clock;
import java.util.Map;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder;
import org.springframework.security.crypto.password.DelegatingPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AuthConfiguration {
    @Bean
    public Clock clock() { return Clock.systemUTC(); }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new DelegatingPasswordEncoder("argon2",
                Map.of("argon2", new Argon2PasswordEncoder(16, 32, 1, 19456, 2)));
    }
}
