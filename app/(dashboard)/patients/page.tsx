"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Upload,
  ArrowRight,
} from "lucide-react";
import CSVImportModal from "@/components/csv-import-modal";
import AddPatientModal from "@/components/add-patient-modal";

interface Patient {
  id: string;
  name: string;
  parent: string;
  dob: string;
  phone: string;
  lastVisit: string;
  totalVisits: number;
  status: "active" | "inactive";
  initials: string;
  color: string;
}

const patients: Patient[] = [
  { id: "1", name: "Emma Wilson", parent: "Sarah Wilson", dob: "2018-03-15", phone: "(555) 123-4567", lastVisit: "2 weeks ago", totalVisits: 8, status: "active", initials: "EW", color: "bg-blue-500" },
  { id: "2", name: "Lucas Brown", parent: "Michael Brown", dob: "2020-07-22", phone: "(555) 234-5678", lastVisit: "1 week ago", totalVisits: 6, status: "active", initials: "LB", color: "bg-green-500" },
  { id: "3", name: "Olivia Davis", parent: "Jennifer Davis", dob: "2019-11-08", phone: "(555) 345-6789", lastVisit: "3 weeks ago", totalVisits: 5, status: "active", initials: "OD", color: "bg-purple-500" },
  { id: "4", name: "Noah Martinez", parent: "Carlos Martinez", dob: "2021-05-12", phone: "(555) 456-7890", lastVisit: "1 month ago", totalVisits: 4, status: "active", initials: "NM", color: "bg-pink-500" },
  { id: "5", name: "Ava Thompson", parent: "Rebecca Thompson", dob: "2017-09-30", phone: "(555) 567-8901", lastVisit: "Just now", totalVisits: 12, status: "active", initials: "AT", color: "bg-yellow-500" },
  { id: "6", name: "Ethan Garcia", parent: "David Garcia", dob: "2022-01-19", phone: "(555) 678-9012", lastVisit: "2 months ago", totalVisits: 3, status: "inactive", initials: "EG", color: "bg-red-500" },
  { id: "7", name: "Mia Rodriguez", parent: "Maria Rodriguez", dob: "2016-04-25", phone: "(555) 789-0123", lastVisit: "3 days ago", totalVisits: 15, status: "active", initials: "MR", color: "bg-indigo-500" },
  { id: "8", name: "Liam Johnson", parent: "James Johnson", dob: "2023-06-11", phone: "(555) 890-1234", lastVisit: "5 days ago", totalVisits: 2, status: "active", initials: "LJ", color: "bg-cyan-500" },
  { id: "9", name: "Sophia Lee", parent: "Lisa Lee", dob: "2019-08-03", phone: "(555) 901-2345", lastVisit: "4 months ago", totalVisits: 7, status: "inactive", initials: "SL", color: "bg-orange-500" },
  { id: "10", name: "Mason Chen", parent: "Wei Chen", dob: "2018-12-20", phone: "(555) 012-3456", lastVisit: "1 week ago", totalVisits: 9, status: "active", initials: "MC", color: "bg-teal-500" },
];

const calculateAge = (dob: string): number => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
  return age;
};

