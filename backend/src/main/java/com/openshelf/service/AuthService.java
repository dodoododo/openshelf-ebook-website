package com.openshelf.service;

import com.openshelf.dto.request.RegisterRequest;
import com.openshelf.dto.response.UserResponse;
import com.openshelf.entity.User;
import com.openshelf.exception.UnauthenticatedException;
import com.openshelf.mapper.UserMapper;
import com.openshelf.repository.UserRepository;
import java.time.Clock;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder passwords;
    private final UserMapper mapper;
    private final Clock clock;

    public AuthService(UserRepository users, PasswordEncoder passwords, UserMapper mapper, Clock clock) {
        this.users = users;
        this.passwords = passwords;
        this.mapper = mapper;
        this.clock = clock;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        User user = new User(request.email(), passwords.encode(request.password()), request.displayName(), clock.instant());
        return mapper.toResponse(users.saveAndFlush(user));
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser(UUID id) {
        return mapper.toResponse(users.findById(id).orElseThrow(UnauthenticatedException::new));
    }
}
