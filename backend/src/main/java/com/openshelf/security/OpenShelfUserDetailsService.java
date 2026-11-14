package com.openshelf.security;

import com.openshelf.repository.UserRepository;
import com.openshelf.util.EmailAddress;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class OpenShelfUserDetailsService implements UserDetailsService {
    private final UserRepository users;

    public OpenShelfUserDetailsService(UserRepository users) { this.users = users; }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return users.findByEmail(EmailAddress.normalize(email)).map(OpenShelfPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }
}
