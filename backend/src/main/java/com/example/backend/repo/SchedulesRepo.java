package com.example.backend.repo;

import com.example.backend.model.Schedule;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface SchedulesRepo extends MongoRepository<Schedule,String> {
    List<Schedule> findAllByParentId(String parentId);
    List<Schedule> findAllByChildId(String childId);
    List<Schedule> findAllByTutorIdAndStatus(String tutorId,String status);
    List<Schedule> findAllByStatus(String status);
}
