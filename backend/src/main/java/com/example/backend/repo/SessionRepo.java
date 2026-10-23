package com.example.backend.repo;

import com.example.backend.model.Session;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SessionRepo extends MongoRepository<Session,String> {
}
