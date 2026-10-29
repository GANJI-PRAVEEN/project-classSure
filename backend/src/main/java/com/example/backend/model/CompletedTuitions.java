package com.example.backend.model;

import org.springframework.data.annotation.Id;

import java.time.Instant;
import java.time.LocalDate;

public class CompletedTuitions {
    @Id
    private String id;

    private String sessionId;
    private String scheduleId;

    private String tutorId;
    private String parentId;
    private String childId;

    private LocalDate sessionDate;

    private Instant actualStart;
    private Instant actualEnd;

    private Double verifiedDurationHours;
    private Double hourlyRate;
    private Double earnedAmount;

    private String reviewStatus; // APPROVED
    private Instant approvedAt;

    public CompletedTuitions() {
    }

    @Override
    public String toString() {
        return "CompletedTuitions{" +
                "id='" + id + '\'' +
                ", sessionId='" + sessionId + '\'' +
                ", scheduleId='" + scheduleId + '\'' +
                ", tutorId='" + tutorId + '\'' +
                ", parentId='" + parentId + '\'' +
                ", childId='" + childId + '\'' +
                ", sessionDate=" + sessionDate +
                ", actualStart=" + actualStart +
                ", actualEnd=" + actualEnd +
                ", verifiedDurationHours=" + verifiedDurationHours +
                ", hourlyRate=" + hourlyRate +
                ", earnedAmount=" + earnedAmount +
                ", reviewStatus='" + reviewStatus + '\'' +
                ", approvedAt=" + approvedAt +
                '}';
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
    }

    public String getSessionId() {
        return sessionId;
    }

    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }

    public String getScheduleId() {
        return scheduleId;
    }

    public void setScheduleId(String scheduleId) {
        this.scheduleId = scheduleId;
    }

    public String getTutorId() {
        return tutorId;
    }

    public void setTutorId(String tutorId) {
        this.tutorId = tutorId;
    }

    public String getParentId() {
        return parentId;
    }

    public void setParentId(String parentId) {
        this.parentId = parentId;
    }

    public String getChildId() {
        return childId;
    }

    public void setChildId(String childId) {
        this.childId = childId;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
    }

    public Instant getActualStart() {
        return actualStart;
    }

    public void setActualStart(Instant actualStart) {
        this.actualStart = actualStart;
    }

    public Instant getActualEnd() {
        return actualEnd;
    }

    public void setActualEnd(Instant actualEnd) {
        this.actualEnd = actualEnd;
    }

    public Double getVerifiedDurationHours() {
        return verifiedDurationHours;
    }

    public void setVerifiedDurationHours(Double verifiedDurationHours) {
        this.verifiedDurationHours = verifiedDurationHours;
    }

    public Double getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(Double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }

    public Double getEarnedAmount() {
        return earnedAmount;
    }

    public void setEarnedAmount(Double earnedAmount) {
        this.earnedAmount = earnedAmount;
    }

    public String getReviewStatus() {
        return reviewStatus;
    }

    public void setReviewStatus(String reviewStatus) {
        this.reviewStatus = reviewStatus;
    }

    public Instant getApprovedAt() {
        return approvedAt;
    }

    public void setApprovedAt(Instant approvedAt) {
        this.approvedAt = approvedAt;
    }
}
