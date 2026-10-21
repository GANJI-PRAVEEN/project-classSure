package com.example.backend.repo;

import com.example.backend.model.EducationCategory;
import org.springframework.data.mongodb.repository.MongoRepository;

public interface EducationCategoryRepo extends MongoRepository<EducationCategory,String> {
}
