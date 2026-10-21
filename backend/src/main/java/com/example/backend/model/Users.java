package com.example.backend.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.List;

@Document(collection = "users")
public class Users {
    @Id
    private String id;
    private String fullName;

    @Indexed(unique = true)
    private String email;
    
    private String password;
    private String role;
    private List<String> subjectIds;
    private String degreeId;
    private String about;
    private Instant createdAt;
    private ParentLocation parentLocation;

    public Users() {
    }

    @Override
    public String toString() {
        return "Users{" +
                "id='" + id + '\'' +
                ", fullName='" + fullName + '\'' +
                ", email='" + email + '\'' +
                ", password='" + password + '\'' +
                ", role='" + role + '\'' +
                ", subjectIds=" + subjectIds +
                ", degreeId='" + degreeId + '\'' +
                ", about='" + about + '\'' +
                ", createdAt=" + createdAt +
                ", parentLocation=" + parentLocation +
                '}';
    }

    public ParentLocation getParentLocation() {
        return parentLocation;
    }

    public void setParentLocation(ParentLocation parentLocation) {
        this.parentLocation = parentLocation;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public List<String> getSubjectIds() {
        return subjectIds;
    }

    public void setSubjectIds(List<String> subjectIds) {
        this.subjectIds = subjectIds;
    }

    public String getDegreeId() {
        return degreeId;
    }

    public void setDegreeId(String degreeId) {
        this.degreeId = degreeId;
    }

    public String getAbout() {
        return about;
    }

    public void setAbout(String about) {
        this.about = about;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
}