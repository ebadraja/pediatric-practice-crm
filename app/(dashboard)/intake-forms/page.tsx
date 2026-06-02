"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  UserPlus,
  MoreVertical,
  Loader,
  Download,
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface IntakeFormListItem {
  id: string;
  hippatizFormTitle: string;
  status: "RECEIVED" | "MATCHED" | "DRAFT" | "LINKED" | "ARCHIVED";
  matchConfidence?: number;
  submittedAt: string;
  linkedPatientId?: string;
  linkedPatientName?: string;
  draftPatientId?: string;
  draftPatientName?: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function IntakeFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<IntakeFormListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [selectedForm, setSelectedForm] = useState<IntakeFormListItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [formDetails, setFormDetails] = useState<any>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        ...(selectedStatus !== "all" && { status: selectedStatus }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/intake-forms?${params}`);
      if (!response.ok) throw new Error("Failed to fetch forms");

      const data = await response.json();
      setForms(data.data || []);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching intake forms:", error);
    } finally {
      setLoading(false);
    }
  }, [currentPage, selectedStatus, searchTerm]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  const handleViewDetails = (form: IntakeFormListItem) => {
    router.push(`/intake-forms/${form.id}`);
  };

  const handleArchiveForm = async (form: IntakeFormListItem) => {
    if (!confirm(`Archive this form "${form.hippatizFormTitle}"? It will be hidden from active forms.`)) return;
    setArchivingId(form.id);
    try {
      const res = await fetch(`/api/intake-forms/${form.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ARCHIVED' }),
      });
      if (res.ok) fetchForms();
    } catch (e) {
      console.error('Archive failed', e);
    } finally {
      setArchivingId(null);
    }
  };

  const handleExportForm = async (form: IntakeFormListItem) => {
    setExportingId(form.id);
    try {
      const res = await fetch(`/api/intake-forms/${form.id}/export/pdf`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `intake-form-${form.id}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setExportingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      RECEIVED: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
      MATCHED: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
      DRAFT: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
      LINKED: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
      ARCHIVED: "bg-slate-100 text-slate-800 dark:bg-slate-900/30 dark:text-slate-400",
    };
    return colors[status] || "bg-slate-100 text-slate-800";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      RECEIVED: "Received",
      MATCHED: "Matched",
      DRAFT: "Draft",
      LINKED: "Linked",
      ARCHIVED: "Archived",
    };
    return labels[status] || status;
  };

  return (
    <div className="pt-4 pb-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
            Intake Forms
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Manage and review patient intake forms from Hippatizer
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800">
            <FileText className="h-3 w-3 mr-1" />
            {pagination?.total || 0} forms
          </Badge>
        </div>
      </div>

      {/* Filters Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by patient name or email..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={(value) => {
              setSelectedStatus(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="RECEIVED">Received</SelectItem>
                <SelectItem value="MATCHED">Matched</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="LINKED">Linked</SelectItem>
                <SelectItem value="ARCHIVED">Archived</SelectItem>
              </SelectContent>
            </Select>

            {/* Info */}
            <div className="flex items-center text-sm text-slate-500 dark:text-slate-400">
              Page {currentPage} of {pagination?.totalPages || 1}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Forms Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : forms.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500 dark:text-slate-400">No intake forms found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Form Title</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {forms.map((form) => (
                    <TableRow key={form.id}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {form.hippatizFormTitle}
                      </TableCell>
                      <TableCell className="text-sm text-slate-500 dark:text-slate-400">
                        {new Date(form.submittedAt).toLocaleDateString()} <br />
                        <span className="text-xs">{new Date(form.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </TableCell>
                      <TableCell>
                        {form.linkedPatientName ? (
                          <div className="text-sm">
                            <p className="font-medium">{form.linkedPatientName}</p>
                            <p className="text-xs text-slate-500">Linked</p>
                          </div>
                        ) : form.draftPatientName ? (
                          <div className="text-sm">
                            <p className="font-medium">{form.draftPatientName}</p>
                            <p className="text-xs text-slate-500">Draft</p>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500">Unmatched</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(form.status)}>
                          {getStatusLabel(form.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {form.matchConfidence ? (
                          <div className="text-sm">
                            <div className="flex items-center gap-1">
                              <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${form.matchConfidence * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium">
                                {Math.round(form.matchConfidence * 100)}%
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewDetails(form)}
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {form.status === "RECEIVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedForm(form);
                                setShowMatchModal(true);
                              }}
                              title="Match patient"
                            >
                              <UserPlus className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExportForm(form)}
                            title="Export as PDF"
                            disabled={exportingId === form.id}
                          >
                            {exportingId === form.id
                              ? <Loader className="h-4 w-4 animate-spin" />
                              : <Download className="h-4 w-4" />}
                          </Button>
                          {form.status !== "ARCHIVED" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleArchiveForm(form)}
                              title="Archive form"
                              disabled={archivingId === form.id}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              {archivingId === form.id
                                ? <Loader className="h-4 w-4 animate-spin" />
                                : <Trash2 className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Showing {(currentPage - 1) * pagination.limit + 1} to{" "}
            {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} forms
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={currentPage === pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedForm?.hippatizFormTitle}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : formDetails ? (
            <div className="space-y-6">
              {/* Form Fields */}
              <div>
                <h3 className="font-semibold text-lg mb-4">Form Data</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {formDetails.fieldValues?.map((field: any, idx: number) => (
                    <div
                      key={idx}
                      className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-900/30"
                    >
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                        {field.fieldLabel}
                      </p>
                      <p className="text-sm text-slate-900 dark:text-slate-50 mt-1">
                        {String(field.value)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Linked Patient */}
              {formDetails.linkedPatient && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Linked Patient</h3>
                  <div className="border border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-950/30">
                    <p className="font-medium">
                      {formDetails.linkedPatient.firstName} {formDetails.linkedPatient.lastName}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                      {formDetails.linkedPatient.email}
                    </p>
                  </div>
                </div>
              )}

              {/* Potential Matches */}
              {formDetails.potentialMatches && formDetails.potentialMatches.length > 0 && (
                <div>
                  <h3 className="font-semibold text-lg mb-4">Potential Matches</h3>
                  <div className="space-y-2">
                    {formDetails.potentialMatches.map((match: any, idx: number) => (
                      <div
                        key={idx}
                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-3"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">
                              {match.firstName} {match.lastName}
                            </p>
                            <p className="text-xs text-slate-500">{match.email}</p>
                          </div>
                          <Badge variant="outline">
                            {Math.round(match.confidence * 100)}% match
                          </Badge>
                        </div>
                        {match.matchReasons && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {match.matchReasons.map((reason: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {reason}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailModal(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Match Patient Modal */}
      <Dialog open={showMatchModal} onOpenChange={setShowMatchModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Match Patient</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Select an existing patient or create a draft for this intake form:
            </p>
            <div className="space-y-2">
              <Button
                className="w-full"
                onClick={() => {
                  router.push(`/intake-forms/${selectedForm?.id}/match`);
                  setShowMatchModal(false);
                }}
              >
                View Matches & Link Patient
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  router.push(`/patient-drafts/new?formId=${selectedForm?.id}`);
                  setShowMatchModal(false);
                }}
              >
                Create Draft Patient
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => setShowMatchModal(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
