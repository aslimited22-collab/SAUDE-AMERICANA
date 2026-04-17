"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin-client";

interface Lead {
  id: string;
  first_name: string;
  email: string;
  quiz_answers: Record<string, string>;
  converted: boolean;
  created_at: string;
  qualification_score?: number | null;
  qualification_tier?: string | null;
  utm_source?: string | null;
}

function scoreColor(score: number | null | undefined): string {
  if (score == null) return "bg-gray-100 text-gray-600";
  if (score >= 85) return "bg-green-100 text-green-700";
  if (score >= 65) return "bg-blue-100 text-blue-700";
  if (score >= 40) return "bg-amber-100 text-amber-700";
  return "bg-red-100 text-red-700";
}

export default function AdminLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await adminFetch<Lead[]>("/api/admin/leads");
      if (result.ok) {
        setLeads(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Leads</h1>
      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Error: {error}
        </p>
      )}
      <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-brand-gray text-xs uppercase text-brand-gray-dark">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Goal</th>
              <th className="px-4 py-3">AI Score</th>
              <th className="px-4 py-3">Tier</th>
              <th className="px-4 py-3">Source</th>
              <th className="px-4 py-3">Converted</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-brand-gray-dark">Loading...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-brand-gray-dark">No leads yet</td></tr>
            ) : (
              leads.map((lead) => (
                <tr key={lead.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">{lead.first_name}</td>
                  <td className="px-4 py-3 text-brand-gray-dark">{lead.email}</td>
                  <td className="px-4 py-3 text-brand-gray-dark">{lead.quiz_answers?.goal || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${scoreColor(lead.qualification_score)}`}>
                      {lead.qualification_score ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-brand-gray-dark">
                    {lead.qualification_tier ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-brand-gray-dark">
                    {lead.utm_source || "direct"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${lead.converted ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                      {lead.converted ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-gray-dark">{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
