package com.example.backend.repo;

import com.example.backend.model.Children;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface ChildrenRepo extends MongoRepository<Children,String> {
    List<Children> findAllByParentId(String parentId);
    List<Children> findAllByTutorId(String tutorId);
    Optional<Children> findById(String studentId);
}
