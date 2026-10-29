package com.example.backend.repo;

import com.example.backend.enums.SessionStatus;
import com.example.backend.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SessionRepo extends MongoRepository<Session,String> {
    Optional<Session> findById(String sessionId);

    Boolean existsByScheduleIdAndSessionDate(String scheduleId, LocalDate sessionDate);

    List<Session> findAllByTutorId(String tutorId);

    List<Session> findAllByParentIdAndSessionStatus(String parentId, SessionStatus sessionStatus);

    List<Session> findAllByParentIdOrderBySessionDate(String parentId);

    List<Session> findByTutorIdAndSessionStatusInOrderByScheduleStartDesc(String tutorId, List<SessionStatus> sessionStatuses);

    List<Session> findAllBySessionStatusAndSessionDateBefore(SessionStatus sessionStatus, LocalDate sessionDateBefore);
}
