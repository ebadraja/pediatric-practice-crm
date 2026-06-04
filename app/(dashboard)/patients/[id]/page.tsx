"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft, Heart, Clock, Calendar, PhoneCall, MessageSquare,
  FileText, Edit, Plus, Upload, Save, X, CheckCircle2, AlertCircle,
  Loader2, Eye,
} from "lucide-react";
import AddAppointmentModal from "@/components/add-appointment-modal";
import AddNotesModal from "@/components/add-notes-modal";
import UploadDocumentsModal from "@/components/upload-documents-modal";
import { format } from "date-fns";

// ── Types ────────────────────────────────────────────────────────────────────

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  parentName: string | null;
  parentRelation: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  emergencyContact: string | null;
  emergencyPhone: string | null;
  insuranceProvider: string | null;
  insuranceId: string | null;
  allergies: string | null;
  medications: string | null;
  medicalNotes: string | null;
  preferredLanguage: string | null;
  preferredProvider: string | null;
  status: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  createdAt: string;
  appointments: Array<{
    id: string; startTime: string; endTime: string;
    type: string; status: string; provider: string | null;
  }>;
  callLogs: Array<{ id: string; startTime: string; duration: number | null; summary: string | null; outcome: string | null; }>;
  chatLogs: Array<{ id: string; startTime: string; topic: string | null; outcome: string | null; }>;
  notes: Array<{ id: string; createdAt: string; text: string; author: { firstName: string; lastName: string; } | null; }>;
  documents: Array<{ id: string; name: string; fileSize: number | null; createdAt: string; }>;
}

