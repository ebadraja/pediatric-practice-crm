/**
 * Hippatizer Field Mappings
 * Maps Hippatizer form field IDs to patient model fields
 * Used by webhook receiver to extract and transform form data
 */

export type PatientFieldName =
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "middleInitial"
  | "gender"
  | "preferredPronouns"
  | "preferredLanguage"
  | "email"
  | "phone"
  | "streetAddress"
  | "city"
  | "state"
  | "zipCode"
  | "caregiver1FirstName"
  | "caregiver1LastName"
  | "caregiver1Relationship"
  | "caregiver1Phone"
  | "caregiver1Email"
  | "caregiver2FirstName"
  | "caregiver2LastName"
  | "caregiver2Relationship"
  | "caregiver2Phone"
  | "caregiver2Email"
  | "pcpName"
  | "pcpClinicName"
  | "pcpPhone"
  | "isVisionTested"
  | "visionTestedDetails"
  | "isHearingTested"
  | "hasMedicalHistory"
  | "medicalHistoryExplanation"
  | "preschoolNameLocation"
  | "devPointToShow"
  | "devPointToShowComments"
  | "interviewDate"
  | "nonverbalBehaviorsCurrentScore"
  | "nonverbalBehaviorsPastScore"
  | "peerRelationshipsCurrentScore"
  | "peerRelationshipsPastScore"
  | "childName"
  | "caregiverName"
  | "assessmentDate"
  | "sensorySeekingScore"
  | "sensorySensitivityScore"
  | "adolescentName"
  | "adolescentDateOfBirth"
  | "evaluationDate"
  | "lowRegistrationScore"
  | "sensationAvoidingScore"
  | "studentName"
  | "teacherName"
  | "gradeClass"
  | "classroomSensoryScore"
  | "previewDate"
  | "hasHyperventilationHistory"
  | "languageLossStatus";

export interface FieldMapping {
  hippatizFieldId: string;
  fieldLabel: string;
  fieldType:
    | "text"
    | "email"
    | "phone"
    | "date"
    | "checkbox"
    | "radio"
    | "signature"
    | "textarea"
    | "number";
  patientField: PatientFieldName;
  required?: boolean;
  transform?: (value: any) => any; // Optional transformation function
}

/**
 * NEW PATIENT PRE-REGISTRATION FORM
 * Form ID: aa70234d-8dc6-4a9b-88e7-211289c891a0 (example from CSV)
 */
// Field IDs now match the exact label keys HIPPAtizer sends in the webhook payload
export const newPatientPreRegistrationMapping: FieldMapping[] = [
  {
    hippatizFieldId: "First Name",
    fieldLabel: "First Name",
    fieldType: "text",
    patientField: "firstName",
    required: true,
  },
  {
    hippatizFieldId: "Last Name",
    fieldLabel: "Last Name",
    fieldType: "text",
    patientField: "lastName",
    required: true,
  },
  {
    hippatizFieldId: "Patient Date of Birth",
    fieldLabel: "Patient Date of Birth",
    fieldType: "date",
    patientField: "dateOfBirth",
    required: true,
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = value.split("/");
      return new Date(`${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`);
    },
  },
  {
    hippatizFieldId: "Where does your child reside?",
    fieldLabel: "Where does your child reside?",
    fieldType: "text",
    patientField: "streetAddress",
  },
  {
    hippatizFieldId: "City",
    fieldLabel: "City",
    fieldType: "text",
    patientField: "city",
  },
  {
    hippatizFieldId: "State / Province",
    fieldLabel: "State / Province",
    fieldType: "text",
    patientField: "state",
  },
  {
    hippatizFieldId: "Label",
    fieldLabel: "Label",
    fieldType: "text",
    patientField: "zipCode",
  },
  {
    hippatizFieldId: "Relationship to Patient",
    fieldLabel: "Relationship to Patient",
    fieldType: "text",
    patientField: "caregiver1Relationship",
  },
  {
    hippatizFieldId: "Parent/Caregiver #1 Phone Number",
    fieldLabel: "Parent/Caregiver #1 Phone Number",
    fieldType: "phone",
    patientField: "caregiver1Phone",
  },
  {
    hippatizFieldId: "Parent/Caregiver #1 Email Address",
    fieldLabel: "Parent/Caregiver #1 Email Address",
    fieldType: "email",
    patientField: "caregiver1Email",
  },
  {
    hippatizFieldId: " Parent/Caregiver #2 Phone Number",
    fieldLabel: "Parent/Caregiver #2 Phone Number",
    fieldType: "phone",
    patientField: "caregiver2Phone",
  },
  {
    hippatizFieldId: "Parent/Caregiver #2 Email Address",
    fieldLabel: "Parent/Caregiver #2 Email Address",
    fieldType: "email",
    patientField: "caregiver2Email",
  },
  {
    hippatizFieldId: "Previous Pediatrician or Clinic Name",
    fieldLabel: "Previous Pediatrician or Clinic Name",
    fieldType: "text",
    patientField: "pcpClinicName",
  },
  {
    hippatizFieldId: "Phone Number",
    fieldLabel: "Phone Number",
    fieldType: "phone",
    patientField: "pcpPhone",
  },
];

