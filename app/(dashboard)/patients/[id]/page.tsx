"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Heart,
  Clock,
  Calendar,
  PhoneCall,
  MessageSquare,
  FileText,
  Edit,
  Plus,
  Upload,
  Save,
  X,
  Download,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import AddAppointmentModal from "@/components/add-appointment-modal";
import AddNotesModal from "@/components/add-notes-modal";
import UploadDocumentsModal from "@/components/upload-documents-modal";

interface Appointment {
  id: string;
  date: string;
  time: string;
  type: string;
  provider: string;
  status: "completed" | "upcoming" | "no-show" | "cancelled";
}

interface CallEntry {
  id: string;
  date: string;
  duration: string;
  outcome: string;
  transcript: string;
}

interface ChatEntry {
  id: string;
  date: string;
  topic: string;
  outcome: string;
}

interface MedicalNote {
  id: string;
  timestamp: string;
  author: string;
  text: string;
}

interface ConsentForm {
  id: string;
  name: string;
  dateSigned: string;
  status: "signed" | "pending";
  fileSize: string;
}

const patientData = {
  id: "1",
  name: "Emma Wilson",
  parent: "Sarah Wilson",
  dob: "2018-03-15",
  age: 7,
  status: "active",
  initials: "EW",
  color: "bg-blue-500",
  phone: "(555) 123-4567",
  email: "sarah.wilson@email.com",
  address: "123 Oak Street, Springfield, IL 62701",
  parentPhone: "(555) 123-4567",
  parentEmail: "sarah.wilson@email.com",
  insurance: "Blue Cross Blue Shield",
  insuranceId: "BCB123456789",
  groupNumber: "GRP-789",
  allergies: "Penicillin, Peanuts",
  medicalHistory: "Asthma (diagnosed 2022), Seasonal allergies",
  currentMedications: "Albuterol inhaler (as needed)",
  emergencyContact: "Michael Wilson (Father)",
  emergencyPhone: "(555) 123-4568",
  language: "English",
  patientSince: "March 2023",
  lastVisit: "2 weeks ago",
  nextAppointment: "Jan 15, 2026",
  totalVisits: 12,
  totalInteractions: 28,
};

const appointments: Appointment[] = [
  { id: "1", date: "Jan 15, 2026", time: "10:00 AM", type: "Well-Child Visit", provider: "Dr. Sarah Chen", status: "upcoming" },
  { id: "2", date: "Dec 20, 2025", time: "2:30 PM", type: "Sick Visit (Cold)", provider: "Dr. Michael Tamas", status: "completed" },
  { id: "3", date: "Dec 1, 2025", time: "11:00 AM", type: "Vaccination - Flu Shot", provider: "Nurse Jennifer", status: "completed" },
  { id: "4", date: "Oct 15, 2025", time: "9:30 AM", type: "Well-Child Visit", provider: "Dr. Sarah Chen", status: "completed" },
  { id: "5", date: "Aug 20, 2025", time: "3:00 PM", type: "School Physical", provider: "Dr. Michael Tamas", status: "completed" },
];

const callHistory: CallEntry[] = [
  { id: "1", date: "Dec 19, 2025", duration: "3:45", outcome: "Appointment booked", transcript: "Parent called to schedule sick visit for cough and congestion. AI booked Dec 20 at 2:30 PM with Dr. Tamas." },
  { id: "2", date: "Nov 30, 2025", duration: "2:12", outcome: "Info provided", transcript: "Questions about flu vaccination scheduling and requirements for school. Provided flu clinic hours." },
  { id: "3", date: "Oct 10, 2025", duration: "4:30", outcome: "Appointment booked", transcript: "Follow-up call for well-child visit scheduling. Booked Oct 15 at 9:30 AM with Dr. Sarah Chen." },
];

const chatHistory: ChatEntry[] = [
  { id: "1", date: "Dec 18, 2025", topic: "Appointment Confirmation", outcome: "Confirmed" },
  { id: "2", date: "Nov 29, 2025", topic: "Vaccine Information", outcome: "Info Provided" },
  { id: "3", date: "Oct 14, 2025", topic: "School Physical Appointment", outcome: "Booked" },
];

