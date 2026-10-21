package com.example.backend.controller;


import com.example.backend.model.*;
import com.example.backend.repo.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.IntStream;

@RestController
@RequestMapping("/static_data")
public class DataController {

    @Autowired
    public DegreeRepo degreeRepo;
    @Autowired
    public EducationCategoryRepo educationCategoryRepo;
    @Autowired
    private BoardRepo boardRepo;
    @Autowired
    private SubjectRepo subjectRepo;
    @Autowired
    private Userrepo userrepo;

    @GetMapping("/degrees-data")
    public List<Degrees> getDegreeData(){
        return degreeRepo.findAll();
    }

    @GetMapping("/education_category-data")
    public List<EducationCategory> getEducationCategory(){
        return educationCategoryRepo.findAll();
    }
    @GetMapping("/boards-data")
    public List<Boards> getBoardDetails(){
        return boardRepo.findAll();
    }
    @GetMapping("/subjects-data")
    public List<Subjects> getSubjects(){
        return subjectRepo.findAll();
    }
    @GetMapping("/grades-data")
    public List<String> getGrades(@RequestParam String category) {

        return switch (category.toUpperCase()) {

            case "SCHOOL" ->
                    IntStream.rangeClosed(1, 10)
                            .mapToObj(i -> "Class " + i)
                            .toList();

            case "INTERMEDIATE" ->
                    List.of("First Year", "Second Year");

            case "DIPLOMA" ->
                    IntStream.rangeClosed(1, 6)
                            .mapToObj(i -> "Semester " + i)
                            .toList();

            case "UNDERGRADUATE" ->
                    List.of(
                            "First Year",
                            "Second Year",
                            "Third Year",
                            "Fourth Year"
                    );

            case "POSTGRADUATE" ->
                    List.of("First Year", "Second Year");

            case "COMPETITIVE_EXAMS" ->
                    List.of(
                            "Foundation",
                            "Intermediate Preparation",
                            "Advanced Preparation"
                    );

            default -> List.of();
        };
    }
    @PostMapping("/education_category_id")
    public EducationCategory getEducationCategoryDetails(@RequestBody String id){
////        System.out.println("fetching category");
////        System.out.println("Received category ID "+id);
//        id = id.trim();
//
//        if (id.startsWith("\"") && id.endsWith("\"")) {
//            id = id.substring(1, id.length() - 1);
//        }
        id = id.trim().replaceAll("^\"|\"$", "");

        System.out.println("Clean category ID: " + id);
        EducationCategory category = educationCategoryRepo.findById(id).orElseThrow(() -> new UsernameNotFoundException("Education category not found with this ID"));
        System.out.println("Category found: " + category.getId());
        return category;
    }
    @PostMapping("/get-board-id")
    public Boards getBoardsDetails(@RequestBody String id){
        id = id.trim().replaceAll("^\"|\"$", "");
        return boardRepo.findById(id).orElseThrow(() -> new UsernameNotFoundException("board not found with this ID"));
    }
    @PostMapping("/get-tutor-id")
    public Users getTutorDetails(@RequestBody String id){
        id = id.trim().replaceAll("^\"|\"$", "");
        return userrepo.findById(id).orElseThrow(() -> new UsernameNotFoundException("tutor not found with this ID"));
    }
    @PostMapping("/get-subjects-withIds")
    public List<Subjects> getSubjectWithIds(@RequestBody List<String>subjectIds){
        return subjectRepo.findAllByIdIn(subjectIds);
    }
}
