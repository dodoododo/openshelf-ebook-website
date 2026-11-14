package com.openshelf.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.openshelf.util.EmailAddress;
import com.openshelf.validation.PasswordLength;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Email @Size(max = 254) @Pattern(regexp = "[\\x00-\\x7F]+", message = "Use an ASCII email address") String email,
        @NotBlank @PasswordLength String password,
        @NotBlank @Size(max = 80) String displayName) {
    public RegisterRequest {
        email = EmailAddress.normalize(email);
        displayName = displayName == null ? null : displayName.strip();
    }

    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
        throw new IllegalArgumentException("Unknown registration field");
    }

    @Override
    public String toString() { return "RegisterRequest[redacted]"; }
}