const medicalNotes: MedicalNote[] = [
  { id: "1", timestamp: "Dec 20, 2025 - 2:45 PM", author: "Dr. Michael Tamas", text: "Patient presents with upper respiratory infection symptoms. Prescribed amoxicillin. Follow-up in 7 days if symptoms persist." },
  { id: "2", timestamp: "Dec 1, 2025 - 11:15 AM", author: "Nurse Jennifer", text: "Administered flu vaccine (0.5 mL IM). Documented in state registry. Parent given aftercare instructions." },
  { id: "3", timestamp: "Oct 15, 2025 - 9:50 AM", author: "Dr. Sarah Chen", text: "Well-child visit. Height: 47 in, Weight: 50 lbs. Growth normal. All vitals within normal range. Vision and hearing screening passed." },
];

const consentForms: ConsentForm[] = [
  { id: "1", name: "Patient Registration Form", dateSigned: "Mar 15, 2023", status: "signed", fileSize: "245 KB" },
  { id: "2", name: "HIPAA Authorization & Privacy Notice", dateSigned: "Mar 15, 2023", status: "signed", fileSize: "189 KB" },
  { id: "3", name: "Medical History Questionnaire", dateSigned: "Mar 15, 2023", status: "signed", fileSize: "312 KB" },
  { id: "4", name: "Vaccine Consent Form", dateSigned: "Dec 1, 2025", status: "signed", fileSize: "156 KB" },
  { id: "5", name: "Photography & Media Release", dateSigned: "Mar 15, 2023", status: "signed", fileSize: "98 KB" },
  { id: "6", name: "Annual Well-Child Consent (2026)", dateSigned: "", status: "pending", fileSize: "" },
];

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed": return "bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-950/50";
    case "upcoming":  return "bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-950/50";
    case "no-show":   return "bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50";
    case "cancelled": return "bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/40";
    default: return "";
  }
};

