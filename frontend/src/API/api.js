
const BASE_URL = import.meta.env.VITE_API_BASE_URL;
console.log("API Base URL:", BASE_URL);

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

export async function updateChildAPI(childId, childrenPayload) {
    try {
        const res = await fetch(`${BASE_URL}/api/parent/update-child/${childId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(childrenPayload)
        });
        if (res.ok) return res;
        return await fetch(`${BASE_URL}/api/parent/add-child`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({ ...childrenPayload, id: childId })
        });
    } catch {
        return await fetch(`${BASE_URL}/api/parent/add-child`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({ ...childrenPayload, id: childId })
        });
    }
}

export async function updateScheduleAPI(scheduleId, schedulePayload) {
    return fetch(`${BASE_URL}/api/parent/update-schedule/${scheduleId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(schedulePayload)
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
    return fetch(`${BASE_URL}/api/tutor/get-schedule/${childId}`, {
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

export async function getTutorSchedulesAPI() {
    return fetch(`${BASE_URL}/api/tutor/get-schedules`, {
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

export async function getTodaySessionsAPI() {
    return fetch(`${BASE_URL}/api/tutor/get-today-sessions`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getParentTodaySessionsAPI() {
    return fetch(`${BASE_URL}/api/parent/get-today-sessions`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}
export async function startSessionAPI(sessionId) {
    return fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/start`, {
        method: "POST",
        headers: {
            ...getAuthHeader()
        }
    });
}
export async function endSessionAPI(sessionId) {
    return fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/end`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        }
    });
}

export async function getPendingReviewSessionsAPI() {
    try {
        const res = await fetch(`${BASE_URL}/api/parent/review/pending-sessions`, {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        });
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back to /review/pending-sessions
    }
    return fetch(`${BASE_URL}/review/pending-sessions`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getReviewHistoryAPI() {
    try {
        const res = await fetch(`${BASE_URL}/api/parent/review/history`, {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        });
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back
    }
    return fetch(`${BASE_URL}/review/history`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function approveSessionAPI(sessionId, payload = null) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        ...(payload ? { body: JSON.stringify(payload) } : {})
    };
    try {
        const res = await fetch(`${BASE_URL}/api/parent/review/sessions/${sessionId}/approve`, options);
        if (res.status !== 404) return res;
    } catch {
        // Fall back to /review/sessions/${sessionId}/approve
    }
    return fetch(`${BASE_URL}/review/sessions/${sessionId}/approve`, options);
}

export async function correctSessionDurationAPI(sessionId, payload) {
    try {
        const res = await fetch(`${BASE_URL}/api/parent/review/sessions/${sessionId}/correct-duration`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(payload)
        });
        if (res.status !== 404) return res;
    } catch {
        // Fall back to /review/sessions/${sessionId}/correct-duration
    }
    return fetch(`${BASE_URL}/review/sessions/${sessionId}/correct-duration`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(payload)
    });
}

export async function disputeSessionAPI(sessionId, payload) {
    try {
        const res = await fetch(`${BASE_URL}/api/parent/review/sessions/${sessionId}/dispute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(payload)
        });
        if (res.status !== 404) return res;
    } catch {
        // Fall back to /review/sessions/${sessionId}/dispute
    }
    return fetch(`${BASE_URL}/review/sessions/${sessionId}/dispute`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(payload)
    });
}

export async function getCompletedTuitionsAPI() {
    return fetch(`${BASE_URL}/api/tutor/completed-tuitions`, {
        method: "GET",
        headers: {
            ...getAuthHeader()
        }
    });
}

export async function getParentHistoryAPI() {
    return fetch(`${BASE_URL}/api/parent/get-parent-history`, {
        method: "GET",
        headers: {
            ...getAuthHeader(),
        },
    });
}

export async function getTutorHistoryAPI() {
    try {
        const res = await fetch(`${BASE_URL}/api/tutor/get-tutor-history`, {
            method: "GET",
            headers: {
                ...getAuthHeader(),
            },
        });
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back to alternative routes if network or routing differs
    }
}

export async function submitTutorDisputeResponseAPI(sessionId, payload) {
    try {
        const res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/dispute-response`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        });
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back
    }

    try {
        const res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/respond-dispute`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        });
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back
    }

    return fetch(`${BASE_URL}/api/tutor/dispute-response`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify({ sessionId, ...payload }),
    });
}

export async function rescheduleSessionAPI(sessionId, payload) {
    try {
        const res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/reschedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        });
        if (res.status !== 405) {
            return res;
        }
    } catch {
        // Fall through to PUT
    }

    return fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/reschedule`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
    });
}


