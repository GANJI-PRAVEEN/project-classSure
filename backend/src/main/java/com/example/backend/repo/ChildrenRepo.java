package com.example.backend.repo;

import com.example.backend.model.Children;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ChildrenRepo extends MongoRepository<Children,String> {
    List<Children> findAllByParentId(String parentId);
}
