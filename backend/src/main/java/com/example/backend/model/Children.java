package com.example.backend.model;

import org.apache.logging.log4j.CloseableThreadContext;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "childrens")
public class Children {
    @Id
    private String id;
    private String name;
    private String parentId;
    private String tutorId;
    private String grade;
    private List<String> subjectIds;
    private String educationCategory;
    private String board;
    private Instant createdAt;

    public Children() {
    }

    @Override
    public String toString() {
        return "Children{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", parentId='" + parentId + '\'' +
                ", tutorId='" + tutorId + '\'' +
                ", grade='" + grade + '\'' +
                ", subjectIds=" + subjectIds +
                ", educationCategory='" + educationCategory + '\'' +
                ", board='" + board + '\'' +
                ", createdAt=" + createdAt +
                '}';
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public String getTutorId() {
        return tutorId;
    }

    public void setTutorId(String tutorId) {
        this.tutorId = tutorId;
    }

    public String getGrade() {
        return grade;
    }

    public void setGrade(String grade) {
        this.grade = grade;
    }

    public List<String> getSubjectIds() {
        return subjectIds;
    }

    public void setSubjectIds(List<String> subjectIds) {
        this.subjectIds = subjectIds;
    }

    public String getEducationCategory() {
        return educationCategory;
    }

    public void setEducationCategory(String educationCategory) {
        this.educationCategory = educationCategory;
    }

    public String getBoard() {
        return board;
    }

    public void setBoard(String board) {
        this.board = board;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}
