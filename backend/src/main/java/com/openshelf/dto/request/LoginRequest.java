package com.openshelf.dto.request;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.openshelf.util.EmailAddress;
import com.openshelf.validation.PasswordLength;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record LoginRequest(
        @NotBlank @Email @Size(max = 254) @Pattern(regexp = "[\\x00-\\x7F]+", message = "Use an ASCII email address") String email,
        @NotBlank @PasswordLength(min = 1) String password) {
    public LoginRequest { email = EmailAddress.normalize(email); }

    @JsonAnySetter
    public void rejectUnknown(String name, Object value) {
        throw new IllegalArgumentException("Unknown login field");
    }

    @Override
    public String toString() { return "LoginRequest[redacted]"; }
}
