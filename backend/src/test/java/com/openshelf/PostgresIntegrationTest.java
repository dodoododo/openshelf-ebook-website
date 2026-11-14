package com.openshelf;

import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Shared disposable database; Ryuk removes it when the test JVM exits. No local DB fallback. */
@ActiveProfiles("test")
public abstract class PostgresIntegrationTest {
    protected static final PostgreSQLContainer POSTGRES = new PostgreSQLContainer("postgres:17-alpine");

    static {
        POSTGRES.start();
    }

    @DynamicPropertySource
    static void databaseProperties(DynamicPropertyRegistry registry) {
        registry.add("openshelf.storage.root", () -> java.nio.file.Path.of(System.getProperty("java.io.tmpdir"), "openshelf-tests-" + POSTGRES.getContainerId()).toAbsolutePath().toString());
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
    }
}
