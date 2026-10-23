
const BASE_URL = "http://localhost:8080";

function getAuthHeader() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getAllChildrensAPI() {
    return fetch(`${BASE_URL}/api/parent/get-childrens`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getStaticEducationCategoryAPI() {
    return fetch(`${BASE_URL}/static_data/education_category-data`);
}

export async function getStaticSubjectsDataAPI() {
    return fetch(`${BASE_URL}/static_data/subjects-data`);
}

export async function validateTutorAPI(tutorEmail) {
    return fetch(`${BASE_URL}/api/parent/validate-tutor`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify({ email: tutorEmail })
    });
}

export async function saveChildAPI(childrenPayload) {
    return fetch(`${BASE_URL}/api/parent/add-child`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(childrenPayload)
    });
}

export async function deleteChildAPI(childId) {
    return fetch(`${BASE_URL}/api/parent/delete-child/${childId}`, {
        method: "DELETE",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getEducationCategoryByIdAPI(id) {
    return fetch(`${BASE_URL}/static_data/education_category_id`, {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
        },
        body: id
    });
}

export async function getBoardByIdAPI(id) {
    return fetch(`${BASE_URL}/static_data/get-board-id`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: id
    });
}

export async function getSubjectsByIdsAPI(subjectIds) {
    return fetch(`${BASE_URL}/static_data/get-subjects-withIds`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(subjectIds)
    });
}


export async function getTutorByIdAPI(tutorId) {
    return fetch(`${BASE_URL}/static_data/get-tutor-id`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(tutorId)
    });
}

export async function saveTempScheduleAPI(schedulePayload) {
    return fetch(`${BASE_URL}/api/parent/save-schedule`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(schedulePayload)
    });
}

export async function getSchedulesAPI() {
    return fetch(`${BASE_URL}/api/parent/get-schedules`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getScheduleByChildIdAPI(childId) {
    return fetch(`${BASE_URL}/api/parent/get-schedule/${childId}`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getAllTutorStudentsAPI(tutorId) {
    return fetch(`${BASE_URL}/api/tutor/get-students/${tutorId}`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getTutorPendingRequestAPI() {
    return fetch(`${BASE_URL}/api/tutor/get-pending-requests`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getParentDetailsAPI(parentId) {
    return fetch(`${BASE_URL}/api/tutor/get-parent-details/${parentId}`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getStudentDetailsAPI(studentId) {
    return fetch(`${BASE_URL}/api/tutor/get-student-details/${studentId}`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function updateScheduleStatusAPI(scheduleId, status) {
    return fetch(`${BASE_URL}/api/tutor/update-schedule-status/${scheduleId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify({ status })
    });
}

/**
 * Calculate tutor session earnings from hourly rate and approved payable minutes.
 * Formula: Hourly rate * (verified payable minutes / 60)
 *
 * @param {number|string} hourlyRate - The agreed hourly tuition fee (₹/hour)
 * @param {number|string} verifiedPayableMinutes - The duration approved through verification
 * @returns {number} Session earnings rounded to 2 decimal places
 */
export function calculateSessionEarnings(hourlyRate, verifiedPayableMinutes) {
    const rate = Number(hourlyRate);
    const minutes = Number(verifiedPayableMinutes);
    if (!rate || rate <= 0 || !minutes || minutes <= 0) {
        return 0;
    }
    return Number(((rate * minutes) / 60).toFixed(2));
}

export async function getTodaySchedulesAPI() {
    return fetch(`${BASE_URL}/api/tutor/get-today-schedules`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}