interface IntakeFormRow {
  id: string;
  hippatizFormTitle: string;
  status: string;
  submittedAt: string;
  hippatizViewLink?: string | null;
  hippatizPdfLink?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "bg-blue-500", "bg-green-500", "bg-purple-500",
  "bg-orange-500", "bg-pink-500", "bg-teal-500",
];
function avatarColor(name: string) {
  const s = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_COLORS[s % AVATAR_COLORS.length];
}
function initials(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}
function age(dob: string) {
  const today = new Date(); const b = new Date(dob);
  let a = today.getFullYear() - b.getFullYear();
  if (today.getMonth() - b.getMonth() < 0 || (today.getMonth() === b.getMonth() && today.getDate() < b.getDate())) a--;
  return a;
}
function aptStatusColor(s: string) {
  if (s === "COMPLETED") return "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300";
  if (s === "SCHEDULED") return "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300";
  if (s === "NO_SHOW") return "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-700/40 dark:text-slate-300";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [intakeForms, setIntakeForms] = useState<IntakeFormRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Patient>>({});
  const [saveError, setSaveError] = useState("");
  const [addAppointmentOpen, setAddAppointmentOpen] = useState(false);
  const [addNotesOpen, setAddNotesOpen] = useState(false);
  const [uploadDocsOpen, setUploadDocsOpen] = useState(false);

  const fetchPatient = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}`);
      if (!res.ok) throw new Error("Not found");
      const data: Patient = await res.json();
      setPatient(data);
      setEditForm(data);
    } catch {
      setPatient(null);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  const fetchIntakeForms = useCallback(async () => {
    try {
      const res = await fetch(`/api/intake-forms?linkedPatientId=${patientId}&limit=50`);
      if (res.ok) {
        const data = await res.json();
        setIntakeForms(data.data || []);
      }
    } catch {}
  }, [patientId]);

  useEffect(() => { fetchPatient(); fetchIntakeForms(); }, [fetchPatient, fetchIntakeForms]);

  const handleSave = async () => {
    setSaving(true); setSaveError("");
    try {
      const res = await fetch(`/api/patients/${patientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      if (!res.ok) throw new Error("Save failed");
      const updated = await res.json();
      setPatient(updated);
      setEditForm(updated);
      setIsEditing(false);
    } catch (e: any) {
      setSaveError(e.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => { setEditForm(patient ?? {}); setIsEditing(false); setSaveError(""); };

  // ── Edit field helpers ──────────────────────────────────────────────────────
  const F = ({ label, k, type = "text" }: { label: string; k: keyof Patient; type?: string }) => (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {isEditing ? (
        <input
          type={type}
          value={(editForm[k] as string) ?? ""}
          onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
          className="w-full h-9 px-3 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
        />
      ) : (
        <p className="text-sm text-slate-900 dark:text-slate-100">
          {(patient?.[k] as string) || <span className="text-slate-400 italic">Not set</span>}
        </p>
      )}
    </div>
  );

  const TA = ({ label, k }: { label: string; k: keyof Patient }) => (
    <div>
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      {isEditing ? (
        <textarea
          value={(editForm[k] as string) ?? ""}
          onChange={(e) => setEditForm({ ...editForm, [k]: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
        />
      ) : (
        <p className="text-sm text-slate-900 dark:text-slate-100">
          {(patient?.[k] as string) || <span className="text-slate-400 italic">Not set</span>}
        </p>
      )}
    </div>
  );

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pt-4 pb-8 space-y-6">
        <Skeleton className="h-8 w-32" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-28 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
          <Skeleton className="h-48 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="pt-8 text-center">
        <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
        <p className="text-slate-600 dark:text-slate-400">Patient not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push("/patients")}>Back to Patients</Button>
      </div>
    );
  }

  const fullName = `${patient.firstName} ${patient.lastName}`;
  const patientAge = age(patient.dateOfBirth);
  const color = avatarColor(fullName);
  const ini = initials(patient.firstName, patient.lastName);

  return (
    <div className="pt-4 pb-8 space-y-6">
      {/* Back + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link href="/patients" className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />Back to Patients
        </Link>
        <div className="flex gap-2 flex-wrap">
          {isEditing ? (
            <>
              <Button onClick={handleCancel} variant="outline" size="sm" className="gap-1.5" disabled={saving}>
                <X className="h-4 w-4" />Cancel
              </Button>
              <Button onClick={handleSave} size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm" className="gap-1.5">
                <Edit className="h-4 w-4" />Edit Patient
              </Button>
              <Button onClick={() => setAddAppointmentOpen(true)} size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Calendar className="h-4 w-4" />Book Appointment
              </Button>
            </>
          )}
        </div>
      </div>

      {saveError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 shrink-0" />{saveError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left — Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Profile Header */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl p-5 shadow-sm">
            <div className="flex items-start gap-4">
              <div className={`${color} h-16 w-16 rounded-xl flex items-center justify-center text-white text-2xl font-bold flex-shrink-0`}>
                {ini}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-slate-900 dark:text-slate-50">{fullName}</h1>
                  <Badge className={
                    patient.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-0"
                    : patient.status === "INACTIVE" ? "bg-slate-100 text-slate-600 border-0"
                    : "bg-orange-100 text-orange-700 border-0"
                  }>{patient.status}</Badge>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  DOB: {format(new Date(patient.dateOfBirth), "MMMM d, yyyy")}
                  <span className="text-slate-400 ml-2">(Age {patientAge})</span>
                </p>
                {patient.phone && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">📞 {patient.phone}</p>}
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Patient since {format(new Date(patient.createdAt), "MMMM yyyy")}
                </p>
              </div>
            </div>
            {isEditing && (
              <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-3 py-2 rounded-lg border border-blue-100 dark:border-blue-900/60">
                <Edit className="h-3.5 w-3.5" />Editing mode — changes not saved until you click "Save Changes"
              </div>
            )}
          </div>

          {/* Patient Info Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm">
            <div className="border-b border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-50">Patient Information</h2>
              {!isEditing && (
                <button onClick={() => setIsEditing(true)} className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium">Edit</button>
              )}
            </div>
            <div className="p-5 space-y-5">
              {/* Core */}
              <div>
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Core Patient Data</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="First Name" k="firstName" />
                  <F label="Last Name" k="lastName" />
                  <F label="Date of Birth" k="dateOfBirth" type="date" />
                  <F label="Gender" k="gender" />
                  <F label="Phone Number" k="phone" type="tel" />
                  <F label="Email" k="email" type="email" />
                  <F label="Preferred Language" k="preferredLanguage" />
                  <F label="Preferred Provider" k="preferredProvider" />
                </div>
              </div>

              {/* Address */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Street Address" k="address" />
                  <F label="City" k="city" />
                  <F label="State" k="state" />
                  <F label="Zip Code" k="zipCode" />
                </div>
              </div>

              {/* Parent / Guardian */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Parent / Guardian</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Name" k="parentName" />
                  <F label="Relationship" k="parentRelation" />
                  <F label="Phone" k="parentPhone" type="tel" />
                  <F label="Email" k="parentEmail" type="email" />
                  <F label="Emergency Contact" k="emergencyContact" />
                  <F label="Emergency Phone" k="emergencyPhone" type="tel" />
                </div>
              </div>

              {/* Insurance */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Insurance</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <F label="Provider" k="insuranceProvider" />
                  <F label="Member ID / Policy #" k="insuranceId" />
                </div>
              </div>

              {/* Medical */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Medical Information</p>
                <div className="space-y-4">
                  <TA label="Allergies" k="allergies" />
                  <TA label="Current Medications" k="medications" />
                  <TA label="Medical Notes / History" k="medicalNotes" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700/60 rounded-xl shadow-sm overflow-hidden">
            <Tabs defaultValue="appointments" className="w-full">
              <div className="border-b border-slate-100 dark:border-slate-800 px-2 pt-2 overflow-x-auto">
                <TabsList className="h-auto gap-0.5 bg-transparent p-0 flex flex-nowrap">
                  {[
                    ["appointments", "Appointments"],
                    ["intake-forms", "Intake Forms"],
                    ["calls", "Calls"],
                    ["chats", "Chats"],
                    ["notes", "Medical Notes"],
                    ["documents", "Documents"],
                  ].map(([val, label]) => (
                    <TabsTrigger key={val} value={val}
                      className="text-xs sm:text-sm px-3 py-2.5 rounded-t-lg font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30 data-[state=active]:border-b-2 data-[state=active]:border-blue-600 dark:data-[state=active]:border-blue-500 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 data-[state=active]:font-semibold whitespace-nowrap capitalize transition-all"
                    >{label}</TabsTrigger>
                  ))}
                </TabsList>
              </div>

              <div className="p-4 md:p-6">
                {/* Appointments */}
                <TabsContent value="appointments" className="mt-0">
                  <div className="flex justify-end mb-3">
                    <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700" onClick={() => setAddAppointmentOpen(true)}>
                      <Plus className="h-4 w-4" />Book Appointment
                    </Button>
                  </div>
                  {patient.appointments.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No appointments yet</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Date & Time</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Type</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Provider</TableHead>
                            <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patient.appointments.map((apt) => (
                            <TableRow key={apt.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              <TableCell className="text-sm">
                                <p className="text-slate-900 dark:text-slate-100">{format(new Date(apt.startTime), "MMM d, yyyy")}</p>
                                <p className="text-xs text-slate-500">{format(new Date(apt.startTime), "h:mm a")}</p>
                              </TableCell>
                              <TableCell className="text-sm text-slate-900 dark:text-slate-100">{apt.type}</TableCell>
                              <TableCell className="text-sm text-slate-600 dark:text-slate-400">{apt.provider || "—"}</TableCell>
                              <TableCell>
                                <Badge className={aptStatusColor(apt.status)}>
                                  {apt.status.replace("_", " ")}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                {/* Intake Forms */}
                <TabsContent value="intake-forms" className="mt-0">
                  {intakeForms.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 text-sm">No intake forms linked yet</p>
                      <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">Forms from HIPPAtizer linked to this patient appear here</p>
                      <Link href="/intake-forms" className="inline-block mt-4 text-blue-600 dark:text-blue-400 text-sm font-medium">
                        View all intake forms →
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {intakeForms.map((f) => (
                        <div key={f.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{f.hippatizFormTitle}</p>
                            <p className="text-xs text-slate-500">{format(new Date(f.submittedAt), "MMM d, yyyy")}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={
                              f.status === "LINKED" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300 border-0"
                              : "bg-slate-100 text-slate-600 border-0"
                            }>{f.status}</Badge>
                            {f.hippatizViewLink ? (
                              <a href={f.hippatizViewLink} target="_blank" rel="noopener noreferrer">
                                <Button variant="ghost" size="sm" title="View in HIPPAtizer"><Eye className="h-4 w-4" /></Button>
                              </a>
                            ) : (
                              <Button variant="ghost" size="sm" onClick={() => router.push(`/intake-forms/${f.id}`)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Calls */}
                <TabsContent value="calls" className="mt-0 space-y-3">
                  {patient.callLogs.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No call logs yet</p>
                  ) : patient.callLogs.map((call) => (
                    <div key={call.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <PhoneCall className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{format(new Date(call.startTime), "MMM d, yyyy h:mm a")}</p>
                          {call.duration && <span className="text-slate-400 text-xs">· {Math.floor(call.duration / 60)}:{String(call.duration % 60).padStart(2, "0")}</span>}
                        </div>
                        {call.outcome && <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 text-xs">{call.outcome}</Badge>}
                      </div>
                      {call.summary && <p className="text-slate-600 dark:text-slate-400 text-sm">{call.summary}</p>}
                    </div>
                  ))}
                </TabsContent>

                {/* Chats */}
                <TabsContent value="chats" className="mt-0 space-y-3">
                  {patient.chatLogs.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No chat logs yet</p>
                  ) : patient.chatLogs.map((chat) => (
                    <div key={chat.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{chat.topic || "Chat session"}</p>
                            <p className="text-xs text-slate-500">{format(new Date(chat.startTime), "MMM d, yyyy h:mm a")}</p>
                          </div>
                        </div>
                        {chat.outcome && <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-xs">{chat.outcome}</Badge>}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                {/* Notes */}
                <TabsContent value="notes" className="mt-0 space-y-3">
                  <div className="mb-3">
                    <Button onClick={() => setAddNotesOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                      <Plus className="h-4 w-4" />Add Note
                    </Button>
                  </div>
                  {patient.notes.length === 0 ? (
                    <p className="text-center text-slate-400 text-sm py-8">No notes yet</p>
                  ) : patient.notes.map((note) => (
                    <div key={note.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{format(new Date(note.createdAt), "MMM d, yyyy h:mm a")}</p>
                          {note.author && <p className="text-xs text-slate-500">By {note.author.firstName} {note.author.lastName}</p>}
                        </div>
                        <FileText className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      </div>
                      <p className="text-slate-700 dark:text-slate-300 text-sm mt-2">{note.text}</p>
                    </div>
                  ))}
                </TabsContent>

                {/* Documents */}
                <TabsContent value="documents" className="mt-0">
                  <div className="mb-4">
                    <Button onClick={() => setUploadDocsOpen(true)} size="sm" className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                      <Upload className="h-4 w-4" />Upload Document
                    </Button>
                  </div>
                  {patient.documents.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 dark:text-slate-500">
                      <FileText className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No documents uploaded</p>
                    </div>
                  ) : patient.documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-700 rounded-lg mb-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{doc.name}</p>
                          <p className="text-xs text-slate-500">
                            {format(new Date(doc.createdAt), "MMM d, yyyy")}
                            {doc.fileSize ? ` · ${Math.round(doc.fileSize / 1024)} KB` : ""}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="space-y-4">
          <Card className="sticky top-20 dark:bg-slate-900 dark:border-slate-700">
            <CardHeader className="pb-4">
              <CardTitle className="text-base text-slate-900 dark:text-slate-50">Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Total Appointments</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{patient.appointments.length}</p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />Last Visit
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {patient.appointments.length > 0
                    ? format(new Date(patient.appointments[0].startTime), "MMM d, yyyy")
                    : "Never"}
                </p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />Next Appt
                </p>
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                  {patient.appointments.find(a => a.status === "SCHEDULED")
                    ? format(new Date(patient.appointments.find(a => a.status === "SCHEDULED")!.startTime), "MMM d, yyyy")
                    : "None"}
                </p>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm text-slate-500 dark:text-slate-400">Intake Forms</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50">{intakeForms.length}</p>
              </div>
              <div className="flex items-center justify-between py-2">
                <p className="text-sm text-slate-500 dark:text-slate-400">Calls + Chats</p>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-50">
                  {patient.callLogs.length + patient.chatLogs.length}
                  <span className="text-xs font-normal text-slate-400 ml-1">total</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {patient.allergies && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="h-4 w-4 text-red-600 dark:text-red-400" />
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">Allergies</p>
              </div>
              <p className="text-sm text-red-700 dark:text-red-400">{patient.allergies}</p>
            </div>
          )}

          {patient.medications && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/60 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Medications</p>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-400">{patient.medications}</p>
            </div>
          )}
        </div>
      </div>

      <AddAppointmentModal
        open={addAppointmentOpen}
        onOpenChange={setAddAppointmentOpen}
        onAppointmentSaved={() => fetchPatient()}
      />
      <AddNotesModal
        open={addNotesOpen}
        onOpenChange={setAddNotesOpen}
        patientName={fullName}
        onNoteSaved={() => fetchPatient()}
      />
      <UploadDocumentsModal
        open={uploadDocsOpen}
        onOpenChange={setUploadDocsOpen}
        patientName={fullName}
        onDocumentsUploaded={() => fetchPatient()}
      />
    </div>
  );
}
