package com.example.backend.controller;


import com.example.backend.enums.SessionStatus;
import com.example.backend.model.*;
import com.example.backend.repo.*;
import org.apache.coyote.Response;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import javax.swing.text.html.Option;
import java.time.*;
import java.util.*;

@RestController
@RequestMapping("/api/tutor")
public class TutorApisController {
    @Autowired
    private  ChildrenRepo childrenRepo;
    @Autowired
    private SchedulesRepo schedulesRepo;
    @Autowired
    private Userrepo userrepo;
    @Autowired
    private SessionRepo sessionRepo;
    @Autowired
    private CompletedTuitionsRepo completedTuitionsRepo;

    @GetMapping("/get-students/{tutorId}")
    public List<Children> getAllStudents(@PathVariable String tutorId){
        System.out.println("Received Id "+tutorId);
        List<Children> directStudents = childrenRepo.findAllByTutorId(tutorId);
        List<Schedule> acceptedSchedules = schedulesRepo.findAllByTutorIdAndStatus(tutorId, "ACCEPTED");

        Map<String, Children> uniqueStudents = new LinkedHashMap<>();

        // 1. Add students with confirmed schedules
        if (acceptedSchedules != null) {
            for (Schedule s : acceptedSchedules) {
                if (s.getChildId() != null && !s.getChildId().trim().isEmpty()) {
                    childrenRepo.findById(s.getChildId()).ifPresent(child -> {
                        String key = (child.getParentId() != null ? child.getParentId() : "") + "_" + 
                                     (child.getName() != null ? child.getName().trim().toLowerCase() : child.getId());
                        if (key != null && !uniqueStudents.containsKey(key)) {
                            uniqueStudents.put(key, child);
                        }
                    });
                }
            }
        }

        // 2. Add direct students from children table (deduplicated by parentId + name)
        if (directStudents != null) {
            for (Children child : directStudents) {
                String key = (child.getParentId() != null ? child.getParentId() : "") + "_" + 
                             (child.getName() != null ? child.getName().trim().toLowerCase() : child.getId());
                if (key != null && !uniqueStudents.containsKey(key)) {
                    uniqueStudents.put(key, child);
                }
            }
        }

        return new ArrayList<>(uniqueStudents.values());
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
                else{
                    response.put("message","No Parent Requests");
                    response.put("data",null);
                    return ResponseEntity.ok(response);
                }
            }
        }
        response.put("message","requests fetching failed");
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


    @GetMapping("/get-schedule/{childId}")
    public ResponseEntity<?> getScheduleForChild(@PathVariable String childId) {
        List<Schedule> list = schedulesRepo.findAllByChildId(childId);
        if (list.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "No schedule found"));
        }
        return ResponseEntity.ok(list.get(list.size() - 1));
    }

    @GetMapping({"/get-schedules", "/schedules"})
    public ResponseEntity<?> getTutorSchedules(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        String email = authentication.getName();
        Optional<Users> tutor = userrepo.findByEmail(email);
        if (tutor.isEmpty()) {
            tutor = userrepo.findByEmailIgnoreCase(email);
        }
        if (tutor.isEmpty()) {
            return ResponseEntity.ok(Collections.emptyList());
        }
        List<Schedule> list = schedulesRepo.findAllByTutorIdAndStatus(tutor.get().getId(), "ACCEPTED");
        return ResponseEntity.ok(list != null ? list : Collections.emptyList());
    }

    @PostMapping("/sessions/{sessionId}/start")
    public ResponseEntity<?> startSession(
            @PathVariable String sessionId,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }

        // 1. Identify the logged-in tutor
        String email = authentication.getName();

        Optional<Users> tutorOptional = userrepo.findByEmail(email);

        if (tutorOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Tutor not found"));
        }

        Users tutor = tutorOptional.get();

        if (!"TUTOR".equalsIgnoreCase(tutor.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only tutors can start sessions"));
        }

        // 2. Find the session
        Optional<Session> optionalSession = sessionRepo.findById(sessionId);

        if (optionalSession.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Session not found"));
        }

        Session session = optionalSession.get();

        // 3. Verify session ownership
        if (!tutor.getId().equals(session.getTutorId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot start another tutor's session"));
        }

        // 4. Verify session status
        if (session.getSessionStatus() != SessionStatus.UPCOMING) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Session cannot be started"));
        }

        // 5. Start the session
        session.setActualStart(Instant.now());
        session.setSessionStatus(SessionStatus.IN_PROGRESS);

        sessionRepo.save(session);

        return ResponseEntity.ok(
                Map.of(
                        "message", "Session started successfully",
                        "data", session
                )
        );
    }


    @PostMapping("/sessions/{sessionId}/end")
    public ResponseEntity<?> endSession(
            @PathVariable String sessionId,
            Authentication authentication) {

        // 1. Check authentication
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }

        // 2. Identify the logged-in tutor
        String email = authentication.getName();

        Users tutor = userrepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tutor not found"));

        if (!"TUTOR".equalsIgnoreCase(tutor.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only tutors can end sessions"));
        }

        // 3. Find the session
        Optional<Session> optionalSession = sessionRepo.findById(sessionId);

        if (optionalSession.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Session not found"));
        }

        Session session = optionalSession.get();

        // 4. Verify session ownership
        if (!tutor.getId().equals(session.getTutorId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot end another tutor's session"));
        }

        // 5. Only active sessions can be ended
        if (session.getSessionStatus() != SessionStatus.IN_PROGRESS) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", "Only active sessions can be ended"));
        }

        // 6. Record the end time and update status
        session.setActualEnd(Instant.now());
        session.setSessionStatus(SessionStatus.AWAITING_VERIFICATION);

        // 7. Save the existing session document
        Session savedSession = sessionRepo.save(session);

        return ResponseEntity.ok(Map.of(
                "message", "Session ended successfully. Awaiting parent verification.",
                "data", savedSession
        ));
    }

    @GetMapping({"/get-today-sessions", "/current-activities", "/today-sessions"})
    public ResponseEntity<?> getTodaySchedules(Authentication authentication){
        if(authentication==null || !authentication.isAuthenticated()){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        //1. get logged in tutor email
        String email = authentication.getName();
        //2. fetch details to get the id (case-insensitive fallback)
        Optional<Users> tutor = userrepo.findByEmail(email);
        if(tutor.isEmpty()){
            tutor = userrepo.findByEmailIgnoreCase(email);
        }
        if(tutor.isEmpty()){
            return ResponseEntity.ok(Map.of(
                    "message", "Tutor not found",
                    "data", Collections.emptyList()
            ));
        }

        //3. find tutor id
        String tutorId = tutor.get().getId();
        LocalDate today = LocalDate.now(ZoneId.of("Asia/Kolkata"));

        //4. Ensure today's sessions exist for any accepted schedules of this tutor
        List<Schedule> acceptedSchedules = schedulesRepo.findAllByTutorIdAndStatus(tutorId, "ACCEPTED");
        if (acceptedSchedules != null) {
            for (Schedule schedule : acceptedSchedules) {
                if (schedule.getDaysOfWeek() != null && schedule.getDaysOfWeek().contains(today.getDayOfWeek())) {
                    if (schedule.getEffectiveFrom() != null && !today.isBefore(schedule.getEffectiveFrom())) {
                        if (schedule.getEffectiveTo() == null || !today.isAfter(schedule.getEffectiveTo())) {
                            boolean exists = sessionRepo.existsByScheduleIdAndSessionDate(schedule.getId(), today);
                            if (!exists) {
                                Session session = new Session();
                                session.setScheduleId(schedule.getId());
                                session.setTutorId(schedule.getTutorId());
                                session.setParentId(schedule.getParentId());
                                session.setChildId(schedule.getChildId());
                                session.setSessionDate(today);
                                if (schedule.getStartTime() != null) {
                                    session.setScheduleStart(LocalDateTime.of(today, schedule.getStartTime()));
                                }
                                if (schedule.getEndTime() != null) {
                                    session.setScheduleEnd(LocalDateTime.of(today, schedule.getEndTime()));
                                }
                                session.setHourlyRate(schedule.getHourlyRate());
                                session.setSessionStatus(SessionStatus.UPCOMING);
                                sessionRepo.save(session);
                            }
                        }
                    }
                }
            }
        }

        //5. find only tutor accepted tuition details from the session table
        List<Session> availableTuitions = sessionRepo.findAllByTutorId(tutorId);
        if(availableTuitions==null || availableTuitions.isEmpty()){
            return ResponseEntity.ok(Map.of(
                    "message", "No sessions found",
                    "data", Collections.emptyList()
            ));
        }
        //6. Get today tuitions only, deduplicated by scheduleId or childId+time
        Map<String, Session> uniqueSessions = new LinkedHashMap<>();
        for (Session session : availableTuitions) {
            if (session.getSessionDate() != null && session.getSessionDate().equals(today)) {
                String key = session.getId();
                if (session.getScheduleId() != null && !session.getScheduleId().trim().isEmpty()) {
                    key = "sched_" + session.getScheduleId();
                } else if (session.getChildId() != null && session.getScheduleStart() != null) {
                    key = "child_" + session.getChildId() + "_" + session.getScheduleStart();
                }
                if (key != null && !uniqueSessions.containsKey(key)) {
                    uniqueSessions.put(key, session);
                } else if (key != null) {
                    Session existing = uniqueSessions.get(key);
                    if (existing != null && existing.getSessionStatus() == SessionStatus.UPCOMING && session.getSessionStatus() != SessionStatus.UPCOMING) {
                        uniqueSessions.put(key, session);
                    }
                }
            }
        }
        List<Session> todaySessions = new ArrayList<>(uniqueSessions.values());
        todaySessions.sort(Comparator.comparing(Session::getScheduleStart, Comparator.nullsLast(Comparator.naturalOrder())));
        return ResponseEntity.ok(Map.of(
                "message", "Today's sessions fetched successfully",
                "data", todaySessions
        ));
    }

    @GetMapping("/completed-tuitions")
    public ResponseEntity<?> getTutorEarnings(Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }

        String email = authentication.getName();

        Users tutor = userrepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Tutor not found"));

        if (!"TUTOR".equalsIgnoreCase(tutor.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only tutors can view their earnings"));
        }

        List<CompletedTuitions> completedTuitions =
                completedTuitionsRepo.findAllByTutorId(tutor.getId());

        List<Session> tutorSessions = sessionRepo.findAllByTutorId(tutor.getId());
        if (tutorSessions != null) {
            for (Session s : tutorSessions) {
                if (s.getSessionStatus() == SessionStatus.APPROVED && completedTuitionsRepo.findBySessionId(s.getId()).isEmpty()) {
                    double durationHours = (s.getCorrectedDurationMinutes() != null && s.getCorrectedDurationMinutes() > 0)
                            ? (s.getCorrectedDurationMinutes() / 60.0)
                            : ((s.getActualStart() != null && s.getActualEnd() != null)
                                ? (java.time.Duration.between(s.getActualStart(), s.getActualEnd()).toSeconds() / 3600.0)
                                : (s.getDurationMinutes() != null ? s.getDurationMinutes() / 60.0 : 0.0));
                    if (durationHours > 0) {
                        CompletedTuitions ct = new CompletedTuitions();
                        ct.setChildId(s.getChildId());
                        ct.setSessionId(s.getId());
                        ct.setScheduleId(s.getScheduleId());
                        ct.setTutorId(s.getTutorId());
                        ct.setParentId(s.getParentId());
                        ct.setSessionDate(s.getSessionDate());
                        ct.setActualStart(s.getActualStart());
                        ct.setActualEnd(s.getActualEnd());
                        ct.setVerifiedDurationHours(durationHours);
                        ct.setHourlyRate(s.getHourlyRate() != null ? s.getHourlyRate() : 0.0);
                        ct.setEarnedAmount(durationHours * (s.getHourlyRate() != null ? s.getHourlyRate() : 0.0));
                        ct.setReviewStatus("APPROVED");
                        ct.setApprovedAt(Instant.now());
                        completedTuitionsRepo.save(ct);
                        completedTuitions.add(ct);
                    }
                }
            }
        }
        
        return ResponseEntity.ok(Map.of(
                "message", "Tutor earnings fetched successfully",
                "data", completedTuitions
        ));
    }

    @PostMapping("/sessions/{sessionId}/dispute-response")
    public ResponseEntity<?> respondToDispute(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {

        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "User not authenticated"));
        }

        Users tutor = userrepo.findByEmail(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Tutor not found"));

        Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (!tutor.getId().equals(session.getTutorId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Not your session"));
        }

        session.setTutorDisputeReason(payload.get("response"));
        session.setTutorDisputeReasonAt(Instant.now());
        Session saved = sessionRepo.save(session);

        return ResponseEntity.ok(Map.of(
                "message", "Dispute response recorded successfully",
                "data", saved
        ));
    }

    @PostMapping("/sessions/{sessionId}/reschedule")
    public ResponseEntity<?> rescheduleSession(
            @PathVariable String sessionId,
            @RequestBody Map<String, String> payload,
            Authentication authentication) {

        // 1. Validate authenticated tutor
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "Please log in"));
        }

        String email = authentication.getName();

        Optional<Users> optionalUsers = userrepo.findByEmail(email);
        if(optionalUsers.isEmpty()){
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "tutor not found"));

        }
        Users tutor = optionalUsers.get();
        if (tutor == null || !"TUTOR".equalsIgnoreCase(tutor.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only tutors can reschedule sessions"));
        }

        // 2. Find the individual session
        Optional<Session> optionalSession = sessionRepo.findById(sessionId);

        if (optionalSession.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "Session not found"));
        }

        Session session = optionalSession.get();

        // 3. Ensure this session belongs to the authenticated tutor
        if (!tutor.getId().equals(session.getTutorId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "You cannot reschedule this session"));
        }

        // 4. Only upcoming sessions can be rescheduled
        if (session.getSessionStatus() != SessionStatus.UPCOMING) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Only upcoming sessions can be rescheduled"
                    ));
        }

        // 5. Validate the requested times
        String start = payload.get("newStartTime");
        String end = payload.get("newEndTime");

        if (start == null || end == null
                || start.isBlank() || end.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Start and end times are required"));
        }

        try {
            LocalTime newStartTime = LocalTime.parse(start);
            LocalTime newEndTime = LocalTime.parse(end);

            if (!newEndTime.isAfter(newStartTime)) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "End time must be after start time"
                        ));
            }

            // 6. Keep the original session date
            LocalDate sessionDate = session.getSessionDate();

            LocalDateTime newScheduleStart =
                    LocalDateTime.of(sessionDate, newStartTime);

            LocalDateTime newScheduleEnd =
                    LocalDateTime.of(sessionDate, newEndTime);

            // Do not allow a new start time in the past
            LocalDateTime now = LocalDateTime.now(
                    ZoneId.of("Asia/Kolkata")
            );

            if (newScheduleStart.isBefore(now)) {
                return ResponseEntity.badRequest()
                        .body(Map.of(
                                "message",
                                "The new session time cannot be in the past"
                        ));
            }

            // 7. Update this Session only
            session.setScheduleStart(newScheduleStart);
            session.setScheduleEnd(newScheduleEnd);

            sessionRepo.save(session);

            return ResponseEntity.ok(Map.of(
                    "message", "Session rescheduled successfully",
                    "sessionId", session.getId(),
                    "sessionDate", session.getSessionDate().toString(),
                    "scheduleStart", newScheduleStart.toString(),
                    "scheduleEnd", newScheduleEnd.toString(),
                    "sessionStatus", session.getSessionStatus().name()
            ));

        } catch (java.time.format.DateTimeParseException e) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Invalid time format. Use HH:mm, for example 16:00"
                    ));
        }
    }
    @GetMapping("/get-tutor-history")
    public ResponseEntity<?> getTutorHistory(Authentication authentication){
        if(authentication==null || !authentication.isAuthenticated()){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        String tutor_email = authentication.getName();
        Optional<Users> optionalUsers = userrepo.findByEmail(tutor_email);
        if(optionalUsers.isEmpty()){
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", "User not found"));
        }
        Users tutor = optionalUsers.get();

        List<SessionStatus> statuses = List.of(
                SessionStatus.APPROVED,
                SessionStatus.DISPUTED,
                SessionStatus.AWAITING_VERIFICATION,
                SessionStatus.MISSED
        );
        List<Session> history = sessionRepo.findByTutorIdAndSessionStatusInOrderByScheduleStartDesc(tutor.getId(),statuses);
        return ResponseEntity.ok(Map.of(
                "message", "tutor history fetched successfully",
                "history", history
        ));
    }


}