export default function PatientDetailPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState({ ...patientData });
  const [addAppointmentOpen, setAddAppointmentOpen] = useState(false);
  const [addNotesOpen, setAddNotesOpen] = useState(false);
  const [uploadDocsOpen, setUploadDocsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(t);
  }, []);

  const handleSave = () => { setIsEditing(false); console.log("Patient updated:", form); };
  const handleCancel = () => { setForm({ ...patientData }); setIsEditing(false); };

  const field = (label: string, key: keyof typeof form, type: "text" | "date" | "tel" | "email" = "text") => (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {isEditing ? (
        <input
          type={type}
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all"
        />
      ) : (
        <p className="text-sm text-slate-900 dark:text-slate-100">
          {(form[key] as string) || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}
        </p>
      )}
    </div>
  );

  const textareaField = (label: string, key: keyof typeof form) => (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {isEditing ? (
        <textarea
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 transition-all resize-none"
        />
      ) : (
        <p className="text-sm text-slate-900 dark:text-slate-100">
          {(form[key] as string) || <span className="text-slate-400 dark:text-slate-500 italic">Not set</span>}
        </p>
      )}
    </div>
  );

  return (
    <div className="pt-4 pb-8 space-y-6">
      {/* Back + Actions Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link href="/patients" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to Patients
        </Link>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" size="sm" className="gap-1.5">
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white">
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-1.5">
                <Edit className="h-4 w-4" />
                Edit Patient
              </Button>
              <Button onClick={() => setAddAppointmentOpen(true)} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Calendar className="h-4 w-4" />
                Book Appointment
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Patient Header Card */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-5 shadow-sm animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-xl bg-slate-200 dark:bg-slate-800" />
                <div className="flex-1 min-w-0">
                  <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded mb-2" />
                  <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`${patientData.color} h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
                {patientData.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  {isEditing ? (
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="text-xl font-bold text-slate-900 dark:text-slate-50 border-b-2 border-blue-500 bg-transparent focus:outline-none w-full max-w-xs"
                    />
                  ) : (
                    <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{form.name}</h1>
                  )}
                  <Badge className="bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 text-xs">Active</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  DOB: {new Date(patientData.dob).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  <span className="text-slate-400 dark:text-slate-500 ml-2">(Age {patientData.age})</span>
                </p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Patient since {patientData.patientSince}</p>
              </div>
            </div>
            {isEditing && (
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/60">
                <Edit className="h-3.5 w-3.5" />
                Editing mode — changes are not saved until you click "Save Changes"
              </div>
            )}
          </div>
          )}

          {/* Patient Information — Editable */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm p-6 animate-pulse">
              <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
              <div className="h-40 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Patient Information</h2>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium">
                  Edit
                </button>
              )}
            </div>
            <div className="p-5">
              <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Core Patient Data</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("Patient Name", "name")}
                  {field("Parent / Guardian Name", "parent")}
                  {field("Date of Birth", "dob", "date")}
                  {field("Phone Number", "phone", "tel")}
                </div>
              </div>

              <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Contact & Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("Parent Email", "parentEmail", "email")}
                  {field("Address", "address")}
                  {field("Emergency Contact", "emergencyContact")}
                  {field("Emergency Phone", "emergencyPhone", "tel")}
                  {field("Preferred Language", "language")}
                </div>
              </div>

              <div className="mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Insurance</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {field("Insurance Provider", "insurance")}
                  {field("Insurance ID / Member #", "insuranceId")}
                  {field("Group Number", "groupNumber")}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Medical Information</p>
                <div className="space-y-4">
                  {textareaField("Allergies", "allergies")}
                  {textareaField("Medical History / Conditions", "medicalHistory")}
                  {textareaField("Current Medications", "currentMedications")}
                </div>
              </div>
            </div>
          </div>
          )}

          {/* Tabs */}
          {loading ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden animate-pulse p-6">
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded mb-4" />
              <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded" />
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden">
            <Tabs defaultValue="appointments" className="w-full">
              <div className="border-b border-slate-100 dark:border-slate-800 px-2 pt-2 overflow-x-auto">
                <TabsList className="h-auto gap-0.5 bg-transparent p-0 flex flex-nowrap">
                  {["appointments", "intake-forms", "calls", "chats", "notes", "consent", "documents"].map((tab) => (
                    <TabsTrigger
                      key={tab}
                      value={tab}
                      className="text-xs sm:text-sm px-3 py-2.5 rounded-t-lg font-medium
                        text-slate-500 dark:text-slate-400
                        hover:text-slate-700 dark:hover:text-slate-200
                        data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30
                        data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500
                        data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400
                        data-[state=active]:font-semibold
                        whitespace-nowrap capitalize transition-all"
                    >
                      {tab === "appointments" ? "Appointments" :
                       tab === "intake-forms" ? "Intake Forms" :
                       tab === "calls" ? "Calls" :
                       tab === "chats" ? "Chats" :
                       tab === "notes" ? "Medical Notes" :
                       tab === "consent" ? "Consent Forms" :
                       "Documents"}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-4 md:p-6">
                {/* Appointments */}
                <TabsContent value="appointments" className="mt-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                          <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Date & Time</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Type</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Provider</TableHead>
                          <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {appointments.map((apt) => (
                          <TableRow key={apt.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            <TableCell className="text-sm">
                              <p className="text-slate-900 dark:text-slate-100">{apt.date}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{apt.time}</p>
                            </TableCell>
                            <TableCell className="text-slate-900 dark:text-slate-100 text-sm">{apt.type}</TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-sm">{apt.provider}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(apt.status)}>
                                {apt.status.charAt(0).toUpperCase() + apt.status.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>

                {/* Intake Forms */}
                <TabsContent value="intake-forms" className="mt-0">
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-500 dark:text-slate-400 text-sm">No intake forms submitted yet</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Forms submitted through Hippatizer will appear here</p>
                    <Link href="/intake-forms" className="inline-block mt-4 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
                      View all intake forms →
                    </Link>
                  </div>
                </TabsContent>

                {/* Call History */}
                <TabsContent value="calls" className="mt-0 space-y-3">
                  {callHistory.map((call) => (
                    <div key={call.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{call.date}</p>
                          <span className="text-slate-400 text-xs">·</span>
                          <p className="text-slate-500 dark:text-slate-400 text-xs">{call.duration}</p>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs flex-shrink-0">
                          {call.outcome}
                        </Badge>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">{call.transcript}</p>
                      <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-xs font-medium">View Full Transcript →</button>
                    </div>
                  ))}
                </TabsContent>

                {/* Chat History */}
                <TabsContent value="chats" className="mt-0 space-y-3">
                  {chatHistory.map((chat) => (
                    <div key={chat.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{chat.topic}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{chat.date}</p>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 hover:bg-purple-100 text-xs">
                          {chat.outcome}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Medical Notes */}
                <TabsContent value="notes" className="mt-0 space-y-3">
                  <div className="mb-3">
                    <Button onClick={() => setAddNotesOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Note
                    </Button>
                  </div>
                  {medicalNotes.map((note) => (
                    <div key={note.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{note.timestamp}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">By {note.author}</p>
                        </div>
                        <FileText className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm mt-2">{note.text}</p>
                    </div>
                  ))}
                </TabsContent>

                {/* Consent Forms */}
                <TabsContent value="consent" className="mt-0">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm text-slate-500 dark:text-slate-400">{consentForms.filter(f => f.status === "signed").length} of {consentForms.length} forms signed</p>
                    <Button onClick={() => setUploadDocsOpen(true)} size="sm" variant="outline" className="gap-1.5">
                      <Upload className="h-4 w-4" />
                      Upload Form
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {consentForms.map((form) => (
                      <div key={form.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {form.status === "signed" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{form.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {form.status === "signed" ? `Signed ${form.dateSigned} · ${form.fileSize}` : "Awaiting signature"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <Badge className={form.status === "signed"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-700/60 text-xs"
                            : "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-700/60 text-xs"
                          }>
                            {form.status === "signed" ? "Signed" : "Pending"}
                          </Badge>
                          {form.status === "signed" && (
                            <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors">
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* Documents */}
                <TabsContent value="documents" className="mt-0">
                  <div className="mb-4">
                    <Button onClick={() => setUploadDocsOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                      <Upload className="h-4 w-4" />
                      Upload Document
                    </Button>
                  </div>
                  <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                    <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No additional documents uploaded</p>
                    <p className="text-xs mt-1">Upload referral letters, lab results, or other files</p>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
          )}

        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-20">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Visits</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{patientData.totalVisits}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" /> Last Visit
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{patientData.lastVisit}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" /> Next Appt
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{patientData.nextAppointment}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Patient Since</p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{patientData.patientSince}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Interactions</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {patientData.totalInteractions}
                  <span className="text-xs font-normal text-slate-400 dark:text-slate-500 ml-1">total</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Allergies Alert */}
          {patientData.allergies && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Allergies</p>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400">{patientData.allergies}</p>
            </div>
          )}

          {/* Consent Status */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-slate-500 dark:text-slate-400" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">Consent Forms</p>
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Signed</span>
                <span className="font-medium text-emerald-700 dark:text-emerald-400">{consentForms.filter(f => f.status === "signed").length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 dark:text-slate-400">Pending</span>
                <span className="font-medium text-amber-700 dark:text-amber-400">{consentForms.filter(f => f.status === "pending").length}</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 mt-2">
                <div
                  className="bg-emerald-500 h-1.5 rounded-full"
                  style={{ width: `${(consentForms.filter(f => f.status === "signed").length / consentForms.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddAppointmentModal
        open={addAppointmentOpen}
        onOpenChange={setAddAppointmentOpen}
        onAppointmentSaved={(appointment) => console.log("Appointment created:", appointment)}
      />
      <AddNotesModal
        open={addNotesOpen}
        onOpenChange={setAddNotesOpen}
        patientName={patientData.name}
        onNoteSaved={(note) => console.log("Note added:", note)}
      />
      <UploadDocumentsModal
        open={uploadDocsOpen}
        onOpenChange={setUploadDocsOpen}
        patientName={patientData.name}
        onDocumentsUploaded={(documents) => console.log("Documents uploaded:", documents)}
      />
    </div>
  );
}
