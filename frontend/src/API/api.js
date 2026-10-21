
const BASE_URL = "http://localhost:8080";

const token = sessionStorage.getItem("token");
console.log("token",token)
export async function getAllChildrensAPI(){
    const res = fetch(`${BASE_URL}/api/parent/get-childrens`,{
        method:"GET",
        headers:{
            Authorization:`Bearer ${sessionStorage.getItem("token")}`
        }
    });
    return res;
}  
export async function getStaticEducationCategoryAPI(){
    const res = fetch(`${BASE_URL}/static_data/education_category-data`);
    return res;
} 
export async function getStaticSubjectsDataAPI(){
    const res = fetch(`${BASE_URL}/static_data/subjects-data`);
    return res;
} 

export async function validateTutorAPI(tutorEmail){
    const res = fetch(`${BASE_URL}/api/parent/validate-tutor`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${sessionStorage.getItem("token")}`
        },
        body:JSON.stringify({email:tutorEmail})
    });
    return res;

}
export async function saveChildAPI(childrenPayload){
    const res = fetch(`${BASE_URL}/api/parent/add-child`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${sessionStorage.getItem("token")}`
        },
        body:JSON.stringify(childrenPayload)
    });
    return res;
}

export async function getEducationCategoryByIdAPI(id){
    const res = fetch(`${BASE_URL}/static_data/education_category_id`,{
        method:"POST",
        headers:{
            "Content-Type":"text/plain",
        },
        body:id
    });
    return res;
}
export async function getBoardByIdAPI(id){
    const res = fetch(`${BASE_URL}/static_data/get-board-id`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        body:id
    });
    return res;
}
export async function getSubjectsByIdsAPI(subjectIds){
    const res = fetch(`${BASE_URL}/static_data/get-subjects-withIds`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        
        body:JSON.stringify(subjectIds)
    });
   return res;
}
export async function getTutorByIdAPI(tutorId){
    const res = fetch(`${BASE_URL}/static_data/get-tutor-id`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
        },
        
        body:JSON.stringify(tutorId)
    });
   return res;
}
export async function saveTempScheduleAPI(schedulePayload){
    return fetch(`${BASE_URL}/api/parent/save-schedule`,{
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            Authorization:`Bearer ${token}`
        },
        body:JSON.stringify(schedulePayload)
    });
}