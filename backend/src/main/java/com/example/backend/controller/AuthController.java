package com.example.backend.controller;


import com.example.backend.config.JwtService;
import com.example.backend.model.Users;
import com.example.backend.repo.Userrepo;
import io.jsonwebtoken.Jwt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;

import java.time.Instant;
import java.util.Map;

@RestController
@RequestMapping("/auth")
public class AuthController {

    @Autowired
    private Userrepo userrepo;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private AuthenticationManager authenticationManager;
    @Autowired
    private JwtService jwtService;

    @GetMapping("/")
    public String greet(){
        return "Good Night...!";
    }

    @PostMapping("/signup")
    public String signup(@RequestBody Users users){
        System.out.println(users);
        users.setCreatedAt(Instant.now());
        users.setPassword(passwordEncoder.encode(users.getPassword()));
        userrepo.save(users);
        return "Saved...!";
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Users users){
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(users.getEmail(),users.getPassword()));

            String token = jwtService.generateToken(users.getEmail());

            Users loggedInUser = userrepo.findByEmail(users.getEmail())
                    .orElseThrow(() -> new RuntimeException("User not found"));
            return ResponseEntity.ok(
                    Map.of(
                            "Message","User Matched",
                            "token",token,
                            "role",loggedInUser.getRole()
                    )
            );
        }
        catch (BadCredentialsException bd){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message","User not matched..!"
                    ));
        }
//        // Step 1: Find the user in MongoDB
//        Users storedUser = userrepo.findByEmail(users.getEmail())
//                .orElseThrow(() ->
//                        new RuntimeException("User not found"));
//
//        // Step 2: Compare submitted password with stored hash
//        boolean passwordMatches = passwordEncoder.matches(
//                users.getPassword(),
//                storedUser.getPassword()
//        );
//
//        // Step 3: Print the result in your IDE terminal
//        System.out.println("Password matches: " + passwordMatches);

    }
}
