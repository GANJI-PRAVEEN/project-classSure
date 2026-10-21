package com.example.backend.repo;

import com.example.backend.model.Boards;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface BoardRepo extends MongoRepository<Boards,String> {
}
