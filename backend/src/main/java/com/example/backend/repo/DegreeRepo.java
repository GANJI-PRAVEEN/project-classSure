package com.example.backend.repo;

import com.example.backend.model.Degrees;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface DegreeRepo extends MongoRepository<Degrees,String> {
}
