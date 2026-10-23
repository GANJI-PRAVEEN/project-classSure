package com.example.backend;

import com.example.backend.controller.TutorApisController;
import com.example.backend.model.Schedule;
import com.example.backend.model.Users;
import com.example.backend.repo.SchedulesRepo;
import com.example.backend.repo.Userrepo;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class TutorScheduleStatusTest {

    @Autowired
    private TutorApisController tutorApisController;

    @Autowired
    private Userrepo userrepo;

    @Autowired
    private SchedulesRepo schedulesRepo;

    private Users testTutor;
    private Users testOtherTutor;
    private Authentication tutorAuth;

    @BeforeEach
    void setup() {
        String tutorEmail = "test_tutor_status@example.com";
        Optional<Users> existingTutor = userrepo.findByEmail(tutorEmail);
        if (existingTutor.isPresent()) {
            testTutor = existingTutor.get();
        } else {
            Users t = new Users();
            t.setEmail(tutorEmail);
            t.setFullName("Test Tutor Status");
            t.setRole("TUTOR");
            t.setPassword("dummyPassword");
            testTutor = userrepo.save(t);
        }

        String otherTutorEmail = "test_other_tutor_status@example.com";
        Optional<Users> existingOther = userrepo.findByEmail(otherTutorEmail);
        if (existingOther.isPresent()) {
            testOtherTutor = existingOther.get();
        } else {
            Users o = new Users();
            o.setEmail(otherTutorEmail);
            o.setFullName("Test Other Tutor");
            o.setRole("TUTOR");
            o.setPassword("dummyPassword");
            testOtherTutor = userrepo.save(o);
        }

        tutorAuth = new UsernamePasswordAuthenticationToken(
                testTutor.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_TUTOR"))
        );
    }

    private Schedule createPendingSchedule(String tutorId) {
        Schedule s = new Schedule();
        s.setTutorId(tutorId);
        s.setParentId("dummyParentId");
        s.setChildId("dummyChildId");
        s.setDaysOfWeek(List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY));
        s.setStartTime(LocalTime.of(16, 0));
        s.setEndTime(LocalTime.of(17, 0));
        s.setEffectiveFrom(LocalDate.now());
        s.setStatus("PENDING");
        return schedulesRepo.save(s);
    }

    @Test
    void testAcceptSchedule_SuccessUpdatesMongoDB() {
        Schedule s = createPendingSchedule(testTutor.getId());

        ResponseEntity<Map<String, Object>> response = tutorApisController.updateScheduleStatus(
                s.getId(),
                Map.of("status", "ACCEPTED"),
                tutorAuth
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Schedule status updated successfully", response.getBody().get("message"));

        // Verify MongoDB updated
        Optional<Schedule> inDb = schedulesRepo.findById(s.getId());
        assertTrue(inDb.isPresent());
        assertEquals("ACCEPTED", inDb.get().getStatus());

        // Cleanup
        schedulesRepo.deleteById(s.getId());
    }

    @Test
    void testRejectSchedule_SuccessUpdatesMongoDB() {
        Schedule s = createPendingSchedule(testTutor.getId());

        ResponseEntity<Map<String, Object>> response = tutorApisController.updateScheduleStatus(
                s.getId(),
                Map.of("status", "REJECTED"),
                tutorAuth
        );

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Schedule status updated successfully", response.getBody().get("message"));

        // Verify MongoDB updated
        Optional<Schedule> inDb = schedulesRepo.findById(s.getId());
        assertTrue(inDb.isPresent());
        assertEquals("REJECTED", inDb.get().getStatus());

        // Cleanup
        schedulesRepo.deleteById(s.getId());
    }

    @Test
    void testUpdateSchedule_ScheduleNotFound() {
        ResponseEntity<Map<String, Object>> response = tutorApisController.updateScheduleStatus(
                "non_existent_schedule_id_12345",
                Map.of("status", "ACCEPTED"),
                tutorAuth
        );

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Schedule not found", response.getBody().get("message"));
    }

    @Test
    void testUpdateSchedule_InvalidStatus() {
        Schedule s = createPendingSchedule(testTutor.getId());

        ResponseEntity<Map<String, Object>> response = tutorApisController.updateScheduleStatus(
                s.getId(),
                Map.of("status", "INVALID_STATUS"),
                tutorAuth
        );

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().get("message").toString().contains("Invalid status"));

        // Verify MongoDB status was not modified
        Optional<Schedule> inDb = schedulesRepo.findById(s.getId());
        assertTrue(inDb.isPresent());
        assertEquals("PENDING", inDb.get().getStatus());

        // Cleanup
        schedulesRepo.deleteById(s.getId());
    }

    @Test
    void testUpdateSchedule_UnauthorizedOtherTutor() {
        Schedule s = createPendingSchedule(testOtherTutor.getId());

        ResponseEntity<Map<String, Object>> response = tutorApisController.updateScheduleStatus(
                s.getId(),
                Map.of("status", "ACCEPTED"),
                tutorAuth
        );

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Unauthorized to update this schedule", response.getBody().get("message"));

        // Verify MongoDB status was not modified
        Optional<Schedule> inDb = schedulesRepo.findById(s.getId());
        assertTrue(inDb.isPresent());
        assertEquals("PENDING", inDb.get().getStatus());

        // Cleanup
        schedulesRepo.deleteById(s.getId());
    }
}
