"use client";

import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  Check,
  AlertCircle,
  X,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

interface CSVImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: (results: ImportResult) => void;
}

interface CSVRow {
  [key: string]: string;
}

interface ColumnMapping {
  [key: string]: string; // CSV column name -> patient field
}

interface ValidationError {
  row: number;
  field: string;
  value: string;
  error: string;
}

interface ImportResult {
  successful: number;
  failed: number;
  errors: ValidationError[];
  warnings: string[];
}

const PATIENT_FIELDS = [
  { id: "name", label: "Patient Name", required: true },
  { id: "parent", label: "Parent/Guardian Name", required: true },
  { id: "dob", label: "Date of Birth (YYYY-MM-DD)", required: true },
  { id: "phone", label: "Phone Number", required: true },
];

export default function CSVImportModal({
  open,
  onOpenChange,
  onImportComplete,
}: CSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "complete">(
    "upload"
  );
  const [csvData, setCSVData] = useState<CSVRow[]>([]);
  const [csvColumns, setCSVColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [fileName, setFileName] = useState("");

  // Parse CSV file
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      alert("Please select a CSV file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string;
        const lines = csv.trim().split("\n");

        if (lines.length < 2) {
          alert("CSV file must contain at least a header row and one data row");
          return;
        }

        // Parse header
        const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
        setCSVColumns(headers);

        // Parse data rows
        const rows: CSVRow[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
          const row: CSVRow = {};

          headers.forEach((header, index) => {
            row[header] = values[index] || "";
          });

          rows.push(row);
        }

        setCSVData(rows);
        setColumnMapping({});
        setStep("mapping");
      } catch (error) {
        alert(`Error parsing CSV: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    };

    reader.readAsText(file);
  };

  // Validate data
  const validateData = (): ValidationError[] => {
    const errors: ValidationError[] = [];
    const now = new Date();

    csvData.forEach((row, rowIndex) => {
      const patientData: any = {};

      // Map CSV columns to patient fields
      Object.entries(columnMapping).forEach(([csvCol, patientField]) => {
        patientData[patientField] = row[csvCol];
      });

      // Validate required fields
      PATIENT_FIELDS.forEach((field) => {
        if (field.required && !patientData[field.id]?.trim()) {
          errors.push({
            row: rowIndex + 2, // +2 because header is row 1 and 0-indexed
            field: field.label,
            value: patientData[field.id] || "",
            error: `${field.label} is required`,
          });
        }
      });

      // Validate name format
      if (patientData.name && patientData.name.length > 100) {
        errors.push({
          row: rowIndex + 2,
          field: "name",
          value: patientData.name,
          error: "Patient name must be 100 characters or less",
        });
      }

      // Validate parent name format
      if (patientData.parent && patientData.parent.length > 100) {
        errors.push({
          row: rowIndex + 2,
          field: "parent",
          value: patientData.parent,
          error: "Parent name must be 100 characters or less",
        });
      }

      // Validate date of birth
      if (patientData.dob) {
        const dobDate = new Date(patientData.dob);
        if (isNaN(dobDate.getTime())) {
          errors.push({
            row: rowIndex + 2,
            field: "dob",
            value: patientData.dob,
            error: "Date of birth must be in YYYY-MM-DD format",
          });
        } else if (dobDate > now) {
          errors.push({
            row: rowIndex + 2,
            field: "dob",
            value: patientData.dob,
            error: "Date of birth cannot be in the future",
          });
        } else {
          const age = now.getFullYear() - dobDate.getFullYear();
          if (age > 18) {
            errors.push({
              row: rowIndex + 2,
              field: "dob",
              value: patientData.dob,
              error: "Patient age exceeds 18 years",
            });
          }
        }
      }

      // Validate phone format
      if (patientData.phone) {
        const phoneRegex = /^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/;
        if (!phoneRegex.test(patientData.phone.replace(/\s/g, ""))) {
          errors.push({
            row: rowIndex + 2,
            field: "phone",
            value: patientData.phone,
            error: "Phone number must be in a valid format (e.g., (555) 123-4567)",
          });
        }
      }
    });

    setValidationErrors(errors);
    return errors;
  };

  // Handle mapping completion
  const handleMappingComplete = () => {
    const requiredFields = PATIENT_FIELDS.filter((f) => f.required).map((f) => f.id);
    const mappedFields = Object.values(columnMapping);

    if (!requiredFields.every((field) => mappedFields.includes(field))) {
      alert("Please map all required fields");
      return;
    }

    const errors = validateData();
    setStep("preview");
  };

  // Handle import
  const handleImport = async () => {
    setStep("importing");
    setImportProgress(0);

    // Simulate import process
    const totalRows = csvData.length;
    let successful = 0;
    let failed = validationErrors.length > 0 ? validationErrors.filter(e => e.field !== "").length : 0;

    // Simulate gradual progress
    const interval = setInterval(() => {
      setImportProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          return prev;
        }
        return prev + Math.random() * 25;
      });
    }, 300);

    // Simulate delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    clearInterval(interval);
    successful = totalRows - failed;

    const result: ImportResult = {
      successful,
      failed,
      errors: validationErrors,
      warnings: [
        `Imported from file: ${fileName}`,
        `${successful} patient record${successful !== 1 ? "s" : ""} added successfully`,
      ],
    };

    setImportProgress(100);
    setImportResult(result);
    setStep("complete");

    if (onImportComplete) {
      onImportComplete(result);
    }
  };

  // Reset modal
  const handleReset = () => {
    setStep("upload");
    setCSVData([]);
    setCSVColumns([]);
    setColumnMapping({});
    setValidationErrors([]);
    setImportProgress(0);
    setImportResult(null);
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    handleReset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "upload" && "Import Patients from CSV"}
            {step === "mapping" && "Map CSV Columns"}
            {step === "preview" && "Preview & Validate Data"}
            {step === "importing" && "Importing Patients..."}
            {step === "complete" && "Import Complete"}
          </DialogTitle>
          <DialogDescription>
            {step === "upload" &&
              "Upload a CSV file to bulk import patient records"}
            {step === "mapping" &&
              "Match your CSV columns to patient fields"}
            {step === "preview" &&
              `${csvData.length} patient${csvData.length !== 1 ? "s" : ""} ready to import`}
            {step === "importing" && "Processing your patient records..."}
            {step === "complete" &&
              `${importResult?.successful || 0} patient${importResult?.successful !== 1 ? "s" : ""} imported successfully`}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div
              className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
              <p className="font-medium text-slate-900 mb-1">
                Click to upload or drag and drop
              </p>
              <p className="text-sm text-slate-500">CSV files only (max 10MB)</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Required CSV Columns:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                {PATIENT_FIELDS.map((field) => (
                  <li key={field.id}>
                    • {field.label}
                    {field.required && " (required)"}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-lg">
              <strong>Example CSV format:</strong>
              <pre className="mt-2 whitespace-pre-wrap break-words">
                Patient Name,Parent Name,Date of Birth,Phone Number
                Emma Wilson,Sarah Wilson,2018-03-15,(555) 123-4567
                Lucas Brown,Michael Brown,2020-07-22,(555) 234-5678
              </pre>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Select which CSV column corresponds to each patient field:
            </p>

            <div className="space-y-3">
              {PATIENT_FIELDS.map((field) => (
                <div key={field.id} className="flex items-center gap-3">
                  <label className="w-40 text-sm font-medium text-slate-700">
                    {field.label}
                    {field.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  <select
                    value={columnMapping[field.id] || ""}
                    onChange={(e) => {
                      const newMapping = { ...columnMapping };
                      if (e.target.value) {
                        newMapping[field.id] = e.target.value;
                      } else {
                        delete newMapping[field.id];
                      }
                      setColumnMapping(newMapping);
                    }}
                    className="flex-1 h-9 px-3 border border-slate-200 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                  >
                    <option value="">Select column...</option>
                    {csvColumns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                Make sure all required fields are mapped to continue.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={handleReset}>
                Cancel
              </Button>
              <Button onClick={handleMappingComplete} className="gap-2">
                Continue <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Validate */}
        {step === "preview" && (
          <div className="space-y-4">
            {validationErrors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  <h4 className="font-medium text-red-900">
                    {validationErrors.length} Validation Error
                    {validationErrors.length !== 1 ? "s" : ""}
                  </h4>
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {validationErrors.map((error, idx) => (
                    <div
                      key={idx}
                      className="text-sm text-red-800 bg-white p-2 rounded border border-red-100"
                    >
                      <strong>Row {error.row}, {error.field}:</strong> {error.error}
                    </div>
                  ))}
                </div>

                <p className="text-sm text-red-700 mt-3">
                  Please fix these errors in your CSV file and try again.
                </p>
              </div>
            )}

            {validationErrors.length === 0 && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                <p className="text-sm text-emerald-800">
                  All data validated successfully. Ready to import.
                </p>
              </div>
            )}

            <div className="bg-slate-50 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-slate-700">
                        Row
                      </th>
                      {PATIENT_FIELDS.map((field) => (
                        <th
                          key={field.id}
                          className="px-4 py-2 text-left text-xs font-semibold text-slate-700 whitespace-nowrap"
                        >
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(0, 5).map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-200 hover:bg-white/50">
                        <td className="px-4 py-2 text-slate-600">{idx + 2}</td>
                        {PATIENT_FIELDS.map((field) => (
                          <td
                            key={field.id}
                            className="px-4 py-2 text-slate-900 truncate max-w-xs"
                          >
                            {row[columnMapping[field.id] || ""]}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {csvData.length > 5 && (
                <div className="px-4 py-3 bg-slate-100 text-sm text-slate-600 border-t border-slate-200">
                  Showing 5 of {csvData.length} rows
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={validationErrors.length > 0}
                className="gap-2"
              >
                Import {csvData.length} Patient
                {csvData.length !== 1 ? "s" : ""}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Importing Progress */}
        {step === "importing" && (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">
                  Importing records...
                </span>
                <span className="text-sm text-slate-500">{Math.round(importProgress)}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
            </div>

            <div className="text-center">
              <div className="inline-block">
                <div className="animate-spin">
                  <Upload className="h-8 w-8 text-blue-500" />
                </div>
              </div>
              <p className="text-slate-600 mt-3 text-sm">
                Processing {csvData.length} patient records...
              </p>
            </div>
          </div>
        )}

        {/* Step 5: Complete */}
        {step === "complete" && importResult && (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                <h3 className="font-semibold text-emerald-900">
                  Import Successful!
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs text-slate-600 mb-1">Successfully Imported</p>
                <p className="text-2xl font-bold text-emerald-600">
                  {importResult.successful}
                </p>
              </div>
              {importResult.failed > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <p className="text-xs text-red-600 mb-1">Failed Imports</p>
                  <p className="text-2xl font-bold text-red-600">
                    {importResult.failed}
                  </p>
                </div>
              )}
            </div>

            {importResult.errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Errors:</h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {importResult.errors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-xs text-red-800">
                      Row {error.row}: {error.error}
                    </div>
                  ))}
                  {importResult.errors.length > 5 && (
                    <div className="text-xs text-red-700 font-medium">
                      +{importResult.errors.length - 5} more errors
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                Your patient records have been imported and are now available in
                the system.
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                Import Another File
              </Button>
              <Button onClick={handleClose} className="gap-2">
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
