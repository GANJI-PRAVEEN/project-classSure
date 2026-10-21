package com.example.backend;

import com.example.backend.controller.ParentApisController;
import com.example.backend.model.Children;
import com.example.backend.model.Schedule;
import com.example.backend.model.Users;
import com.example.backend.repo.ChildrenRepo;
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
class ParentScheduleValidationTests {

    @Autowired
    private ParentApisController parentApisController;

    @Autowired
    private Userrepo userrepo;

    @Autowired
    private ChildrenRepo childrenRepo;

    @Autowired
    private SchedulesRepo schedulesRepo;

    private Users testParent;
    private Users testTutor;
    private Authentication parentAuth;

    @BeforeEach
    void setup() {
        // Ensure test parent exists
        String parentEmail = "test_parent_val@example.com";
        Optional<Users> existingParent = userrepo.findByEmail(parentEmail);
        if (existingParent.isPresent()) {
            testParent = existingParent.get();
        } else {
            Users p = new Users();
            p.setEmail(parentEmail);
            p.setFullName("Test Parent");
            p.setRole("PARENT");
            p.setPassword("dummyPassword");
            testParent = userrepo.save(p);
        }

        // Ensure test tutor exists
        String tutorEmail = "test_tutor_val@example.com";
        Optional<Users> existingTutor = userrepo.findByEmail(tutorEmail);
        if (existingTutor.isPresent()) {
            testTutor = existingTutor.get();
        } else {
            Users t = new Users();
            t.setEmail(tutorEmail);
            t.setFullName("Test Tutor");
            t.setRole("TUTOR");
            t.setPassword("dummyPassword");
            testTutor = userrepo.save(t);
        }

        parentAuth = new UsernamePasswordAuthenticationToken(
                testParent.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_PARENT"))
        );
    }

    @Test
    void testScheduleValidation_RejectsEmptyDaysOfWeek() {
        Schedule s = new Schedule();
        s.setDaysOfWeek(List.of());
        s.setStartTime(LocalTime.of(17, 0));
        s.setEndTime(LocalTime.of(18, 0));
        s.setEffectiveFrom(LocalDate.now());

        ResponseEntity<?> res = parentApisController.saveSchedule(s, parentAuth);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("At least one class day"));
    }

    @Test
    void testScheduleValidation_RejectsEndTimeBeforeOrEqualStartTime() {
        Schedule s = new Schedule();
        s.setDaysOfWeek(List.of(DayOfWeek.MONDAY));
        s.setStartTime(LocalTime.of(18, 0));
        s.setEndTime(LocalTime.of(17, 0));
        s.setEffectiveFrom(LocalDate.now());

        ResponseEntity<?> res = parentApisController.saveSchedule(s, parentAuth);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("End time must be later than start time"));

        // Equal times
        s.setEndTime(LocalTime.of(18, 0));
        ResponseEntity<?> res2 = parentApisController.saveSchedule(s, parentAuth);
        assertEquals(HttpStatus.BAD_REQUEST, res2.getStatusCode());
    }

    @Test
    void testScheduleValidation_RejectsEffectiveToBeforeEffectiveFrom() {
        Schedule s = new Schedule();
        s.setDaysOfWeek(List.of(DayOfWeek.MONDAY));
        s.setStartTime(LocalTime.of(17, 0));
        s.setEndTime(LocalTime.of(18, 0));
        s.setEffectiveFrom(LocalDate.of(2026, 11, 1));
        s.setEffectiveTo(LocalDate.of(2026, 10, 1));

        ResponseEntity<?> res = parentApisController.saveSchedule(s, parentAuth);
        assertEquals(HttpStatus.BAD_REQUEST, res.getStatusCode());
        assertTrue(res.getBody().toString().contains("Effective to date must be on or after effective from date"));
    }

    @Test
    void testScheduleCreation_EnforcesPendingStatusAndAssociatesChild() {
        // 1. Create a child
        Children child = new Children();
        child.setName("Test Student");
        child.setTutorId(testTutor.getId());
        child.setParentId(testParent.getId());
        child.setGrade("Class 10");

        ResponseEntity<?> childRes = parentApisController.saveChildren(child, parentAuth);
        assertEquals(HttpStatus.OK, childRes.getStatusCode());
        Children savedChild = (Children) childRes.getBody();
        assertNotNull(savedChild.getId());

        // 2. Create schedule
        Schedule s = new Schedule();
        s.setChildId(savedChild.getId());
        s.setTutorId(testTutor.getId());
        s.setParentId(testParent.getId());
        s.setDaysOfWeek(List.of(DayOfWeek.MONDAY, DayOfWeek.WEDNESDAY, DayOfWeek.FRIDAY));
        s.setStartTime(LocalTime.of(16, 0));
        s.setEndTime(LocalTime.of(17, 0));
        s.setEffectiveFrom(LocalDate.of(2026, 11, 1));
        s.setStatus("ACTIVE"); // Frontend attempting to send ACTIVE

        ResponseEntity<?> scheduleRes = parentApisController.saveSchedule(s, parentAuth);
        assertEquals(HttpStatus.OK, scheduleRes.getStatusCode());
        Schedule savedSched = (Schedule) scheduleRes.getBody();

        // Must be forced to PENDING by backend
        assertEquals("PENDING", savedSched.getStatus());
        assertEquals(savedChild.getId(), savedSched.getChildId());

        // 3. Test rollback cleanup: delete child deletes child and its schedule
        ResponseEntity<?> delRes = parentApisController.deleteChild(savedChild.getId(), parentAuth);
        assertEquals(HttpStatus.OK, delRes.getStatusCode());

        assertTrue(childrenRepo.findById(savedChild.getId()).isEmpty());
        assertTrue(schedulesRepo.findAllByChildId(savedChild.getId()).isEmpty());
    }
}
