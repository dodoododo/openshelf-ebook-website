package com.openshelf;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import jakarta.servlet.ServletContext;
import jakarta.servlet.SessionTrackingMode;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ProductionCookieTests extends PostgresIntegrationTest {
    private final int port;
    private final ServletContext servletContext;

    @Autowired
    ProductionCookieTests(@Value("${local.server.port}") int port, ServletContext servletContext) {
        this.port = port;
        this.servletContext = servletContext;
    }

    @Test
    void secureDefaultCookieIsHostOnlyAndHttpOnlyWithNoPersistentLifetime() throws Exception {
        assertThat(servletContext.getSessionTimeout()).isEqualTo(30);
        assertThat(servletContext.getEffectiveSessionTrackingModes()).containsExactly(SessionTrackingMode.COOKIE);
        var response = HttpClient.newHttpClient().send(HttpRequest.newBuilder(
                URI.create("http://localhost:" + port + "/api/v1/auth/csrf")).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(response.statusCode()).isEqualTo(200);
        assertThat(response.headers().firstValue("set-cookie").orElseThrow())
                .startsWith("__Host-openshelf-session=").contains("Secure", "HttpOnly", "SameSite=Lax", "Path=/")
                .doesNotContain("Domain=", "Max-Age=", "Expires=");
    }
}
