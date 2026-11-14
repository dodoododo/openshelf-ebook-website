package com.openshelf;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import tools.jackson.databind.json.JsonMapper;

@SpringBootTest(properties = {"openshelf.auth.login-email-limit=1", "openshelf.auth.login-ip-limit=10"})
@AutoConfigureMockMvc
class ThrottleHttpTests extends PostgresIntegrationTest {
    private final MockMvc mvc;
    private final JsonMapper json;

    @Autowired
    ThrottleHttpTests(MockMvc mvc, JsonMapper json) { this.mvc = mvc; this.json = json; }

    @Test
    void repeatedCredentialAttemptsReturn429WithRetryAfter() throws Exception {
        var csrf = mvc.perform(get("/api/v1/auth/csrf")).andReturn();
        var session = (MockHttpSession) csrf.getRequest().getSession(false);
        String token = json.readTree(csrf.getResponse().getContentAsString()).at("/data/token").asText();
        String credentials = "{\"email\":\"throttled@example.com\",\"password\":\"A long test passphrase\"}";
        mvc.perform(post("/api/v1/auth/login").session(session).header("X-CSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON).content(credentials)).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/v1/auth/login").session(session).header("X-CSRF-TOKEN", token)
                .contentType(MediaType.APPLICATION_JSON).content(credentials))
                .andExpect(status().isTooManyRequests()).andExpect(header().exists("Retry-After"))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }
}
