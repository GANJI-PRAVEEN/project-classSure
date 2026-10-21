package com.example.backend.model;

import org.springframework.data.annotation.Id;

public class Subjects {
    @Id
    private String id;
    private String name;
    private String shortName;
    private Boolean active;

    @Override
    public String toString() {
        return "Subjects{" +
                "id='" + id + '\'' +
                ", name='" + name + '\'' +
                ", shortName='" + shortName + '\'' +
                ", active=" + active +
                '}';
    }

    public Subjects() {
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

    public String getShortName() {
        return shortName;
    }

    public void setShortName(String shortName) {
        this.shortName = shortName;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }
}
