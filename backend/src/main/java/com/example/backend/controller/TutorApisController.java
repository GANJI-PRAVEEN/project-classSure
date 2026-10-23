package com.example.backend.controller;


import com.example.backend.model.Children;
import com.example.backend.model.Schedule;
import com.example.backend.model.Users;
import com.example.backend.repo.ChildrenRepo;
import com.example.backend.repo.SchedulesRepo;
import com.example.backend.repo.Userrepo;
import org.apache.coyote.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;

import javax.swing.text.html.Option;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/tutor")
public class TutorApisController {
    @Autowired
    private  ChildrenRepo childrenRepo;
    @Autowired
    private SchedulesRepo schedulesRepo;
    @Autowired
    private Userrepo userrepo;

    @GetMapping("/get-students/{tutorId}")
    public List<Children> getAllStudents(@PathVariable String tutorId){
        System.out.println("Received Id "+tutorId);
        return childrenRepo.findAllByTutorId(tutorId);
    }

    @GetMapping("get-pending-requests")
    public ResponseEntity<?> getAllStudentByTutorIdAndStatus(Authentication authentication){
        Map<String,Object> response = new HashMap<>();
        if(authentication!=null && authentication.isAuthenticated()){
            Optional<Users> tutor = userrepo.findByEmail(authentication.getName());
            if(tutor.isPresent()){
                List<Schedule> list =  schedulesRepo.findAllByTutorIdAndStatus(tutor.get().getId(),"PENDING");

                if(!list.isEmpty()){
                    response.put("message","Data fetched successfully");
                    response.put("data",list);
                    return ResponseEntity.ok(response);

                }
            }
        }
        response.put("message","data fetching failed");
        response.put("data",null);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @GetMapping("/get-parent-details/{parentId}")
    public ResponseEntity<?> getParentById(
            @PathVariable String parentId,
            Authentication authentication) {
        System.out.println("RECEIVING");
        if (authentication == null || !authentication.isAuthenticated()) {
            System.out.println("not authenticated");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        System.out.println("reaching parent fetching");
        Optional<Users> parent = userrepo.findById(parentId);

        if (parent.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Parent not found"));
        }

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Parent details fetched");
        response.put("data", parent.get());
        System.out.println("sent parent "+parent.get());

        return ResponseEntity.ok(response);
    }
    @GetMapping("/get-student-details/{studentId}")
    public ResponseEntity<?> getStudentDetailsById(@PathVariable String studentId,Authentication authentication){
        Map<String,Object> response = new HashMap<>();
        if(authentication!=null && authentication.isAuthenticated()){
            Optional<Children> student =  childrenRepo.findById(studentId);
            if(student.isPresent()){
                response.put("message","student details fetched");;
                response.put("data",student.get());
                return ResponseEntity.ok(response);
            }
        }
        response.put("message","student data fetching failed");
        response.put("data",null);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
    }

    @PutMapping("/update-schedule-status/{scheduleId}")
    public ResponseEntity<Map<String, Object>> updateScheduleStatus(
            @PathVariable String scheduleId,
            @RequestBody(required = false) Object payload,
            Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }

        if (scheduleId == null || scheduleId.trim().isEmpty()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Schedule ID cannot be empty"));
        }

        Optional<Schedule> scheduleOptional = schedulesRepo.findById(scheduleId);
        if (scheduleOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Schedule not found"));
        }

        String status = null;
        if (payload instanceof Map<?, ?> map) {
            Object s = map.get("status");
            if (s != null) {
                status = s.toString().trim().toUpperCase();
            }
        } else if (payload instanceof String str) {
            String clean = str.trim();
            if (clean.startsWith("{") && clean.contains("status")) {
                try {
                    com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
                    Map<?, ?> map = mapper.readValue(clean, Map.class);
                    Object s = map.get("status");
                    if (s != null) {
                        status = s.toString().trim().toUpperCase();
                    }
                } catch (Exception ignored) {
                }
            }
            if (status == null) {
                status = clean.replace("\"", "").trim().toUpperCase();
            }
        }

        if (status == null || (!status.equals("ACCEPTED") && !status.equals("REJECTED"))) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", "Invalid status. Allowed statuses are ACCEPTED or REJECTED"));
        }

        Optional<Users> tutor = userrepo.findByEmail(authentication.getName());
        Schedule schedule = scheduleOptional.get();
        if (tutor.isPresent() && schedule.getTutorId() != null && !schedule.getTutorId().isEmpty()) {
            if (!schedule.getTutorId().equals(tutor.get().getId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Unauthorized to update this schedule"));
            }
        }

        try {
            schedule.setStatus(status);
            Schedule savedSchedule = schedulesRepo.save(schedule);
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Schedule status updated successfully");
            response.put("data", savedSchedule);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to update schedule status in database: " + e.getMessage()));
        }
    }


}
