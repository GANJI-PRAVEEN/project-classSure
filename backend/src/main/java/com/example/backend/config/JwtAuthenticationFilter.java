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

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");


        System.out.println("JWT FILTER EXECUTED");
        System.out.println("Request URI: " + request.getRequestURI());
        System.out.println("Authorization header present: " + authHeader);



        if(authHeader==null || !authHeader.startsWith("Bearer ")){
            filterChain.doFilter(request,response);
//            System.out.println("Response status after filter chain: " + response.getStatus());
            return;
        }

        String token = authHeader.substring(7);
        try {

            String email = jwtService.extractEmail(token);
            System.out.println("JWT email extracted: " + email);
            if(email!=null && SecurityContextHolder.getContext().getAuthentication()==null){
                UserDetails userDetails =
                        customUserDetails.loadUserByUsername(email);
                System.out.println("User: " + userDetails.getUsername());
                System.out.println("Authorities: " + userDetails.getAuthorities());
                if(jwtService.isTokenValid(token,userDetails.getUsername())){
                    System.out.println("Token valid");
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
            System.out.println("erorr"+e);
            SecurityContextHolder.clearContext();
        }
        filterChain.doFilter(request,response);
    }
}
