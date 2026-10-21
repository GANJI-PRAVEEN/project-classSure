package com.example.backend.service;


import com.example.backend.model.Users;
import com.example.backend.repo.Userrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetails implements UserDetailsService {

    private Userrepo userrepo;

    public CustomUserDetails(Userrepo userrepo, PasswordEncoder passwordEncoder){
        this.userrepo = userrepo;
    }

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        Users users = userrepo.findByEmail(email)
                .orElseThrow(() ->  new UsernameNotFoundException("User not found!"));
        return org.springframework.security.core.userdetails.User
                .withUsername(users.getEmail())
                .password(users.getPassword())
                .roles(users.getRole())
                .build();
    }
}
