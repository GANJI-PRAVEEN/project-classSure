package com.example.backend.model;

import com.example.backend.enums.SessionStatus;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class Session {
    private String id;
    private String scheduleId;
    private String tutorId;
    private String parentId;
    private String childId;

    private SessionStatus sessionStatus;

    private LocalDateTime scheduleStart;
    private LocalDateTime scheduleEnd;

    private Instant actualStart;
    private Instant actualEnd;

    private Long durationMinutes;

    private Double hourlyRate;

    public Session() {
    }

    @Override
    public String toString() {
        return "Session{" +
                "id='" + id + '\'' +
                ", scheduleId='" + scheduleId + '\'' +
                ", tutorId='" + tutorId + '\'' +
                ", parentId='" + parentId + '\'' +
                ", childId='" + childId + '\'' +
                ", scheduleStart=" + scheduleStart +
                ", scheduleEnd=" + scheduleEnd +
                ", actualStart=" + actualStart +
                ", actualEnd=" + actualEnd +
                ", durationMinutes=" + durationMinutes +
                ", hourlyRate=" + hourlyRate +
                '}';
    }

    public SessionStatus getSessionStatus() {
        return sessionStatus;
    }

    public void setSessionStatus(SessionStatus sessionStatus) {
        this.sessionStatus = sessionStatus;
    }

    public String getId() {
        return id;
    }

    public void setId(String id) {
        this.id = id;
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

    public LocalDateTime getScheduleStart() {
        return scheduleStart;
    }

    public void setScheduleStart(LocalDateTime scheduleStart) {
        this.scheduleStart = scheduleStart;
    }

    public LocalDateTime getScheduleEnd() {
        return scheduleEnd;
    }

    public void setScheduleEnd(LocalDateTime scheduleEnd) {
        this.scheduleEnd = scheduleEnd;
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

    public Long getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(Long durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public Double getHourlyRate() {
        return hourlyRate;
    }

    public void setHourlyRate(Double hourlyRate) {
        this.hourlyRate = hourlyRate;
    }
}
