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

import java.time.Instant;
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
    public ResponseEntity<?> saveChildren(@RequestBody Children children, Authentication authentication) {
        if (children.getName() == null || children.getName().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Student name is required"));
        }
        if (children.getTutorId() == null || children.getTutorId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tutor is required"));
        }

        if (authentication != null && authentication.isAuthenticated()) {
            Optional<Users> parentOpt = userrepo.findByEmail(authentication.getName());
            if (parentOpt.isPresent()) {
                children.setParentId(parentOpt.get().getId());
            }
        }

        if (children.getCreatedAt() == null) {
            children.setCreatedAt(Instant.now());
        }

        Children saved = childrenRepo.save(children);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/get-childrens")
    public List<Children> getAllChildrens(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            Optional<Users> parent = userrepo.findByEmail(authentication.getName());
            if (parent.isPresent()) {
                List<Children> parentChildren = childrenRepo.findAllByParentId(parent.get().getId());
                if (!parentChildren.isEmpty()) {
                    return parentChildren;
                }
            }
        }
        return childrenRepo.findAll();
    }

    @PostMapping("/validate-tutor")
    public ResponseEntity<Map<String, Object>> validateAndGetID(
            @RequestBody Users request,
            Authentication authentication) {
        System.out.println("email received " + request.getEmail());
        Optional<Users> tutorOptional = userrepo.findByEmail(request.getEmail().trim().toLowerCase());
        Users tutor = tutorOptional.orElseThrow(() ->
                new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No user found with this email"
                )
        );

        if (!"TUTOR".equalsIgnoreCase(tutor.getRole())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This email does not belong to a tutor"
            );
        }

        String parentEmail = authentication.getName();
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

        return ResponseEntity.ok(
                Map.of(
                        "tutor_id", tutor.getId(),
                        "parent_id", parent.getId(),
                        "message", "Verified Successfully"
                )
        );
    }

    @PostMapping("/save-schedule")
    public ResponseEntity<?> saveSchedule(@RequestBody Schedule schedule, Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Authentication required"));
        }

        String parentEmail = authentication.getName();
        Users parent = userrepo.findByEmail(parentEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Parent not found"));

        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Only parents can create schedules"));
        }

        // 1. Validate daysOfWeek
        if (schedule.getDaysOfWeek() == null || schedule.getDaysOfWeek().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "At least one class day must be selected"));
        }

        // 2. Validate startTime & endTime
        if (schedule.getStartTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Start time is required"));
        }
        if (schedule.getEndTime() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "End time is required"));
        }
        if (!schedule.getEndTime().isAfter(schedule.getStartTime())) {
            return ResponseEntity.badRequest().body(Map.of("error", "End time must be later than start time"));
        }

        // 3. Validate effectiveFrom & effectiveTo
        if (schedule.getEffectiveFrom() == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Effective from date is required"));
        }
        if (schedule.getEffectiveTo() != null && schedule.getEffectiveTo().isBefore(schedule.getEffectiveFrom())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Effective to date must be on or after effective from date"));
        }

        // 4. Validate child exists and belongs to parent
        if (schedule.getChildId() == null || schedule.getChildId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Child ID is required"));
        }
        Optional<Children> childOpt = childrenRepo.findById(schedule.getChildId());
        if (childOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("error", "Child record not found"));
        }
        Children child = childOpt.get();
        if (child.getParentId() != null && !child.getParentId().equals(parent.getId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "You are not authorized to create a schedule for this child"));
        }

        // 5. Validate tutor exists and has TUTOR role
        if (schedule.getTutorId() == null || schedule.getTutorId().trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Tutor ID is required"));
        }
        Optional<Users> tutorOpt = userrepo.findById(schedule.getTutorId());
        if (tutorOpt.isEmpty() || !"TUTOR".equalsIgnoreCase(tutorOpt.get().getRole())) {
            return ResponseEntity.badRequest().body(Map.of("error", "Specified tutor is invalid"));
        }

        // 6. Validate hourlyRate if provided
        if (schedule.getHourlyRate() != null && schedule.getHourlyRate() <= 0) {
            return ResponseEntity.badRequest().body(Map.of("error", "Hourly tuition fee must be greater than zero"));
        }

        // 7. Enforce ownership and pending status
        schedule.setParentId(parent.getId());
        schedule.setStatus("PENDING");

        Schedule saved = schedulesRepo.save(schedule);
        return ResponseEntity.ok(saved);
    }

    @GetMapping("/get-schedules")
    public ResponseEntity<List<Schedule>> getSchedules(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated()) {
            Optional<Users> parent = userrepo.findByEmail(authentication.getName());
            if (parent.isPresent()) {
                List<Schedule> list = schedulesRepo.findAllByParentId(parent.get().getId());
                if (!list.isEmpty()) {
                    return ResponseEntity.ok(list);
                }
            }
        }
        return ResponseEntity.ok(schedulesRepo.findAll());
    }

    @GetMapping("/get-schedule/{childId}")
    public ResponseEntity<?> getScheduleForChild(@PathVariable String childId) {
        List<Schedule> list = schedulesRepo.findAllByChildId(childId);
        if (list.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No schedule found"));
        }
        return ResponseEntity.ok(list.get(list.size() - 1));
    }

    @DeleteMapping("/delete-child/{childId}")
    public ResponseEntity<?> deleteChild(@PathVariable String childId, Authentication authentication) {
        Optional<Children> childOpt = childrenRepo.findById(childId);
        if (childOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        Children child = childOpt.get();
        if (authentication != null && authentication.isAuthenticated()) {
            Optional<Users> parent = userrepo.findByEmail(authentication.getName());
            if (parent.isPresent() && child.getParentId() != null && !parent.get().getId().equals(child.getParentId())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Not authorized to delete this child"));
            }
        }
        childrenRepo.deleteById(childId);
        List<Schedule> schedules = schedulesRepo.findAllByChildId(childId);
        if (!schedules.isEmpty()) {
            schedulesRepo.deleteAll(schedules);
        }
        return ResponseEntity.ok(Map.of("message", "Child deleted successfully"));
    }


}
