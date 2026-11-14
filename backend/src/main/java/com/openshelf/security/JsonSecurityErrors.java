package com.openshelf.security;

import com.openshelf.dto.response.ApiErrorResponse;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

@Component
public class JsonSecurityErrors {
    private final JsonMapper json;

    public JsonSecurityErrors(JsonMapper json) { this.json = json; }

    public void write(HttpServletResponse response, int status, String code, String message) throws IOException {
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        json.writeValue(response.getOutputStream(), ApiErrorResponse.of(status, code, message));
    }
}
