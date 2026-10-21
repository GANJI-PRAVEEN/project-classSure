package com.example.backend.model;

public class ParentLocation {
    private String address;
    private Double longitude;
    private Double latitude;
    private String pincode;

    public ParentLocation() {
    }

    @Override
    public String toString() {
        return "ParentLocation{" +
                "address='" + address + '\'' +
                ", longitude='" + longitude + '\'' +
                ", latitude='" + latitude + '\'' +
                ", pincode='" + pincode + '\'' +
                '}';
    }

    public String getPincode() {
        return pincode;
    }

    public void setPincode(String pincode) {
        this.pincode = pincode;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public Double getLongitude() {
        return longitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public Double getLatitude() {
        return latitude;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }
}
