package com.openshelf.controller;

import com.openshelf.dto.request.LoginRequest;
import com.openshelf.dto.request.RegisterRequest;
import com.openshelf.dto.response.ApiResponse;
import com.openshelf.dto.response.CsrfResponse;
import com.openshelf.dto.response.UserResponse;
import com.openshelf.exception.UnauthenticatedException;
import com.openshelf.security.CredentialThrottle;
import com.openshelf.security.OpenShelfPrincipal;
import com.openshelf.security.SessionLogin;
import com.openshelf.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService auth;
    private final SessionLogin login;
    private final CredentialThrottle throttle;

    public AuthController(AuthService auth, SessionLogin login, CredentialThrottle throttle) {
        this.auth = auth;
        this.login = login;
        this.throttle = throttle;
    }

    @GetMapping("/csrf")
    public ApiResponse<CsrfResponse> csrf(CsrfToken token) {
        return ApiResponse.ok(new CsrfResponse(token.getHeaderName(), token.getToken()));
    }

    @PostMapping(value = "/register", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest credentials, HttpServletRequest request) {
        throttle.register(request.getRemoteAddr());
        return ApiResponse.ok(auth.register(credentials));
    }

    @PostMapping(value = "/login", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ApiResponse<UserResponse> login(@Valid @RequestBody LoginRequest credentials,
            HttpServletRequest request, HttpServletResponse response) {
        throttle.login(credentials.email(), request.getRemoteAddr());
        OpenShelfPrincipal principal = login.authenticate(credentials, request, response);
        return ApiResponse.ok(auth.currentUser(principal.getId()));
    }

    @GetMapping("/me")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal OpenShelfPrincipal principal,
            HttpServletRequest request, HttpServletResponse response) {
        try {
            return ApiResponse.ok(auth.currentUser(principal.getId()));
        } catch (UnauthenticatedException exception) {
            new SecurityContextLogoutHandler().logout(request, response, null);
            throw exception;
        }
    }
}
