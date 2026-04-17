"use client";

import { useState, useEffect, useCallback } from "react";
import { adminFetch } from "@/lib/admin-client";

interface Intake {
  id: string;
  lead_id: string;
  personal_info: { fullName?: string; phone?: string; last_name?: string; dob?: string; address?: string };
  medications: { list?: string[]; other?: string };
  allergies: string;
  medical_conditions: string[] | Record<string, unknown>[];
  vitals: { bloodPressure?: string; heartRate?: string; recentBloodwork?: string; weight_kg?: number; height_cm?: number; bmi?: number };
  weight_loss_history: { previousGlp1?: string; which?: string };
  consent_signed: boolean;
  signature_name: string;
  submitted_at: string;
  reviewed: boolean;
  reviewed_at?: string;
  reviewed_by?: string;
  provider_notes?: string;
  ai_risk_score?: number;
  ai_flags?: Array<{ flag: string; severity: string; reason: string }>;
  prescription_sent?: boolean;
  leads?: { first_name?: string; email?: string; plan?: string };
}

export default function AdminIntakes() {
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Intake | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [providerNotes, setProviderNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const result = await adminFetch<Intake[]>("/api/admin/intakes");
    if (result.ok) {
      setIntakes(result.data);
      setLoadError(null);
    } else {
      setLoadError(result.error);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function review(approved: boolean) {
    if (!selected) return;
    setActionLoading(true);
    setActionResult(null);
    const result = await adminFetch<{ success: boolean; summary?: string; pharmacyError?: string }>(
      `/api/admin/intakes/${selected.id}/review`,
      {
        method: "POST",
        body: JSON.stringify({ approved, providerNotes }),
      }
    );
    setActionLoading(false);
    if (result.ok) {
      setActionResult(
        approved
          ? `Approved. ${result.data.summary ?? ""}${
              result.data.pharmacyError ? ` (Pharmacy error: ${result.data.pharmacyError})` : ""
            }`
          : "Intake marked as denied."
      );
      await load();
    } else {
      setActionResult(`Error: ${result.error}`);
    }
  }

  // ─── Detail view ────────────────────────────────────────────────────────────
  if (selected) {
    return (
      <div>
        <button
          onClick={() => {
            setSelected(null);
            setActionResult(null);
            setProviderNotes("");
          }}
          className="mb-4 text-sm text-brand-teal hover:underline"
        >
          &larr; Back to list
        </button>
        <div className="rounded-xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-brand-navy">
                {selected.personal_info?.fullName ||
                  selected.leads?.first_name ||
                  "Patient Intake"}
              </h2>
              <p className="text-sm text-brand-gray-dark">
                Submitted {new Date(selected.submitted_at).toLocaleString()}
              </p>
              {selected.leads?.email && (
                <p className="text-sm text-brand-gray-dark">{selected.leads.email}</p>
              )}
            </div>
            {selected.ai_risk_score !== undefined && selected.ai_risk_score !== null && (
              <div className="text-right">
                <p className="text-xs text-brand-gray-dark">AI risk score</p>
                <p
                  className={`text-2xl font-bold ${
                    selected.ai_risk_score >= 85
                      ? "text-green-600"
                      : selected.ai_risk_score >= 65
                      ? "text-blue-600"
                      : selected.ai_risk_score >= 40
                      ? "text-amber-600"
                      : "text-red-600"
                  }`}
                >
                  {selected.ai_risk_score}
                </p>
              </div>
            )}
          </div>

          <div className="mt-6 space-y-4">
            <DetailSection title="Personal Info">
              <p>Name: {selected.personal_info?.fullName}</p>
              <p>Phone: {selected.personal_info?.phone}</p>
              {selected.personal_info?.dob && <p>DOB: {selected.personal_info.dob}</p>}
              {selected.personal_info?.address && (
                <p>Address: {selected.personal_info.address}</p>
              )}
            </DetailSection>
            <DetailSection title="Medications">
              <p>{selected.medications?.list?.join(", ") || "None"}</p>
              {selected.medications?.other && <p>Other: {selected.medications.other}</p>}
            </DetailSection>
            <DetailSection title="Allergies">
              <p>{selected.allergies || "None"}</p>
            </DetailSection>
            <DetailSection title="Medical Conditions">
              <p>
                {Array.isArray(selected.medical_conditions)
                  ? (selected.medical_conditions as string[]).join(", ") || "None"
                  : JSON.stringify(selected.medical_conditions)}
              </p>
            </DetailSection>
            <DetailSection title="Vitals">
              <p>BP: {selected.vitals?.bloodPressure || "N/A"}</p>
              <p>HR: {selected.vitals?.heartRate || "N/A"}</p>
              {selected.vitals?.bmi && <p>BMI: {selected.vitals.bmi}</p>}
              <p>Recent bloodwork: {selected.vitals?.recentBloodwork || "N/A"}</p>
            </DetailSection>
            <DetailSection title="Weight Loss History">
              <p>Previous GLP-1: {selected.weight_loss_history?.previousGlp1 || "N/A"}</p>
              {selected.weight_loss_history?.which && (
                <p>Which: {selected.weight_loss_history.which}</p>
              )}
            </DetailSection>
            {selected.ai_flags && selected.ai_flags.length > 0 && (
              <DetailSection title="AI Flags">
                <ul className="space-y-1">
                  {selected.ai_flags.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span
                        className={`rounded px-1.5 text-xs font-medium uppercase ${
                          f.severity === "disqualify"
                            ? "bg-red-100 text-red-700"
                            : f.severity === "warning"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {f.severity}
                      </span>
                      <span>
                        <strong>{f.flag}</strong>: {f.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              </DetailSection>
            )}
            <DetailSection title="Consent">
              <p>Signed: {selected.consent_signed ? "Yes" : "No"}</p>
              <p>Signature: {selected.signature_name}</p>
            </DetailSection>

            {/* Review panel */}
            <div className="mt-6 rounded-xl border-2 border-brand-teal-light bg-brand-teal-light/20 p-5">
              <h3 className="text-base font-bold text-brand-navy">
                {selected.reviewed ? "Review status" : "Review this intake"}
              </h3>
              {selected.reviewed ? (
                <div className="mt-2 text-sm">
                  <p>
                    Reviewed by <strong>{selected.reviewed_by}</strong>{" "}
                    {selected.reviewed_at && (
                      <>on {new Date(selected.reviewed_at).toLocaleString()}</>
                    )}
                  </p>
                  {selected.provider_notes && (
                    <p className="mt-2">
                      <strong>Notes:</strong> {selected.provider_notes}
                    </p>
                  )}
                  {selected.prescription_sent && (
                    <p className="mt-2 text-green-700">
                      ✓ Prescription already sent to pharmacy
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <textarea
                    placeholder="Provider notes (optional)"
                    value={providerNotes}
                    onChange={(e) => setProviderNotes(e.target.value)}
                    className="mt-3 w-full rounded-lg border border-brand-gray bg-white p-3 text-sm outline-none focus:border-brand-teal"
                    rows={3}
                  />
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => review(true)}
                      disabled={actionLoading}
                      className="rounded-lg bg-brand-teal px-4 py-2 text-sm font-semibold text-brand-navy hover:bg-brand-teal-dark disabled:opacity-60"
                    >
                      {actionLoading ? "Processing…" : "Approve & send Rx"}
                    </button>
                    <button
                      onClick={() => review(false)}
                      disabled={actionLoading}
                      className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-red-700 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
                    >
                      Deny
                    </button>
                  </div>
                </>
              )}
              {actionResult && (
                <p className="mt-3 text-sm text-brand-navy">{actionResult}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── List view ──────────────────────────────────────────────────────────────
  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Medical Intakes</h1>
      {loadError && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Error loading intakes: {loadError}
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-brand-gray text-xs uppercase text-brand-gray-dark">
            <tr>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">AI Score</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-gray-dark">Loading...</td></tr>
            ) : intakes.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-gray-dark">No intakes yet</td></tr>
            ) : (
              intakes.map((intake) => (
                <tr key={intake.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">
                    {intake.personal_info?.fullName || intake.leads?.first_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-gray-dark">
                    {intake.ai_risk_score ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-gray-dark">{new Date(intake.submitted_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${intake.reviewed ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {intake.reviewed ? "Reviewed" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setSelected(intake)} className="text-sm text-brand-teal hover:underline">
                      View Details
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b pb-3 last:border-0">
      <h3 className="mb-1 text-sm font-semibold text-brand-navy">{title}</h3>
      <div className="text-sm text-brand-gray-dark">{children}</div>
    </div>
  );
}
