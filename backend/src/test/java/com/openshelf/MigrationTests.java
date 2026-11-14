package com.openshelf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.sql.Connection;
import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.flywaydb.core.api.FlywayException;
import org.junit.jupiter.api.Test;

class MigrationTests extends PostgresIntegrationTest {
    @Test
    void newSchemaAppliesAllFourMigrations() throws Exception {
        Flyway flyway = flyway(schema());
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(4);
        assertThat(flyway.info().current().getVersion().toString()).isEqualTo("4");
        assertThat(flyway.validateWithResult().validationSuccessful).isTrue();
    }

    @Test
    void upgradesV1WithoutModifyingItsHistoryOrExistingData() throws Exception {
        String schema = schema();
        Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(schema).defaultSchema(schema).target("1").load().migrate();
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("CREATE TABLE " + schema + ".sentinel (value TEXT NOT NULL)");
            statement.execute("INSERT INTO " + schema + ".sentinel VALUES ('preserve me')");
        }
        Flyway flyway = flyway(schema);
        assertThat(flyway.migrate().migrationsExecuted).isEqualTo(3);
        assertThat(java.util.Arrays.stream(flyway.info().applied())
                .filter(info -> info.getVersion() != null && "1".equals(info.getVersion().toString()))
                .findFirst().orElseThrow().getChecksum()).isEqualTo(1233558564);
        try (Connection connection = connection(); var statement = connection.createStatement();
                var result = statement.executeQuery("SELECT value FROM " + schema + ".sentinel")) {
            assertThat(result.next()).isTrue();
            assertThat(result.getString(1)).isEqualTo("preserve me");
        }
    }

    @Test
    void upgradesV2PreservingUsersAndAppliedChecksums() throws Exception {
        String schema = schema();
        var old = Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(schema).defaultSchema(schema).target("2").load();
        old.migrate();
        var checksums = java.util.Arrays.stream(old.info().applied()).filter(info -> info.getVersion() != null).map(info -> info.getChecksum()).toList();
        UUID id = UUID.randomUUID();
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO " + schema + ".users (id,email,password_hash,display_name,role) VALUES ('"+id+"','preserve@example.com','test-hash','Preserve','ROLE_USER')");
        }
        var upgraded = flyway(schema);
        assertThat(upgraded.migrate().migrationsExecuted).isEqualTo(2);
        assertThat(java.util.Arrays.stream(upgraded.info().applied()).filter(info -> info.getVersion() != null).limit(2).map(info -> info.getChecksum()).toList()).isEqualTo(checksums);
        try (Connection connection = connection(); var statement = connection.createStatement(); var result = statement.executeQuery("SELECT id FROM " + schema + ".users")) {
            assertThat(result.next()).isTrue(); assertThat(result.getObject(1, UUID.class)).isEqualTo(id);
        }
    }

    @Test
    void upgradesV3ToV4PreservingBooksFilesAndHistory() throws Exception {
        String schema = schema();
        var previous = Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(schema).defaultSchema(schema).target("3").load();
        previous.migrate();
        var checksums = java.util.Arrays.stream(previous.info().applied()).filter(info -> info.getVersion() != null).map(info -> info.getChecksum()).toList();
        UUID user = UUID.randomUUID(), book = UUID.randomUUID(), file = UUID.randomUUID();
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("INSERT INTO "+schema+".users(id,email,password_hash,display_name,role) VALUES ('"+user+"','v3@example.com','test','Reader','ROLE_USER')");
            statement.execute("INSERT INTO "+schema+".books(id,owner_id,title,author) VALUES ('"+book+"','"+user+"','Keep book','Author')");
            statement.execute("INSERT INTO "+schema+".book_files(id,book_id,version,storage_key,original_filename,content_type,size_bytes,sha256,page_count) VALUES ('"+file+"','"+book+"',1,'"+UUID.randomUUID()+".pdf','keep.pdf','application/pdf',100,'"+"0".repeat(64)+"',5)");
        }
        var upgraded = flyway(schema);
        assertThat(upgraded.migrate().migrationsExecuted).isEqualTo(1);
        assertThat(upgraded.validateWithResult().validationSuccessful).isTrue();
        assertThat(java.util.Arrays.stream(upgraded.info().applied()).filter(info -> info.getVersion() != null).limit(3).map(info -> info.getChecksum()).toList()).isEqualTo(checksums);
        try (Connection connection = connection(); var statement = connection.createStatement(); var result = statement.executeQuery("SELECT id FROM "+schema+".book_files")) {
            assertThat(result.next()).isTrue(); assertThat(result.getObject(1, UUID.class)).isEqualTo(file);
        }
    }

    @Test
    void unmanagedNonemptySchemaFailsWithoutAutomaticBaseline() throws Exception {
        String schema = schema();
        try (Connection connection = connection(); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
            statement.execute("CREATE TABLE " + schema + ".sentinel (id INTEGER)");
        }
        assertThatThrownBy(() -> flyway(schema).migrate()).isInstanceOf(FlywayException.class)
                .hasMessageContaining("non-empty");
    }

    private String schema() { return "migration_" + UUID.randomUUID().toString().replace("-", ""); }
    private Connection connection() throws Exception {
        return DriverManager.getConnection(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword());
    }
    private Flyway flyway(String schema) {
        return Flyway.configure().dataSource(POSTGRES.getJdbcUrl(), POSTGRES.getUsername(), POSTGRES.getPassword())
                .schemas(schema).defaultSchema(schema).baselineOnMigrate(false).load();
    }
}
