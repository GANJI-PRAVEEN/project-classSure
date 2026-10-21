import { useState } from "react";
import SignupLayout from "../component/SignupLayout.jsx";
import TutorSignup from "./tutor_signup.jsx";
import ParentSignup from "./parent_signup.jsx";

export default function Signup() {
  const [selectedRole, setSelectedRole] = useState("TUTOR");

  return (
    <SignupLayout
      selectedRole={selectedRole}
      onRoleChange={setSelectedRole}
    >
      {selectedRole === "TUTOR" ? (
        <TutorSignup />
      ) : (
        <ParentSignup />
      )}
    </SignupLayout>
  );
}