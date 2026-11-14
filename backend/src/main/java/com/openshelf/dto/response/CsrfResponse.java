package com.openshelf.dto.response;

public record CsrfResponse(String headerName, String token) {
    @Override
    public String toString() { return "CsrfResponse[redacted]"; }
}
