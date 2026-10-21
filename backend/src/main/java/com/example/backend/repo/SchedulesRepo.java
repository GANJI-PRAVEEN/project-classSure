package com.example.backend.repo;

import com.example.backend.model.Schedule;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface SchedulesRepo extends MongoRepository<Schedule,String> {
}
