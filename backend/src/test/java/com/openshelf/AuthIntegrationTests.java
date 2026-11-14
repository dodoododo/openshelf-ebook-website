package com.openshelf;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.openshelf.repository.UserRepository;
import com.openshelf.security.OpenShelfPrincipal;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT, properties = {
    "openshelf.auth.login-email-limit=1000", "openshelf.auth.login-ip-limit=1000",
    "openshelf.auth.registration-ip-limit=1000", "server.servlet.session.cookie.name=openshelf-session",
    "server.servlet.session.cookie.secure=false"
})
@AutoConfigureMockMvc
class AuthIntegrationTests extends PostgresIntegrationTest {
    private static final String PASSWORD = "A long test passphrase 42";
    private final MockMvc mvc;
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final JsonMapper json;
    private final int port;

    @Autowired
    AuthIntegrationTests(MockMvc mvc, UserRepository users, PasswordEncoder passwords, JsonMapper json,
            @Value("${local.server.port}") int port) {
        this.mvc = mvc;
        this.users = users;
        this.passwords = passwords;
        this.json = json;
        this.port = port;
    }

    @Test
    void registrationNormalizesEmailHashesPasswordAssignsUserAndDoesNotLogin() throws Exception {
        String email = email();
        BrowserSession session = csrf(null);
        MvcResult result = register(session, "  " + email.toUpperCase() + "  ", PASSWORD, "  Reader  ")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.data.email").value(email))
                .andExpect(jsonPath("$.data.displayName").value("Reader"))
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.data.passwordHash").doesNotExist())
                .andExpect(jsonPath("$.data.password").doesNotExist()).andReturn();
        assertThat(result.getResponse().getContentAsString()).doesNotContain(PASSWORD);
        var user = users.findByEmail(email).orElseThrow();
        assertThat(user.getPasswordHash()).startsWith("{argon2}$argon2id$v=19$m=19456,t=2,p=1$");
        assertThat(passwords.matches(PASSWORD, user.getPasswordHash())).isTrue();
        assertThat(passwords.matches("incorrect password", user.getPasswordHash())).isFalse();
        assertThat(passwords.encode(PASSWORD)).isNotEqualTo(user.getPasswordHash());
        mvc.perform(get("/api/v1/auth/me").session(session.session())).andExpect(status().isUnauthorized());
    }

    @Test
    void duplicateCanonicalEmailReturnsConflictWithoutLosingExistingUser() throws Exception {
        String email = email();
        BrowserSession session = csrf(null);
        register(session, email, PASSWORD, "First").andExpect(status().isCreated());
        UUID originalId = users.findByEmail(email).orElseThrow().getId();
        register(session, " " + email.toUpperCase() + " ", PASSWORD, "Second")
                .andExpect(status().isConflict()).andExpect(jsonPath("$.error.code").value("EMAIL_ALREADY_EXISTS"));
        assertThat(users.findByEmail(email).orElseThrow().getId()).isEqualTo(originalId);
    }

    @Test
    void rejectsInvalidFieldsUnknownFieldsAndRoleInjection() throws Exception {
        BrowserSession session = csrf(null);
        register(session, "not-an-email", "short", " ").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details").isArray());
        String body = json.writeValueAsString(Map.of("email", email(), "password", PASSWORD,
                "displayName", "Reader", "role", "ROLE_ADMIN"));
        mvc.perform(post("/api/v1/auth/register").session(session.session()).header("X-CSRF-TOKEN", session.token())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
        register(session, "tést@example.com", PASSWORD, "Reader").andExpect(status().isBadRequest());
    }

    @Test
    void passwordsPreserveUnicodeAndWhitespaceAndEnforceCodePointLimits() throws Exception {
        BrowserSession session = csrf(null);
        String email = email();
        String passphrase = "  🔐".repeat(8);
        register(session, email, passphrase, "Reader").andExpect(status().isCreated());
        assertThat(passwords.matches(passphrase, users.findByEmail(email).orElseThrow().getPasswordHash())).isTrue();
        assertThat(passwords.matches(passphrase.strip(), users.findByEmail(email).orElseThrow().getPasswordHash())).isFalse();
        register(session, email(), "🔐".repeat(14), "Reader").andExpect(status().isBadRequest());
        register(session, email(), "🔐".repeat(15), "Reader").andExpect(status().isCreated());
        register(session, email(), "🔐".repeat(128), "Reader").andExpect(status().isCreated());
        register(session, email(), "🔐".repeat(129), "Reader").andExpect(status().isBadRequest());
    }

    @Test
    void loginPersistsContextRotatesSessionAndErasesCredentials() throws Exception {
        String email = email();
        BrowserSession session = csrf(null);
        register(session, email, PASSWORD, "Reader").andExpect(status().isCreated());
        String oldId = session.session().getId();
        login(session, email, PASSWORD).andExpect(status().isOk()).andExpect(jsonPath("$.data.email").value(email));
        assertThat(session.session().getId()).isNotEqualTo(oldId);
        SecurityContext context = (SecurityContext) session.session().getAttribute("SPRING_SECURITY_CONTEXT");
        assertThat(context.getAuthentication().getCredentials()).isNull();
        assertThat(((OpenShelfPrincipal) context.getAuthentication().getPrincipal()).getPassword()).isNull();
        mvc.perform(get("/api/v1/auth/me").session(session.session())).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.email").value(email));
        mvc.perform(get("/api/v1/admin/probe").session(session.session())).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.error.code").value("ACCESS_DENIED"));
        mvc.perform(post("/api/v1/auth/logout").session(session.session()).header("X-CSRF-TOKEN", session.token()))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("CSRF_INVALID"));
        BrowserSession rotated = csrf(session.session());
        mvc.perform(post("/api/v1/auth/logout").session(rotated.session()).header("X-CSRF-TOKEN", rotated.token()))
                .andExpect(status().isNoContent());
        assertThat(rotated.session().isInvalid()).isTrue();
    }

