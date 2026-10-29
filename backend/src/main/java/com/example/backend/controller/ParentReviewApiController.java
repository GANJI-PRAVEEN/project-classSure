package com.example.backend.controller;

import com.example.backend.enums.SessionStatus;
import com.example.backend.model.CompletedTuitions;
import com.example.backend.model.Session;
import com.example.backend.model.Users;
import com.example.backend.repo.CompletedTuitionsRepo;
import com.example.backend.repo.SessionRepo;
import com.example.backend.repo.Userrepo;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.http.HttpStatus;
import org.springframework.http.RequestEntity;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/parent/review")
public class ParentReviewApiController {

    private final SessionRepo sessionRepo;
    private final Userrepo userrepo;
    private final CompletedTuitionsRepo completedTuitionsRepo;

    public ParentReviewApiController(SessionRepo sessionRepo, Userrepo userrepo, CompletedTuitionsRepo completedTuitionsRepo) {
        this.sessionRepo = sessionRepo;
        this.userrepo = userrepo;
        this.completedTuitionsRepo = completedTuitionsRepo;
    }

    @GetMapping("/pending-sessions")
    public ResponseEntity<?> getPendingSessions(Authentication authentication){
        System.out.println("Pending sessions");
        if(authentication==null || !authentication.isAuthenticated()){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        String email = authentication.getName();

        Users parent = userrepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Parent not found"));

        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only parents can view pending sessions"));
        }
        List<Session> pendingSessions = sessionRepo.findAllByParentIdAndSessionStatus(
                parent.getId(),
                SessionStatus.AWAITING_VERIFICATION
        );
        return ResponseEntity.ok(Map.of(
                "message", "Pending sessions fetched successfully",
                "data", pendingSessions
        ));
    }

    @PostMapping("/sessions/{sessionId}/approve")
    public ResponseEntity<?> ApproveSession(Authentication authentication, @PathVariable String sessionId){
        if(authentication==null || !authentication.isAuthenticated()){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        String email = authentication.getName();

        Users parent = userrepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Parent not found"));

        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only parents can view pending sessions"));
        }
        Optional<Session> curSession = sessionRepo.findById(sessionId);
        if(curSession.isEmpty()){
            return ResponseEntity.ok(Map.of(
                    "message", "current sessions not available "
            ));
        }
        Session session  = curSession.get();

        // Calculate the verified duration (prioritize parent-corrected duration if present)
        double durationHours;
        if (session.getCorrectedDurationMinutes() != null && session.getCorrectedDurationMinutes() > 0) {
            durationHours = session.getCorrectedDurationMinutes() / 60.0;
        } else if (session.getActualStart() != null && session.getActualEnd() != null) {
            durationHours = java.time.Duration.between(
                    session.getActualStart(),
                    session.getActualEnd()
            ).toSeconds() / 3600.0;
        } else if (session.getDurationMinutes() != null && session.getDurationMinutes() > 0) {
            durationHours = session.getDurationMinutes() / 60.0;
        } else {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Session start or end time is missing"));
        }

        if (durationHours <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid session duration"));
        }
        if (session.getHourlyRate() == null || session.getHourlyRate() <= 0) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Invalid session hourly rate"));
        }

        double earnedAmount = durationHours * session.getHourlyRate();
        CompletedTuitions completedTuitions = completedTuitionsRepo.findBySessionId(session.getId())
                .orElse(new CompletedTuitions());
        completedTuitions.setChildId(session.getChildId());
        completedTuitions.setSessionId(session.getId());
        completedTuitions.setScheduleId(session.getScheduleId());
        completedTuitions.setTutorId(session.getTutorId());
        completedTuitions.setParentId(session.getParentId());
        completedTuitions.setSessionDate(session.getSessionDate());
        completedTuitions.setActualStart(session.getActualStart());
        completedTuitions.setActualEnd(session.getActualEnd());
        completedTuitions.setVerifiedDurationHours(durationHours);
        completedTuitions.setHourlyRate(session.getHourlyRate());
        completedTuitions.setEarnedAmount(earnedAmount);
        completedTuitions.setReviewStatus("APPROVED");
        completedTuitions.setApprovedAt(Instant.now());

        // Update the original session
        session.setSessionStatus(SessionStatus.APPROVED);

        // Persist both records
        completedTuitionsRepo.save(completedTuitions);
        sessionRepo.save(session);


