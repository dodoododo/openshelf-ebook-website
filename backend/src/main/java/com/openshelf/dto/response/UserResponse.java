package com.openshelf.dto.response;

import com.openshelf.enums.Role;
import java.time.Instant;
import java.util.UUID;

public record UserResponse(UUID id, String email, String displayName, Role role, Instant createdAt, Instant updatedAt) { }