/**
 * KiDS PATIENT INTAKE FORM
 */
export const kidsPatientIntakeFormMapping: FieldMapping[] = [
  {
    hippatizFieldId: "f57a0b8a-b8e3-469a-ab33-149bfe3fc8bb",
    fieldLabel: "Pediatrician or PCP Name",
    fieldType: "text",
    patientField: "pcpName",
  },
  {
    hippatizFieldId: "11d0bbfa-6bc2-46bb-be91-72b6ef4baee8",
    fieldLabel: "Pediatrician Clinic Name",
    fieldType: "text",
    patientField: "pcpClinicName",
  },
  {
    hippatizFieldId: "c309fca8-3dfd-4911-ab3a-8ef7dbb34fa3",
    fieldLabel: "Pediatrician Phone",
    fieldType: "phone",
    patientField: "pcpPhone",
  },
  {
    hippatizFieldId: "e9fa71be4-0804-45ea-aba5-c5bf2c353e28",
    fieldLabel: "Vision Tested?",
    fieldType: "checkbox",
    patientField: "isVisionTested",
    transform: (value) => value === "Yes" || value === true,
  },
  {
    hippatizFieldId: "0ba5cf47-b95d-4cbd-bf28-4baa4d95bb12",
    fieldLabel: "If yes, specify where and when",
    fieldType: "textarea",
    patientField: "visionTestedDetails",
  },
  {
    hippatizFieldId: "4fa8bc19-510e-4617-b95d-4cbdbf284b3e",
    fieldLabel: "Hearing Tested?",
    fieldType: "checkbox",
    patientField: "isHearingTested",
    transform: (value) => value === "Yes" || value === true,
  },
  {
    hippatizFieldId: "c87df39f-0844-4141-87df-39f08a648079",
    fieldLabel: "History of hospitalizations/surgeries",
    fieldType: "checkbox",
    patientField: "hasMedicalHistory",
    transform: (value) => value === "Yes" || value === true,
  },
  {
    hippatizFieldId: "37996575-fcc2-4cb1-ab5b-0538539112eb",
    fieldLabel: "Explain:",
    fieldType: "textarea",
    patientField: "medicalHistoryExplanation",
  },
  {
    hippatizFieldId: "337beb76-291a-4061-9c85-ba25026294df",
    fieldLabel: "Name and location of Preschool",
    fieldType: "text",
    patientField: "preschoolNameLocation",
  },
  {
    hippatizFieldId: "af627409-30ea-426d-b7ca-61efbe7b284a",
    fieldLabel: "Point to show something",
    fieldType: "radio",
    patientField: "devPointToShow",
  },
  {
    hippatizFieldId: "9ee00649-44d0-4439-adc4-9fbc305231b3",
    fieldLabel: "Comments (Point to show something)",
    fieldType: "textarea",
    patientField: "devPointToShowComments",
  },
];