    @Test
    void incorrectAndUnknownCredentialsHaveSameErrorAndNoAuthenticatedContext() throws Exception {
        String email = email();
        BrowserSession session = csrf(null);
        register(session, email, PASSWORD, "Reader").andExpect(status().isCreated());
        login(session, email, "wrong password").andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("INVALID_CREDENTIALS"));
        login(session, email(), PASSWORD).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.message").value("Email or password is incorrect"));
        assertThat(session.session().getAttribute("SPRING_SECURITY_CONTEXT")).isNull();
    }

    @Test
    void publicUnsafeEndpointsRequireRealSessionBackedCsrf() throws Exception {
        for (String endpoint : new String[] {"register", "login", "logout"}) {
            mvc.perform(post("/api/v1/auth/" + endpoint).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden()).andExpect(jsonPath("$.error.code").value("CSRF_INVALID"));
        }
        BrowserSession session = csrf(null);
        mvc.perform(post("/api/v1/auth/logout").session(session.session()).header("X-CSRF-TOKEN", "invalid"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/v1/auth/logout").session(session.session()).header("X-CSRF-TOKEN", session.token()))
                .andExpect(status().isNoContent());
        BrowserSession anonymous = csrf(null);
        mvc.perform(post("/api/v1/auth/logout").session(anonymous.session()).header("X-CSRF-TOKEN", anonymous.token()))
                .andExpect(status().isNoContent());
    }

    @Test
    void rejectsOversizedAndMalformedBodiesAndDoesNotExposeBasicAuthentication() throws Exception {
        BrowserSession session = csrf(null);
        mvc.perform(post("/api/v1/auth/login").session(session.session()).header("X-CSRF-TOKEN", session.token())
                .contentType(MediaType.APPLICATION_JSON).content("x".repeat(8193)))
                .andExpect(status().isPayloadTooLarge()).andExpect(jsonPath("$.error.code").value("PAYLOAD_TOO_LARGE"));
        mvc.perform(post("/api/v1/auth/login").session(session.session()).header("X-CSRF-TOKEN", session.token())
                .contentType(MediaType.APPLICATION_JSON).content("{"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error.code").value("MALFORMED_REQUEST"));
        mvc.perform(post("/api/v1/auth/login").session(session.session()).header("X-CSRF-TOKEN", session.token())
                .contentType(MediaType.TEXT_PLAIN).content("credentials"))
                .andExpect(status().isUnsupportedMediaType());
        MvcResult result = mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized()).andReturn();
        assertThat(result.getResponse().getHeader("WWW-Authenticate")).isNull();
        assertThat(result.getResponse().getHeader("Location")).isNull();
        assertThat(result.getResponse().getHeader("Cache-Control")).contains("no-store");
        mvc.perform(get("/api/v1/auth/unknown")).andExpect(status().isUnauthorized());
    }

    @Test
    void actualHttpCookiesPersistAcrossRequestsAndOldIdsFailAfterLoginAndLogout() throws Exception {
        CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
        String email = email();
        HttpResponse<String> csrf = http(client, "GET", "/csrf", null, null);
        assertThat(csrf.statusCode()).isEqualTo(200);
        String oldCookie = csrf.headers().firstValue("set-cookie").orElseThrow().split(";", 2)[0];
        String token = json.readTree(csrf.body()).at("/data/token").asText();
        String credentials = json.writeValueAsString(Map.of("email", email, "password", PASSWORD));
        assertThat(http(client, "POST", "/register", token,
                json.writeValueAsString(Map.of("email", email, "password", PASSWORD, "displayName", "HTTP Reader"))).statusCode())
                .isEqualTo(201);
        HttpResponse<String> login = http(client, "POST", "/login", token, credentials);
        assertThat(login.statusCode()).isEqualTo(200);
        String newCookie = login.headers().firstValue("set-cookie").orElseThrow();
        assertThat(newCookie).contains("HttpOnly", "SameSite=Lax", "Path=/").doesNotContain("Secure");
        assertThat(newCookie.split(";", 2)[0]).isNotEqualTo(oldCookie);
        HttpResponse<String> me = http(client, "GET", "/me", null, null);
        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(json.readTree(me.body()).at("/data/email").asText()).isEqualTo(email);
        HttpResponse<String> stale = HttpClient.newHttpClient().send(HttpRequest.newBuilder(uri("/me"))
                .header("Cookie", oldCookie).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(stale.statusCode()).isEqualTo(401);
        assertThat(http(client, "GET", "/logout", null, null).statusCode()).isEqualTo(404);
        assertThat(http(client, "GET", "/me", null, null).statusCode()).isEqualTo(200);
        String rotated = json.readTree(http(client, "GET", "/csrf", null, null).body()).at("/data/token").asText();
        HttpResponse<String> logout = http(client, "POST", "/logout", rotated, "");
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(logout.headers().allValues("set-cookie").toString()).contains("openshelf-session=", "Max-Age=0", "Path=/");
        assertThat(http(client, "GET", "/me", null, null).statusCode()).isEqualTo(401);
        HttpResponse<String> replay = HttpClient.newHttpClient().send(HttpRequest.newBuilder(uri("/me"))
                .header("Cookie", newCookie.split(";", 2)[0]).build(), HttpResponse.BodyHandlers.ofString());
        assertThat(replay.statusCode()).isEqualTo(401);
    }

    @Test
    void concurrentRegistrationsHaveOneWinnerAndOneConflict() throws Exception {
        String email = email();
        BrowserSession first = csrf(null);
        BrowserSession second = csrf(null);
        var ready = new java.util.concurrent.CountDownLatch(2);
        var start = new java.util.concurrent.CountDownLatch(1);
        try (var executor = java.util.concurrent.Executors.newFixedThreadPool(2)) {
            var results = new java.util.ArrayList<java.util.concurrent.Future<Integer>>();
            for (BrowserSession session : new BrowserSession[] {first, second}) {
                results.add(executor.submit(() -> {
                    ready.countDown();
                    start.await();
                    return register(session, email, PASSWORD, "Concurrent Reader").andReturn().getResponse().getStatus();
                }));
            }
            assertThat(ready.await(5, java.util.concurrent.TimeUnit.SECONDS)).isTrue();
            start.countDown();
            assertThat(java.util.List.of(results.get(0).get(), results.get(1).get())).containsExactlyInAnyOrder(201, 409);
        }
        assertThat(users.findByEmail(email)).isPresent();
    }

    @Test
    void aDeletedUserCannotRestoreTheirSession() throws Exception {
        String email = email();
        BrowserSession session = csrf(null);
        register(session, email, PASSWORD, "Reader").andExpect(status().isCreated());
        login(session, email, PASSWORD).andExpect(status().isOk());
        users.deleteById(users.findByEmail(email).orElseThrow().getId());
        mvc.perform(get("/api/v1/auth/me").session(session.session())).andExpect(status().isUnauthorized());
        assertThat(session.session().isInvalid()).isTrue();
    }

    private record BrowserSession(MockHttpSession session, String token) { }

    private BrowserSession csrf(MockHttpSession existing) throws Exception {
        MockHttpServletRequestBuilder request = get("/api/v1/auth/csrf");
        if (existing != null) { request.session(existing); }
        MvcResult result = mvc.perform(request).andExpect(status().isOk()).andReturn();
        JsonNode body = json.readTree(result.getResponse().getContentAsString());
        assertThat(body.at("/data/headerName").asText()).isEqualTo("X-CSRF-TOKEN");
        return new BrowserSession((MockHttpSession) result.getRequest().getSession(false), body.at("/data/token").asText());
    }

    private org.springframework.test.web.servlet.ResultActions register(BrowserSession session, String email,
            String password, String name) throws Exception {
        return mvc.perform(post("/api/v1/auth/register").session(session.session()).header("X-CSRF-TOKEN", session.token())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(
                        Map.of("email", email, "password", password, "displayName", name))));
    }

    private org.springframework.test.web.servlet.ResultActions login(BrowserSession session, String email, String password)
            throws Exception {
        return mvc.perform(post("/api/v1/auth/login").session(session.session()).with(request -> {
                    request.setRequestedSessionId(session.session().getId());
                    request.setRequestedSessionIdValid(true);
                    return request;
                }).header("X-CSRF-TOKEN", session.token())
                .contentType(MediaType.APPLICATION_JSON).content(json.writeValueAsString(Map.of("email", email, "password", password))));
    }

    private String email() { return "reader-" + UUID.randomUUID() + "@example.com"; }
    private URI uri(String path) { return URI.create("http://localhost:" + port + "/api/v1/auth" + path); }

    private HttpResponse<String> http(HttpClient client, String method, String path, String token, String body) throws Exception {
        HttpRequest.Builder request = HttpRequest.newBuilder(uri(path)).header("Content-Type", "application/json");
        if (token != null) { request.header("X-CSRF-TOKEN", token); }
        request.method(method, body == null ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        return client.send(request.build(), HttpResponse.BodyHandlers.ofString());
    }
}
