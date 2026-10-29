package com.example.backend.Scheduled;

import com.example.backend.enums.SessionStatus;
import com.example.backend.model.Schedule;
import com.example.backend.model.Session;
import com.example.backend.repo.SchedulesRepo;
import com.example.backend.repo.SessionRepo;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;

@Component
public class DailySessionScheduler {
    private final SchedulesRepo schedulesRepo;
    private final SessionRepo sessionRepo;
    private static final ZoneId ZONE = ZoneId.of("Asia/Kolkata");
    public DailySessionScheduler(SchedulesRepo schedulesRepo,SessionRepo sessionRepo){
        this.schedulesRepo = schedulesRepo;
        this.sessionRepo = sessionRepo;
    }

    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void generateDailySessions(){
        ensureSessionsForDate(LocalDate.now(ZONE));
    }

    private void ensureSessionsForDate(LocalDate today) {
        System.out.println("Genearting records");
        List<Schedule> scheduleList =
                schedulesRepo.findAllByStatus("ACCEPTED");
        for(Schedule schedule:scheduleList){
            //1. check whether the scheule applies today
            if(schedule.getDaysOfWeek()==null ||
                    !schedule.getDaysOfWeek().contains(today.getDayOfWeek())
            ){
                continue;
            }
            //2.Check the schedule's effective start date.
            if(schedule.getEffectiveFrom() == null || today.isBefore(schedule.getEffectiveFrom())){
                continue;
            }
            //3.Check the effective end date, if specified.
            if(schedule.getEffectiveTo()!=null && today.isAfter(schedule.getEffectiveTo())){
                continue;
            }
            // Do not create a duplicate session.
            boolean exists = sessionRepo.existsByScheduleIdAndSessionDate(schedule.getId(),today);
            if(exists)continue;
            Session session = new Session();
            session.setScheduleId(schedule.getId());
            session.setTutorId(schedule.getTutorId());
            session.setParentId(schedule.getParentId());
            session.setChildId(schedule.getChildId());

            session.setSessionDate(today);
            session.setScheduleStart(LocalDateTime.of(today,schedule.getStartTime()));
            session.setScheduleEnd(
                    LocalDateTime.of(today,schedule.getEndTime())
            );
            session.setHourlyRate(schedule.getHourlyRate());
            session.setSessionStatus(SessionStatus.UPCOMING);
            sessionRepo.save(session);
        }
    }
    @Scheduled(cron = "0 0 0 * * *", zone = "Asia/Kolkata")
    public void updateMissedSessions(){
        System.out.println("Updatingold sessions");
        LocalDate today = LocalDate.now(ZONE);
        System.out.println("Current date : "+today);
        List<Session> oldSessions = sessionRepo.findAllBySessionStatusAndSessionDateBefore(
                SessionStatus.UPCOMING,
                today
        );
        System.out.println(oldSessions);
        for(Session session : oldSessions){
            session.setSessionStatus(SessionStatus.MISSED);
        }
        sessionRepo.saveAll(oldSessions);

    }
}
