package com.example.backend.repo;

import com.example.backend.model.Users;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface Userrepo extends MongoRepository<Users,String>{
    Optional<Users> findByEmail(String email);
}