        return ResponseEntity.ok(Map.of(
                "message", "Session approved and tuition earning recorded successfully",
                "data", completedTuitions
        ));
    }

    @GetMapping("/history")
    public ResponseEntity<?> getReviewHistory(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "User not authenticated"));
        }
        String email = authentication.getName();

        Users parent = userrepo.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Parent not found"));

        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only parents can view review history"));
        }

        List<Session> approvedSessions = sessionRepo.findAllByParentIdAndSessionStatus(
                parent.getId(),
                SessionStatus.APPROVED
        );
        List<Session> disputedSessions = sessionRepo.findAllByParentIdAndSessionStatus(
                parent.getId(),
                SessionStatus.DISPUTED
        );

        List<Session> historySessions = new java.util.ArrayList<>();
        if (approvedSessions != null) {
            // Ensure any approved session has its CompletedTuitions record recorded
            for (Session s : approvedSessions) {
                if (completedTuitionsRepo.findBySessionId(s.getId()).isEmpty()) {
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
                    }
                }
            }
            historySessions.addAll(approvedSessions);
        }
        if (disputedSessions != null) historySessions.addAll(disputedSessions);

        return ResponseEntity.ok(Map.of(
                "message", "Review history fetched successfully",
                "data", historySessions
        ));
    }

    @PostMapping("/sessions/{sessionId}/dispute")
    public ResponseEntity<?> disputeSession(@PathVariable String sessionId,@RequestBody Map<String,String>payload,Authentication authentication) {
        // 1. Check authentication
        if (authentication == null ||
                !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message", "User not authenticated"
                    ));
        }
        // 2. Find the logged-in parent
        String email = authentication.getName();

        Users parent = userrepo.findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Parent not found"
                        ));


        // 3. Verify the user's role
        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message", "Only parents can dispute sessions"
                    ));
        }
        // 4. Validate the dispute reason
        String disputeReason = payload.get("reason");
        String explanation = payload.get("explanation");
        if (disputeReason == null || disputeReason.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message", "Dispute reason is required"
                    ));
        }
        if (explanation == null || explanation.isBlank()) {
            return ResponseEntity.badRequest()
                    .body(Map.of("message", "Dispute explanation is required"));
        }

        // 5. Find the session
        Session session = sessionRepo.findById(sessionId)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Session not found"
                        ));
        // 6. Verify that this session belongs to the parent
        if (!parent.getId().equals(session.getParentId())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message", "You cannot dispute this session"
                    ));
        }
        // 7. Only allow disputes for sessions awaiting review
        if (session.getSessionStatus()
                != SessionStatus.AWAITING_VERIFICATION) {
            return ResponseEntity.badRequest()
                    .body(Map.of(
                            "message",
                            "Only sessions awaiting verification can be disputed"
                    ));
        }
        // 8. Save the dispute
        session.setDisputedReason(disputeReason);
        session.setDisputedExplanation(explanation);
        session.setDisputedAt(Instant.now());
        session.setSessionStatus(SessionStatus.DISPUTED);

        Session savedSession = sessionRepo.save(session);
        // 9. Return the result
        return ResponseEntity.ok(Map.of(
                "message", "Session disputed successfully",
                "data", savedSession
        ));

    }
    @PostMapping("/sessions/{sessionId}/correct-duration")
    public ResponseEntity<Map<String, Object>> correctDuration(@PathVariable String sessionId, Authentication authentication, @RequestBody Map<String,Object>payload){
        // 1. Check authentication
        if (authentication == null ||
                !authentication.isAuthenticated()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "message", "User not authenticated"
                    ));
        }
        // 2. Find the logged-in parent
        String email = authentication.getName();

        Users parent = userrepo.findByEmail(email)
                .orElseThrow(() ->
                        new ResponseStatusException(
                                HttpStatus.NOT_FOUND,
                                "Parent not found"
                        ));


        // 3. Verify the user's role
        if (!"PARENT".equalsIgnoreCase(parent.getRole())) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message", "Only parents can correct sessions"
                    ));
        }
        Optional<Session> optionalSession = sessionRepo.findById(sessionId);
        if(optionalSession.isEmpty()){
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of(
                            "message", "session is not present"
                    ));
        }

        Integer correctedMinutes = null;
        Object correctedMinutesObj = payload.get("correctedMinutes");
        if (correctedMinutesObj instanceof Number) {
            correctedMinutes = ((Number) correctedMinutesObj).intValue();
        }

        String reason = (String) payload.get("reason");
        String notes = (String) payload.get("notes");
        Session session = optionalSession.get();
        session.setCorrectedDurationMinutes(correctedMinutes);
        session.setDurationCorrectionReason(reason);
        session.setDurationCorrectionNotes(notes);
        session.setSessionStatus(SessionStatus.APPROVED);
        sessionRepo.save(session);

        // Record completed tuition with the approved edited duration
        double durationHours = (correctedMinutes != null && correctedMinutes > 0)
                ? (correctedMinutes / 60.0)
                : ((session.getActualStart() != null && session.getActualEnd() != null)
                    ? (java.time.Duration.between(session.getActualStart(), session.getActualEnd()).toSeconds() / 3600.0)
                    : (session.getDurationMinutes() != null ? session.getDurationMinutes() / 60.0 : 0.0));

        double hourlyRate = session.getHourlyRate() != null ? session.getHourlyRate() : 0.0;
        double earnedAmount = durationHours * hourlyRate;

        CompletedTuitions completedTuitions = completedTuitionsRepo.findBySessionId(session.getId())
                .orElse(new CompletedTuitions());
        completedTuitions.setChildId(session.getChildId());
        completedTuitions.setSessionId(session.getId());
        completedTuitions.setScheduleId(session.getScheduleId());
        completedTuitions.setTutorId(session.getTutorId());
        completedTuitions.setParentId(session.getParentId());
        completedTuitions.setSessionDate(session.getSessionDate());
        completedTuitions.setActualStart(session.getActualStart());
        completedTuitions.setActualEnd(session.getActualEnd());
        completedTuitions.setVerifiedDurationHours(durationHours);
        completedTuitions.setHourlyRate(hourlyRate);
        completedTuitions.setEarnedAmount(earnedAmount);
        completedTuitions.setReviewStatus("APPROVED");
        completedTuitions.setApprovedAt(Instant.now());
        completedTuitionsRepo.save(completedTuitions);

        return ResponseEntity.ok(Map.of(
                "message", "Session correction successful and completed tuition recorded",
                "data", completedTuitions
        ));

    }
}
