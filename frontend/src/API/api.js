import { cachedFetch, CACHE_TTL, invalidateCache, clearAllApiCache } from "./apiCache.js";

const BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/+$/, "") || "http://localhost:8080";
console.log("API Base URL:", BASE_URL);

function getAuthHeader() {
    const token = localStorage.getItem("token");
    return token ? { Authorization: `Bearer ${token}` } : {};
}

// Re-export cache control functions
export { invalidateCache, clearAllApiCache };

export async function getAllChildrensAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/parent/get-childrens`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getStaticEducationCategoryAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/static_data/education_category-data`,
        { method: "GET" },
        CACHE_TTL.STATIC_DATA,
        forceRefresh
    );
}

export async function getStaticSubjectsDataAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/static_data/subjects-data`,
        { method: "GET" },
        CACHE_TTL.STATIC_DATA,
        forceRefresh
    );
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
    const res = await fetch(`${BASE_URL}/api/parent/add-child`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(childrenPayload)
    });
    if (res.ok) {
        invalidateCache(["/api/parent/get-childrens", "/api/tutor/get-students", "get-student-details"]);
    }
    return res;
}

export async function deleteChildAPI(childId) {
    const res = await fetch(`${BASE_URL}/api/parent/delete-child/${childId}`, {
        method: "DELETE",
        headers: {
            ...getAuthHeader()
        }
    });
    if (res.ok) {
        invalidateCache(["/api/parent/get-childrens", "/api/tutor/get-students", "get-student-details"]);
    }
    return res;
}

export async function updateChildAPI(childId, childrenPayload) {
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/parent/update-child/${childId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(childrenPayload)
        });
        if (!res.ok) {
            res = await fetch(`${BASE_URL}/api/parent/add-child`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader()
                },
                body: JSON.stringify({ ...childrenPayload, id: childId })
            });
        }
    } catch {
        res = await fetch(`${BASE_URL}/api/parent/add-child`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({ ...childrenPayload, id: childId })
        });
    }
    if (res && res.ok) {
        invalidateCache(["/api/parent/get-childrens", "/api/parent/get-schedules", "/api/tutor/get-students", "get-student-details", "get-tutor-id", "/get-today-sessions", "/get-pending-requests"]);
    }
    return res;
}

export async function updateScheduleAPI(scheduleId, schedulePayload) {
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/parent/update-schedule/${scheduleId}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(schedulePayload)
        });
        if (!res.ok) {
            res = await fetch(`${BASE_URL}/api/parent/save-schedule`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader()
                },
                body: JSON.stringify({ ...schedulePayload, id: scheduleId })
            });
        }
    } catch {
        res = await fetch(`${BASE_URL}/api/parent/save-schedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify({ ...schedulePayload, id: scheduleId })
        });
    }
    if (res && res.ok) {
        invalidateCache(["/schedules", "/get-schedules", "/get-today-sessions", "/get-pending-requests"]);
    }
    return res;
}

export async function getEducationCategoryByIdAPI(id, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/static_data/education_category_id`,
        {
            method: "POST",
            headers: {
                "Content-Type": "text/plain",
            },
            body: id
        },
        CACHE_TTL.STATIC_DATA,
        forceRefresh
    );
}

export async function getBoardByIdAPI(id, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/static_data/get-board-id`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: typeof id === "string" ? id : JSON.stringify(id)
        },
        CACHE_TTL.STATIC_DATA,
        forceRefresh
    );
}

export async function getSubjectsByIdsAPI(subjectIds, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/static_data/get-subjects-withIds`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader()
            },
            body: JSON.stringify(subjectIds)
        },
        CACHE_TTL.STATIC_DATA,
        forceRefresh
    );
}

export async function getTutorByIdAPI(tutorId, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/static_data/get-tutor-id`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(tutorId)
        },
        CACHE_TTL.ENTITY_DETAILS,
        forceRefresh
    );
}

export async function saveTempScheduleAPI(schedulePayload) {
    const res = await fetch(`${BASE_URL}/api/parent/save-schedule`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(schedulePayload)
    });
    if (res.ok) {
        invalidateCache(["/schedules", "/get-schedules", "/get-pending-requests", "/get-today-sessions"]);
    }
    return res;
}

export async function getSchedulesAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/parent/get-schedules`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getScheduleByChildIdAPI(childId, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-schedule/${childId}`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getAllTutorStudentsAPI(tutorId, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-students/${tutorId}`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getTutorPendingRequestAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-pending-requests`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getTutorSchedulesAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-schedules`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getParentDetailsAPI(parentId, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-parent-details/${parentId}`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.ENTITY_DETAILS,
        forceRefresh
    );
}

export async function getStudentDetailsAPI(studentId, forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-student-details/${studentId}`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.ENTITY_DETAILS,
        forceRefresh
    );
}

export async function updateScheduleStatusAPI(scheduleId, status) {
    const res = await fetch(`${BASE_URL}/api/tutor/update-schedule-status/${scheduleId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify({ status })
    });
    if (res.ok) {
        invalidateCache([
            "/get-pending-requests",
            "/get-schedules",
            "/get-students",
            "/get-today-sessions",
            "/completed-tuitions"
        ]);
    }
    return res;
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