const formatDOB = (dob: string): string => {
  const date = new Date(dob);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export default function PatientsPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "new" | "returning" | "inactive">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [csvImportOpen, setCSVImportOpen] = useState(false);
  const [addPatientOpen, setAddPatientOpen] = useState(false);

  const filteredPatients = patients.filter((patient) => {
    const matchesSearch =
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.parent.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.phone.includes(searchTerm);
    if (filterStatus === "inactive") return matchesSearch && patient.status === "inactive";
    if (filterStatus === "new") return matchesSearch && patient.totalVisits <= 3;
    if (filterStatus === "returning") return matchesSearch && patient.totalVisits > 3;
    return matchesSearch;
  });

  const totalPatients = 1247;
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredPatients.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredPatients.length);
  const displayedPatients = filteredPatients.slice(startIndex, endIndex);

  return (
    <div className="pt-4 pb-8 space-y-6 md:space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">Patients</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 md:mt-2 text-sm">Manage and view your patient database</p>
        </div>
        <div className="flex gap-2 flex-col sm:flex-row w-full sm:w-auto">
          <button
            onClick={() => setAddPatientOpen(true)}
            className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white font-medium h-10 px-5 rounded-lg shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2 justify-center flex-1 sm:flex-none"
          >
            <Plus className="h-4 w-4" />
            Add New Patient
          </button>
          <button
            onClick={() => setCSVImportOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium h-10 px-5 rounded-lg shadow-sm hover:scale-[1.02] transition-all flex items-center gap-2 justify-center flex-1 sm:flex-none"
          >
            <Upload className="h-4 w-4" />
            Import CSV
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="space-y-3 md:space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            placeholder="Search by name, phone, or DOB..."
            className="w-full h-10 px-3 pl-10 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 focus:border-blue-500 transition-all text-sm md:text-base"
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { label: "All Patients", value: "all" },
            { label: "New This Month", value: "new" },
            { label: "Returning", value: "returning" },
            { label: "Inactive", value: "inactive" },
          ].map((filter) => (
            <button
              key={filter.value}
              onClick={() => { setFilterStatus(filter.value as typeof filterStatus); setCurrentPage(1); }}
              className={`h-9 px-3.5 rounded-lg font-medium text-xs md:text-sm transition-all whitespace-nowrap ${
                filterStatus === filter.value
                  ? "bg-slate-900 dark:bg-blue-600 text-white shadow-sm hover:bg-slate-800 dark:hover:bg-blue-700 border border-transparent"
                  : "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block">
        <Card>
          <CardHeader>
            <CardTitle>Patient List</CardTitle>
            <CardDescription>
              Showing {startIndex + 1}–{endIndex} of {totalPatients} patients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Patient</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Date of Birth</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Phone</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Last Visit</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider text-center">Total Visits</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-slate-600 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedPatients.map((patient) => (
                    <TableRow
                      key={patient.id}
                      className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`${patient.color} h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold`}>
                            {patient.initials}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-slate-100">{patient.name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{patient.parent}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-900 dark:text-slate-100">{formatDOB(patient.dob)}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{calculateAge(patient.dob)} years old</p>
                      </TableCell>
                      <TableCell className="text-slate-900 dark:text-slate-100">{patient.phone}</TableCell>
                      <TableCell className="text-slate-600 dark:text-slate-400">{patient.lastVisit}</TableCell>
                      <TableCell className="text-center font-medium text-slate-900 dark:text-slate-100">
                        {patient.totalVisits}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded-md border ${
                          patient.status === "active"
                            ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-700/60"
                            : "bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-600/60"
                        }`}>
                          {patient.status === "active" ? "Active" : "Inactive"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <button
                          onClick={() => router.push(`/patients/${patient.id}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded px-2 py-1 transition-colors flex items-center gap-1"
                        >
                          <ArrowRight className="h-4 w-4" />
                          <span className="text-xs">View</span>
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <p className="text-xs text-slate-500 dark:text-slate-400">Page {currentPage} of {totalPages}</p>
            <div className="flex gap-2">
              <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} size="sm" variant="outline" className="gap-1">
                <ChevronLeft className="h-3 w-3" />
                Previous
              </Button>
              <Button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} size="sm" variant="outline" className="gap-1">
                Next
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3">
        {displayedPatients.length > 0 ? (
          displayedPatients.map((patient) => (
            <div
              key={patient.id}
              onClick={() => router.push(`/patients/${patient.id}`)}
              className="border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-white dark:bg-slate-900 hover:shadow-md dark:hover:bg-slate-800/80 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-start gap-3 flex-1">
                  <div className={`${patient.color} h-10 w-10 rounded-lg flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 mt-0.5`}>
                    {patient.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-slate-100 text-sm">{patient.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{patient.parent}</p>
                  </div>
                </div>
                <div className={`inline-flex text-xs font-medium px-2.5 py-0.5 rounded-md border flex-shrink-0 ${
                  patient.status === "active"
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-700/60"
                    : "bg-slate-100 dark:bg-slate-700/40 text-slate-700 dark:text-slate-300 border-slate-200/60 dark:border-slate-600/60"
                }`}>
                  {patient.status === "active" ? "Active" : "Inactive"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Age</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{calculateAge(patient.dob)} years</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Total Visits</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{patient.totalVisits}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Last Visit</p>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{patient.lastVisit}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-0.5">Phone</p>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">{patient.phone}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">No patients found</p>
          </div>
        )}

        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex items-center justify-between">
          <p className="text-xs text-slate-500 dark:text-slate-400">Page {currentPage} of {totalPages}</p>
          <div className="flex gap-2">
            <Button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} size="sm" variant="outline" className="gap-1">
              <ChevronLeft className="h-3 w-3" />
              Prev
            </Button>
            <Button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} size="sm" variant="outline" className="gap-1">
              Next
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <CSVImportModal
        open={csvImportOpen}
        onOpenChange={setCSVImportOpen}
        onImportComplete={(result) => { console.log("Import completed:", result); setCurrentPage(1); }}
      />
      <AddPatientModal
        open={addPatientOpen}
        onOpenChange={setAddPatientOpen}
        onPatientAdded={(patient) => { console.log("Patient added:", patient); setCurrentPage(1); }}
      />
    </div>
  );
}
