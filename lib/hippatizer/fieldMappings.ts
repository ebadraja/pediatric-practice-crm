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
      const [month, day, year] = (value as string).split("/");
      return new Date(`${year}-${month.padStart(2,"0")}-${day.padStart(2,"0")}`);
    },
  },
  {
    hippatizFieldId: "Pediatrician or PCP Name",
    fieldLabel: "Pediatrician or PCP Name",
    fieldType: "text",
    patientField: "pcpName",
  },
  {
    hippatizFieldId: "Pediatrician Clinic Name",
    fieldLabel: "Pediatrician Clinic Name",
    fieldType: "text",
    patientField: "pcpClinicName",
  },
  {
    hippatizFieldId: "Pediatrician Phone",
    fieldLabel: "Pediatrician Phone",
    fieldType: "phone",
    patientField: "pcpPhone",
  },
  {
    hippatizFieldId: "Vision Tested?",
    fieldLabel: "Vision Tested?",
    fieldType: "checkbox",
    patientField: "isVisionTested",
    transform: (value) => value === "Yes" || value === true,
  },
  {
    hippatizFieldId: "If yes, specify where and when",
    fieldLabel: "If yes, specify where and when",
    fieldType: "textarea",
    patientField: "visionTestedDetails",
  },
  {
    hippatizFieldId: "Hearing Tested?",
    fieldLabel: "Hearing Tested?",
    fieldType: "checkbox",
    patientField: "isHearingTested",
    transform: (value) => value === "Yes" || value === true,
  },
  {
    hippatizFieldId: "History of hospitalizations/surgeries",
    fieldLabel: "History of hospitalizations/surgeries",
    fieldType: "checkbox",
    patientField: "hasMedicalHistory",
    transform: (value) => value === "Yes" || value === true,
  },
  {
    hippatizFieldId: "Explain:",
    fieldLabel: "Explain:",
    fieldType: "textarea",
    patientField: "medicalHistoryExplanation",
  },
  {
    hippatizFieldId: "Name and location of Preschool",
    fieldLabel: "Name and location of Preschool",
    fieldType: "text",
    patientField: "preschoolNameLocation",
  },
  {
    hippatizFieldId: "Point to show something",
    fieldLabel: "Point to show something",
    fieldType: "radio",
    patientField: "devPointToShow",
  },
  {
    hippatizFieldId: "Comments (Point to show something)",
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
    hippatizFieldId: "Date:",
    fieldLabel: "Date:",
    fieldType: "date",
    patientField: "interviewDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = (value as string).split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "Use of nonverbal behaviors - Current",
    fieldLabel: "Use of nonverbal behaviors - Current",
    fieldType: "number",
    patientField: "nonverbalBehaviorsCurrentScore",
  },
  {
    hippatizFieldId: "Use of nonverbal behaviors - Past",
    fieldLabel: "Use of nonverbal behaviors - Past",
    fieldType: "number",
    patientField: "nonverbalBehaviorsPastScore",
  },
  {
    hippatizFieldId: "Peer relationships - Current",
    fieldLabel: "Peer relationships - Current",
    fieldType: "number",
    patientField: "peerRelationshipsCurrentScore",
  },
  {
    hippatizFieldId: "Peer relationships - Past",
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
    hippatizFieldId: "Child's Name",
    fieldLabel: "Child's Name",
    fieldType: "text",
    patientField: "childName",
  },
  {
    hippatizFieldId: "Parent/Caregiver Name",
    fieldLabel: "Parent/Caregiver Name",
    fieldType: "text",
    patientField: "caregiverName",
  },
  {
    hippatizFieldId: "Date",
    fieldLabel: "Date",
    fieldType: "date",
    patientField: "assessmentDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = (value as string).split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "Sensory Seeking Total Score",
    fieldLabel: "Sensory Seeking Total Score",
    fieldType: "number",
    patientField: "sensorySeekingScore",
  },
  {
    hippatizFieldId: "Sensory Sensitivity Total Score",
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
    hippatizFieldId: "Adolescent's Name",
    fieldLabel: "Adolescent's Name",
    fieldType: "text",
    patientField: "adolescentName",
  },
  {
    hippatizFieldId: "Date of Birth",
    fieldLabel: "Date of Birth",
    fieldType: "date",
    patientField: "adolescentDateOfBirth",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = (value as string).split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "Date of Self-Evaluation",
    fieldLabel: "Date of Self-Evaluation",
    fieldType: "date",
    patientField: "evaluationDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = (value as string).split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "Low Registration Total",
    fieldLabel: "Low Registration Total",
    fieldType: "number",
    patientField: "lowRegistrationScore",
  },
  {
    hippatizFieldId: "Sensation Avoiding Total",
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
    hippatizFieldId: "Student's Name",
    fieldLabel: "Student's Name",
    fieldType: "text",
    patientField: "studentName",
  },
  {
    hippatizFieldId: "Teacher's Name",
    fieldLabel: "Teacher's Name",
    fieldType: "text",
    patientField: "teacherName",
  },
  {
    hippatizFieldId: "Grade/Class",
    fieldLabel: "Grade/Class",
    fieldType: "text",
    patientField: "gradeClass",
  },
  {
    hippatizFieldId: "Classroom Sensory Profile Score",
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
    hippatizFieldId: "Preview Date",
    fieldLabel: "Preview Date",
    fieldType: "date",
    patientField: "previewDate",
    transform: (value) => {
      if (!value) return null;
      const [month, day, year] = (value as string).split("/");
      return new Date(`${year}-${month}-${day}`);
    },
  },
  {
    hippatizFieldId: "Ever in the past - Hyperventilation",
    fieldLabel: "Ever in the past - Hyperventilation",
    fieldType: "checkbox",
    patientField: "hasHyperventilationHistory",
    transform: (value) => value === true || value === "true",
  },
  {
    hippatizFieldId: "Language/Speech Loss Evaluation",
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
