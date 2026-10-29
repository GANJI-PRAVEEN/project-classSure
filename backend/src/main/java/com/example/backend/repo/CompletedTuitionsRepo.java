package com.example.backend.repo;

import com.example.backend.model.CompletedTuitions;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface CompletedTuitionsRepo extends MongoRepository<CompletedTuitions,String> {
    List<CompletedTuitions> findAllByTutorId(String tutorId);

    List<CompletedTuitions> findAllByParentIdOrderBySessionDate(String parentId);

    Optional<CompletedTuitions> findBySessionId(String sessionId);
}
