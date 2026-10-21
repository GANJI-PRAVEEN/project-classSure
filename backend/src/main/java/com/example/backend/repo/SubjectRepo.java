package com.example.backend.repo;

import com.example.backend.model.Subjects;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Collection;
import java.util.List;

public interface SubjectRepo extends MongoRepository<Subjects,String> {
    List<Subjects> findAllByIdIn(Collection<String> ids);
}
