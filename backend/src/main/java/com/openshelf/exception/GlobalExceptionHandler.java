package com.openshelf.exception;

import com.openshelf.dto.response.ApiErrorResponse;
import com.openshelf.dto.response.ApiErrorResponse.FieldIssue;
import java.util.List;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BookException.class)
    public ResponseEntity<ApiErrorResponse> book(BookException exception) {
        return error(exception.getStatus(), exception.getCode(), exception.getMessage());
    }

    @ExceptionHandler(org.springframework.web.multipart.MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> uploadSize() { return error(413, "PAYLOAD_TOO_LARGE", "The upload exceeds the configured limit"); }

    @ExceptionHandler({org.springframework.web.method.annotation.MethodArgumentTypeMismatchException.class,
            org.springframework.web.multipart.support.MissingServletRequestPartException.class,
            org.springframework.web.bind.MissingServletRequestParameterException.class})
    public ResponseEntity<ApiErrorResponse> invalidArgument() { return error(400, "MALFORMED_REQUEST", "Check the book identifier, file, and request parameters"); }

    @ExceptionHandler(org.springframework.web.multipart.MultipartException.class)
    public ResponseEntity<ApiErrorResponse> multipart() { return error(400, "MALFORMED_REQUEST", "Send a valid multipart upload"); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> validation(MethodArgumentNotValidException exception) {
        List<FieldIssue> details = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldIssue(error.getField(), error.getDefaultMessage())).distinct().toList();
        return ResponseEntity.badRequest().body(ApiErrorResponse.of(400, "VALIDATION_ERROR",
                "Please correct the highlighted fields", details));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> malformed() {
        return error(400, "MALFORMED_REQUEST", "Send a valid JSON request with only the supported fields");
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> mediaType() {
        return error(415, "UNSUPPORTED_MEDIA_TYPE", "Use the content type required by this endpoint");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<ApiErrorResponse> constraint(DataIntegrityViolationException exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof ConstraintViolationException constraint
                    && "uq_users_email".equals(constraint.getConstraintName())) {
                return error(409, "EMAIL_ALREADY_EXISTS", "An account with this email already exists");
            }
        }
        return error(500, "INTERNAL_ERROR", "The request could not be completed");
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<ApiErrorResponse> credentials() {
        return error(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
    }

    @ExceptionHandler(UnauthenticatedException.class)
    public ResponseEntity<ApiErrorResponse> unauthenticated() {
        return error(401, "UNAUTHENTICATED", "Please sign in to continue");
    }

    @ExceptionHandler(RateLimitException.class)
    public ResponseEntity<ApiErrorResponse> rateLimited(RateLimitException exception) {
        return ResponseEntity.status(429).header("Retry-After", Long.toString(exception.getRetryAfter()))
                .body(ApiErrorResponse.of(429, "RATE_LIMITED", exception.getMessage()));
    }

    private ResponseEntity<ApiErrorResponse> error(int status, String code, String message) {
        return ResponseEntity.status(status).body(ApiErrorResponse.of(status, code, message));
    }
}
