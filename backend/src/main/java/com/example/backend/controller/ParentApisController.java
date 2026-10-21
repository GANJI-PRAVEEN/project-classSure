package com.example.backend.controller;

import com.example.backend.model.*;
import com.example.backend.repo.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/parent")
public class ParentApisController {

    @Autowired
    private ChildrenRepo childrenRepo;
    @Autowired
    private Userrepo userrepo;
    @Autowired
    private SchedulesRepo schedulesRepo;


    @PostMapping("/add-child")
    public Children saveChildren(@RequestBody Children children){
        return childrenRepo.save(children);
    }

    @GetMapping("/get-childrens")
    public List<Children> getAllChildrens(){
        return childrenRepo.findAll();
    }

    @PostMapping("/validate-tutor")
    public ResponseEntity<Map<String, Object>> validateAndGetID(
            @RequestBody Users request,
            Authentication authentication) {
        System.out.println("email received " + request.getEmail());
        List<Users> users = userrepo.findAll();
        Optional<Users> tutorOptional =
                userrepo.findByEmail(request.getEmail());
        System.out.println("API optional" + tutorOptional);
        Users tutor = tutorOptional.orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No user found with this email"
                )
        );


        System.out.println("API " + tutor);
        if (!"TUTOR".equalsIgnoreCase(tutor.getRole())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This email does not belong to a tutor"
            );
        }

        String parentEmail = authentication.getName();
        System.out.println("Parent email :" + parentEmail);
        Optional<Users> parentOptional = userrepo.findByEmail(parentEmail);
        Users parent = parentOptional.orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "parent email not found in db"
                )
        );
        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Email does not belong to the parent"
            );
        }

        System.out.println("Response is sending as ok");
        return ResponseEntity.ok(
                Map.of(
                        "tutor_id", tutor.getId(),
                        "parent_id", parent.getId(),
                        "message", "Verified Successfully"
                )
        );
    }
    @PostMapping("/save-schedule")
    public Schedule saveSchedule(@RequestBody Schedule schedule){
        return schedulesRepo.save(schedule);
    }


}