/**
 * DIAGNOSTIC INTERVIEW
 */
export const diagnosticInterviewMapping: FieldMapping[] = [
  {
    hippatizFieldId: "3dcc334a-7a10-4d59-b77f-c947ac68a05c",
    fieldLabel: "Date:",
    fieldType: "date",
    patientField: "interviewDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = value.split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "6de6b11c-e4e5-4242-950c-779f1c06cb25",
    fieldLabel: "Use of nonverbal behaviors - Current",
    fieldType: "number",
    patientField: "nonverbalBehaviorsCurrentScore",
  },
  {
    hippatizFieldId: "0c69cbb8-f3da-4b58-b482-9a1b51bd9007",
    fieldLabel: "Use of nonverbal behaviors - Past",
    fieldType: "number",
    patientField: "nonverbalBehaviorsPastScore",
  },
  {
    hippatizFieldId: "cbb86542-45da-4b58-b482-9a1b51bd9007",
    fieldLabel: "Peer relationships - Current",
    fieldType: "number",
    patientField: "peerRelationshipsCurrentScore",
  },
  {
    hippatizFieldId: "1bd9007a-45da-4b58-b482-9a1b51bd9007",
    fieldLabel: "Peer relationships - Past",
    fieldType: "number",
    patientField: "peerRelationshipsPastScore",
  },
];

/**
 * SENSORY ASSESSMENT - PARENT/CAREGIVER
 */
export const sensoryAssessmentParentMapping: FieldMapping[] = [
  {
    hippatizFieldId: "d12cbb5a-46bc-410c-99a2-fb4bbbe35f4a",
    fieldLabel: "Child's Name",
    fieldType: "text",
    patientField: "childName",
  },
  {
    hippatizFieldId: "fa13efca-a9c0-48df-9fbc-be4abde34ffc",
    fieldLabel: "Parent/Caregiver Name",
    fieldType: "text",
    patientField: "caregiverName",
  },
  {
    hippatizFieldId: "223cebfa-c4a0-4c07-b8fd-ef4bcbe35ea1",
    fieldLabel: "Date",
    fieldType: "date",
    patientField: "assessmentDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = value.split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "b6807cc3-ef0b-410a-bde9-bf3beee56b00",
    fieldLabel: "Sensory Seeking Total Score",
    fieldType: "number",
    patientField: "sensorySeekingScore",
  },
  {
    hippatizFieldId: "88c2cb5f-bc7a-4dd1-8fa1-7f897cb2debb",
    fieldLabel: "Sensory Sensitivity Total Score",
    fieldType: "number",
    patientField: "sensorySensitivityScore",
  },
];

/**
 * SENSORY ASSESSMENT - ADOLESCENT
 */
export const sensoryAssessmentAdolescentMapping: FieldMapping[] = [
  {
    hippatizFieldId: "3a6df3a2-345f-4cd6-b4d2-f47dfbb354c0",
    fieldLabel: "Adolescent's Name",
    fieldType: "text",
    patientField: "adolescentName",
  },
  {
    hippatizFieldId: "c409fb58-9cf0-4f10-b999-92f7dc3b4f62",
    fieldLabel: "Date of Birth",
    fieldType: "date",
    patientField: "adolescentDateOfBirth",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = value.split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "d0a6c085-e1d4-4bb2-bd24-beea35c89ad0",
    fieldLabel: "Date of Self-Evaluation",
    fieldType: "date",
    patientField: "evaluationDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = value.split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "41fbbd0a-9ab8-46d8-9df2-5b9679dc6e88",
    fieldLabel: "Low Registration Total",
    fieldType: "number",
    patientField: "lowRegistrationScore",
  },
  {
    hippatizFieldId: "8fb86629-9e8c-4a30-81f1-ef2547b3beaa",
    fieldLabel: "Sensation Avoiding Total",
    fieldType: "number",
    patientField: "sensationAvoidingScore",
  },
];

