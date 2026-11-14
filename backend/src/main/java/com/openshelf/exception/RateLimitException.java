package com.openshelf.exception;

public class RateLimitException extends RuntimeException {
    private final long retryAfter;

    public RateLimitException(long retryAfter) {
        super("Too many attempts. Please try again later");
        this.retryAfter = retryAfter;
    }

    public long getRetryAfter() { return retryAfter; }
}
