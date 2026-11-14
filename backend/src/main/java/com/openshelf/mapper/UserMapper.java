package com.openshelf.mapper;

import com.openshelf.dto.response.UserResponse;
import com.openshelf.entity.User;
import org.springframework.stereotype.Component;

@Component
public class UserMapper {
    public UserResponse toResponse(User user) {
        return new UserResponse(user.getId(), user.getEmail(), user.getDisplayName(), user.getRole(),
                user.getCreatedAt(), user.getUpdatedAt());
    }
}