/**
 * SENSORY ASSESSMENT - TEACHER
 */
export const sensoryAssessmentTeacherMapping: FieldMapping[] = [
  {
    hippatizFieldId: "b6807cc3-ef0b-410a-bde9-bf3beee56b00",
    fieldLabel: "Student's Name",
    fieldType: "text",
    patientField: "studentName",
  },
  {
    hippatizFieldId: "88c2cb5f-bc7a-4dd1-8fa1-7f897cb2debb",
    fieldLabel: "Teacher's Name",
    fieldType: "text",
    patientField: "teacherName",
  },
  {
    hippatizFieldId: "4fa0bb65-efc2-48bc-9f9b-6db35beeb6fa",
    fieldLabel: "Grade/Class",
    fieldType: "text",
    patientField: "gradeClass",
  },
  {
    hippatizFieldId: "223cebfa-9ab3-4c07-b8fd-ef4bcbe35ea1",
    fieldLabel: "Classroom Sensory Profile Score",
    fieldType: "number",
    patientField: "classroomSensoryScore",
  },
];

/**
 * PREVIEW INTERVIEW QUESTION
 */
export const previewInterviewMapping: FieldMapping[] = [
  {
    hippatizFieldId: "bf2f909c-982b-4d2c-ba04-46dc11b1715b",
    fieldLabel: "Preview Date",
    fieldType: "date",
    patientField: "previewDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = value.split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "checkbox_group_j4p6",
    fieldLabel: "Ever in the past - Hyperventilation",
    fieldType: "checkbox",
    patientField: "hasHyperventilationHistory",
    transform: (value) => value === true || value === "true",
  },
  {
    hippatizFieldId: "053ad7a6-31d8-47ab-806d-4677d8927492",
    fieldLabel: "Language/Speech Loss Evaluation",
    fieldType: "radio",
    patientField: "languageLossStatus",
  },
];

/**
 * Master mapping by form title
 * Maps form titles to their field mappings
 */
export const formMappingsByTitle: Record<string, FieldMapping[]> = {
  "NEW PATIENT PRE-REGISTRATION": newPatientPreRegistrationMapping,
  "KiDS PATIENT INTAKE FORM": kidsPatientIntakeFormMapping,
  "DIAGNOSTIC INTERVIEW": diagnosticInterviewMapping,
  "SENSORY ASSESSMENT - PARENT/CAREGIVER": sensoryAssessmentParentMapping,
  "SENSORY ASSESSMENT - ADOLESCENT": sensoryAssessmentAdolescentMapping,
  "SENSORY ASSESSMENT - TEACHER": sensoryAssessmentTeacherMapping,
  "PREVIEW INTERVIEW QUESTION": previewInterviewMapping,
};

/**
 * Get mapping for a specific form
 */
export function getMappingForForm(formTitle: string): FieldMapping[] {
  const upper = formTitle.trim().toUpperCase();
  const key = Object.keys(formMappingsByTitle).find(k => k.toUpperCase() === upper);
  return key ? formMappingsByTitle[key] : [];
}

/**
 * Get all mapping field IDs (for validation)
 */
export function getAllMappedFieldIds(): Set<string> {
  const fieldIds = new Set<string>();
  Object.values(formMappingsByTitle).forEach((mappings) => {
    mappings.forEach((mapping) => {
      fieldIds.add(mapping.hippatizFieldId);
    });
  });
  return fieldIds;
}

/**
 * Critical matching fields (must be present in NEW PATIENT PRE-REGISTRATION)
 */
export const CRITICAL_MATCHING_FIELDS = [
  "First Name",
  "Last Name",
  "Patient Date of Birth",
];
