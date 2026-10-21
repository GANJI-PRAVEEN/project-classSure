package com.example.backend.repo;

import com.example.backend.model.Children;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface ChildrenRepo extends MongoRepository<Children,String> {
}
