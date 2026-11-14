package com.openshelf;

import java.nio.file.Files;
import java.nio.file.Path;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.concurrent.TimeUnit;
import org.testcontainers.postgresql.PostgreSQLContainer;

/** Local browser-test server backed only by a disposable Testcontainers database. */
public class BrowserTestApplication {
    public static void main(String[] args) throws Exception {
        PostgreSQLContainer postgres = new PostgreSQLContainer("postgres:17-alpine");
        postgres.start();
        Path storage = Files.createTempDirectory("openshelf-browser-books-");
        Path control = Path.of("target/browser-control").toAbsolutePath();
        Files.createDirectories(control);
        Files.deleteIfExists(control.resolve("restart.request"));
        Files.deleteIfExists(control.resolve("restart.ready"));
        // Java argument file avoids Windows command-line length limits. It contains no credentials.
        Path arguments = Files.createTempFile("openshelf-browser-java-", ".args");
        Files.writeString(arguments, "-cp\n\"" + System.getProperty("java.class.path").replace("\\", "\\\\") + "\"\n"
                + "com.openshelf.OpenshelfApplication\n--spring.profiles.active=test\n--server.port=18080\n"
                + "--server.servlet.session.cookie.name=openshelf-session\n--server.servlet.session.cookie.secure=false\n"
                + "--spring.devtools.add-properties=false\n--spring.devtools.restart.enabled=false\n");
        ProcessBuilder launcher = new ProcessBuilder(Path.of(System.getProperty("java.home"), "bin", "java").toString(),
                "-Dspring.devtools.restart.enabled=false", "@" + arguments);
        String jdbcUrl = postgres.getJdbcUrl().replace("localhost", "127.0.0.1");
        launcher.environment().put("SPRING_DATASOURCE_URL", jdbcUrl + (jdbcUrl.contains("?") ? "&" : "?")
                + "sslmode=disable&connectTimeout=5&socketTimeout=15");
        launcher.environment().put("SPRING_DATASOURCE_USERNAME", postgres.getUsername());
        launcher.environment().put("SPRING_DATASOURCE_PASSWORD", postgres.getPassword());
        launcher.environment().put("OPENSHELF_STORAGE_ROOT", storage.toString());
        launcher.inheritIO();
        Process[] child = { launcher.start() };
        Runtime.getRuntime().addShutdownHook(new Thread(() -> {
            child[0].destroy();
            try { child[0].waitFor(20, TimeUnit.SECONDS); Files.deleteIfExists(arguments); }
            catch (Exception ignored) { }
            postgres.stop();
        }));
        System.out.println("Browser test control directory: " + control);
        while (child[0].isAlive()) {
            if (Files.deleteIfExists(control.resolve("restart.request"))) {
                child[0].destroy();
                if (!child[0].waitFor(30, TimeUnit.SECONDS)) throw new IllegalStateException("Test backend did not stop");
                child[0] = launcher.start();
                waitForHealth(child[0]);
                Files.writeString(control.resolve("restart.ready"), "ready");
            }
            Thread.sleep(250);
        }
        throw new IllegalStateException("Browser test backend exited unexpectedly");
    }

    private static void waitForHealth(Process child) throws Exception {
        HttpClient client = HttpClient.newHttpClient();
        long deadline = System.nanoTime() + Duration.ofMinutes(2).toNanos();
        while (child.isAlive() && System.nanoTime() < deadline) {
            try {
                var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:18080/actuator/health")).timeout(Duration.ofSeconds(2)).build();
                if (client.send(request, HttpResponse.BodyHandlers.discarding()).statusCode() == 200) return;
            } catch (java.io.IOException ignored) { }
            Thread.sleep(250);
        }
        throw new IllegalStateException("Restarted test backend did not become ready");
    }
}