export async function getTodaySessionsAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-today-sessions`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getParentTodaySessionsAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/parent/get-today-sessions`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function startSessionAPI(sessionId) {
    const res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/start`, {
        method: "POST",
        headers: {
            ...getAuthHeader()
        }
    });
    if (res.ok) {
        invalidateCache(["/get-today-sessions", "/get-tutor-history", "/completed-tuitions"]);
    }
    return res;
}

export async function endSessionAPI(sessionId) {
    const res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/end`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        }
    });
    if (res.ok) {
        invalidateCache([
            "/get-today-sessions",
            "/pending-sessions",
            "/get-tutor-history",
            "/completed-tuitions"
        ]);
    }
    return res;
}

export async function getPendingReviewSessionsAPI(forceRefresh = false) {
    try {
        const res = await cachedFetch(
            `${BASE_URL}/api/parent/review/pending-sessions`,
            {
                method: "GET",
                headers: {
                    ...getAuthHeader()
                }
            },
            CACHE_TTL.FEATURE_QUERIES,
            forceRefresh
        );
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back to /review/pending-sessions
    }
    return cachedFetch(
        `${BASE_URL}/review/pending-sessions`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getReviewHistoryAPI(forceRefresh = false) {
    try {
        const res = await cachedFetch(
            `${BASE_URL}/api/parent/review/history`,
            {
                method: "GET",
                headers: {
                    ...getAuthHeader()
                }
            },
            CACHE_TTL.FEATURE_QUERIES,
            forceRefresh
        );
        if (res.status !== 404) {
            return res;
        }
    } catch {
        // Fall back
    }
    return cachedFetch(
        `${BASE_URL}/review/history`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
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
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/parent/review/sessions/${sessionId}/approve`, options);
        if (res.status === 404) {
            res = await fetch(`${BASE_URL}/review/sessions/${sessionId}/approve`, options);
        }
    } catch {
        res = await fetch(`${BASE_URL}/review/sessions/${sessionId}/approve`, options);
    }
    if (res && res.ok) {
        invalidateCache([
            "/pending-sessions",
            "/completed-tuitions",
            "/history",
            "/get-parent-history",
            "/get-today-sessions"
        ]);
    }
    return res;
}

export async function correctSessionDurationAPI(sessionId, payload) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(payload)
    };
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/parent/review/sessions/${sessionId}/correct-duration`, options);
        if (res.status === 404) {
            res = await fetch(`${BASE_URL}/review/sessions/${sessionId}/correct-duration`, options);
        }
    } catch {
        res = await fetch(`${BASE_URL}/review/sessions/${sessionId}/correct-duration`, options);
    }
    if (res && res.ok) {
        invalidateCache([
            "/pending-sessions",
            "/completed-tuitions",
            "/history",
            "/get-parent-history",
            "/get-today-sessions"
        ]);
    }
    return res;
}

export async function disputeSessionAPI(sessionId, payload) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader()
        },
        body: JSON.stringify(payload)
    };
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/parent/review/sessions/${sessionId}/dispute`, options);
        if (res.status === 404) {
            res = await fetch(`${BASE_URL}/review/sessions/${sessionId}/dispute`, options);
        }
    } catch {
        res = await fetch(`${BASE_URL}/review/sessions/${sessionId}/dispute`, options);
    }
    if (res && res.ok) {
        invalidateCache([
            "/pending-sessions",
            "/history",
            "/get-tutor-history",
            "/get-parent-history",
            "/get-today-sessions"
        ]);
    }
    return res;
}

export async function getCompletedTuitionsAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/completed-tuitions`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader()
            }
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getParentHistoryAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/parent/get-parent-history`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader(),
            },
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function getTutorHistoryAPI(forceRefresh = false) {
    return cachedFetch(
        `${BASE_URL}/api/tutor/get-tutor-history`,
        {
            method: "GET",
            headers: {
                ...getAuthHeader(),
            },
        },
        CACHE_TTL.FEATURE_QUERIES,
        forceRefresh
    );
}

export async function submitTutorDisputeResponseAPI(sessionId, payload) {
    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
    };
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/dispute-response`, options);
        if (res.status === 404) {
            res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/respond-dispute`, options);
            if (res.status === 404) {
                res = await fetch(`${BASE_URL}/api/tutor/dispute-response`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        ...getAuthHeader(),
                    },
                    body: JSON.stringify({ sessionId, ...payload }),
                });
            }
        }
    } catch {
        res = await fetch(`${BASE_URL}/api/tutor/dispute-response`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify({ sessionId, ...payload }),
        });
    }
    if (res && res.ok) {
        invalidateCache(["/get-tutor-history", "/pending-sessions", "/history"]);
    }
    return res;
}

export async function rescheduleSessionAPI(sessionId, payload) {
    let res;
    try {
        res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/reschedule`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        });
        if (res.status === 405) {
            res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/reschedule`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...getAuthHeader(),
                },
                body: JSON.stringify(payload),
            });
        }
    } catch {
        res = await fetch(`${BASE_URL}/api/tutor/sessions/${sessionId}/reschedule`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json",
                ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
        });
    }
    if (res && res.ok) {
        invalidateCache(["/get-today-sessions", "/get-schedules"]);
    }
    return res;
}
