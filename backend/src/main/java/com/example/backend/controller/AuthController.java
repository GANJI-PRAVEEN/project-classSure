package com.example.backend.controller;

import com.example.backend.config.JwtService;
import com.example.backend.model.Users;
import com.example.backend.repo.Userrepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;

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
        if (users.getEmail() != null) {
            users.setEmail(users.getEmail().trim().toLowerCase());
        }
        if (users.getRole() != null) {
            users.setRole(users.getRole().trim().toUpperCase().replace("ROLE_", ""));
        }
        users.setCreatedAt(Instant.now());
        users.setPassword(passwordEncoder.encode(users.getPassword()));
        userrepo.save(users);
        return "Saved...!";
    }

    @GetMapping("/getCurrentUser")
    public ResponseEntity<?> getLoggedInUser(Authentication authentication){
        try {
            if(authentication!=null && authentication.isAuthenticated()){
                String email = authentication.getName();
                Optional<Users> user = userrepo.findByEmail(email);
                if(user.isEmpty()){
                    user = userrepo.findByEmailIgnoreCase(email);
                }
                if(user.isPresent()){
                    Users currentUser = user.get();
                    currentUser.setPassword(null);
                    return ResponseEntity.ok(currentUser);
                }
            }
        }catch (Exception e){
            System.out.println("Failed in fetching user data using id "+e);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Users users){
        if (users == null || users.getEmail() == null || users.getPassword() == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and password are required"));
        }

        String inputEmail = users.getEmail().trim();
        try {
            // Find user case-insensitively so that the exact stored email is verified
            Optional<Users> userOpt = userrepo.findByEmail(inputEmail);
            if (userOpt.isEmpty()) {
                userOpt = userrepo.findByEmailIgnoreCase(inputEmail);
            }

            if (userOpt.isEmpty()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Invalid email or password"));
            }

            Users loggedInUser = userOpt.get();

            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(loggedInUser.getEmail(), users.getPassword())
            );

            String token = jwtService.generateToken(loggedInUser.getEmail());

            String cleanRole = loggedInUser.getRole() != null
                    ? loggedInUser.getRole().trim().toUpperCase().replace("ROLE_", "")
                    : "PARENT";

            // Sanitize password before returning user object
            loggedInUser.setPassword(null);

            return ResponseEntity.ok(
                    Map.of(
                            "Message", "User Matched",
                            "token", token,
                            "user", loggedInUser,
                            "role", cleanRole
                    )
            );
        }
        catch (BadCredentialsException bd){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Invalid email or password"));
        }
        catch (AuthenticationException ae) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", ae.getMessage() != null ? ae.getMessage() : "Authentication failed"));
        }
        catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Login error: " + e.getMessage()));
        }
    }
}
