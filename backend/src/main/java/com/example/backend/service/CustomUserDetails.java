package com.example.backend.service;

import com.example.backend.model.Users;
import com.example.backend.repo.Userrepo;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class CustomUserDetails implements UserDetailsService {

    private final Userrepo userrepo;

    public CustomUserDetails(Userrepo userrepo, PasswordEncoder passwordEncoder){
        this.userrepo = userrepo;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        if (email == null || email.trim().isEmpty()) {
            throw new UsernameNotFoundException("Email is required");
        }
        String cleanEmail = email.trim();
        Optional<Users> userOpt = userrepo.findByEmail(cleanEmail);
        if (userOpt.isEmpty()) {
            userOpt = userrepo.findByEmailIgnoreCase(cleanEmail);
        }
        Users users = userOpt.orElseThrow(() -> new UsernameNotFoundException("User not found with email: " + cleanEmail));

        String rawRole = users.getRole() != null ? users.getRole().trim() : "PARENT";
        String cleanRole = rawRole.toUpperCase().replace("ROLE_", "");

        return org.springframework.security.core.userdetails.User
                .withUsername(users.getEmail())
                .password(users.getPassword())
                .roles(cleanRole)
                .build();
    }
}
