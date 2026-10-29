package com.example.backend.model;

import com.example.backend.enums.SessionStatus;

import java.time.Instant;
import java.time.LocalDate;
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
    private LocalDate sessionDate;

    private Instant actualStart;
    private Instant actualEnd;

    private Long durationMinutes;

    private Double hourlyRate;

    // Dispute section
    private String disputedReason;
    private String disputedExplanation;
    private String tutorDisputeReason;
    private Instant tutorDisputeReasonAt;
    private Instant disputedAt;

    //Correct Duration Section
    private Integer correctedDurationMinutes;
    private String durationCorrectionReason;
    private String durationCorrectionNotes;
    private Instant correctedAt;



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
                ", sessionStatus=" + sessionStatus +
                ", scheduleStart=" + scheduleStart +
                ", scheduleEnd=" + scheduleEnd +
                ", sessionDate=" + sessionDate +
                ", actualStart=" + actualStart +
                ", actualEnd=" + actualEnd +
                ", durationMinutes=" + durationMinutes +
                ", hourlyRate=" + hourlyRate +
                ", disputedReason='" + disputedReason + '\'' +
                ", disputedExplanation='" + disputedExplanation + '\'' +
                ", tutorDisputeReason='" + tutorDisputeReason + '\'' +
                ", tutorDisputeReasonAt=" + tutorDisputeReasonAt +
                ", disputedAt=" + disputedAt +
                '}';
    }

    public Integer getCorrectedDurationMinutes() {
        return correctedDurationMinutes;
    }

    public void setCorrectedDurationMinutes(Integer correctedDurationMinutes) {
        this.correctedDurationMinutes = correctedDurationMinutes;
    }

    public String getDurationCorrectionReason() {
        return durationCorrectionReason;
    }

    public void setDurationCorrectionReason(String durationCorrectionReason) {
        this.durationCorrectionReason = durationCorrectionReason;
    }

    public String getDurationCorrectionNotes() {
        return durationCorrectionNotes;
    }

    public void setDurationCorrectionNotes(String durationCorrectionNotes) {
        this.durationCorrectionNotes = durationCorrectionNotes;
    }

    public Instant getCorrectedAt() {
        return correctedAt;
    }

    public void setCorrectedAt(Instant correctedAt) {
        this.correctedAt = correctedAt;
    }

    public Instant getTutorDisputeReasonAt() {
        return tutorDisputeReasonAt;
    }

    public void setTutorDisputeReasonAt(Instant tutorDisputeReasonAt) {
        this.tutorDisputeReasonAt = tutorDisputeReasonAt;
    }

    public String getTutorDisputeReason() {
        return tutorDisputeReason;
    }

    public void setTutorDisputeReason(String tutorDisputeReason) {
        this.tutorDisputeReason = tutorDisputeReason;
    }

    public String getDisputedExplanation() {
        return disputedExplanation;
    }

    public void setDisputedExplanation(String disputedExplanation) {
        this.disputedExplanation = disputedExplanation;
    }

    public String getDisputedReason() {
        return disputedReason;
    }

    public void setDisputedReason(String disputedReason) {
        this.disputedReason = disputedReason;
    }

    public Instant getDisputedAt() {
        return disputedAt;
    }

    public void setDisputedAt(Instant disputedAt) {
        this.disputedAt = disputedAt;
    }

    public LocalDate getSessionDate() {
        return sessionDate;
    }

    public void setSessionDate(LocalDate sessionDate) {
        this.sessionDate = sessionDate;
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
