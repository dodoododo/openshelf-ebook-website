package com.openshelf.security;

import com.openshelf.entity.User;
import com.openshelf.enums.Role;
import java.io.Serial;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class OpenShelfPrincipal implements UserDetails, CredentialsContainer {
    @Serial
    private static final long serialVersionUID = 1L;
    private final UUID id;
    private final String email;
    private final List<GrantedAuthority> authorities;
    private String passwordHash;

    public OpenShelfPrincipal(User user) {
        id = user.getId();
        email = user.getEmail();
        passwordHash = user.getPasswordHash();
        authorities = user.getRole() == Role.ROLE_ADMIN
                ? List.of(new SimpleGrantedAuthority("ROLE_USER"), new SimpleGrantedAuthority("ROLE_ADMIN"))
                : List.of(new SimpleGrantedAuthority("ROLE_USER"));
    }

    public UUID getId() { return id; }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return passwordHash; }
    @Override public Collection<? extends GrantedAuthority> getAuthorities() { return authorities; }
    @Override public void eraseCredentials() { passwordHash = null; }
}
