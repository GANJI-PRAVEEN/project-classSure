package com.example.backend.config;


import com.example.backend.service.CustomUserDetails;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final CustomUserDetails customUserDetails;
    public JwtAuthenticationFilter(JwtService jwtService,CustomUserDetails customUserDetails){
        this.jwtService = jwtService;
        this.customUserDetails=customUserDetails;
    }

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(JwtAuthenticationFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");

        log.debug("JWT filter processing request URI: {}, auth header present: {}", request.getRequestURI(), authHeader != null);

        if(authHeader==null || !authHeader.startsWith("Bearer ")){
            filterChain.doFilter(request,response);
            return;
        }

        String token = authHeader.substring(7);
        try {
            String email = jwtService.extractEmail(token);
            if(email!=null && SecurityContextHolder.getContext().getAuthentication()==null){
                UserDetails userDetails =
                        customUserDetails.loadUserByUsername(email);
                if(jwtService.isTokenValid(token,userDetails.getUsername())){
                    UsernamePasswordAuthenticationToken authenticationToken =
                                                        new UsernamePasswordAuthenticationToken(
                                                                userDetails,
                                                                null,
                                                                userDetails.getAuthorities()
                                                        );
                    SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                }
            }
        }
        catch (JwtException | UsernameNotFoundException e){
            log.warn("JWT authentication rejected for request {}: {}", request.getRequestURI(), e.getMessage());
            SecurityContextHolder.clearContext();
        }
        catch (Exception e){
            log.error("Error occurred during JWT authentication processing for {}: {}", request.getRequestURI(), e.getMessage());
            SecurityContextHolder.clearContext();
        }
        filterChain.doFilter(request,response);
    }
}
