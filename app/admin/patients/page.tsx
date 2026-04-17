"use client";

import { useState, useEffect } from "react";
import { adminFetch } from "@/lib/admin-client";

interface Patient {
  id: string;
  first_name: string;
  email: string;
  plan: string;
  subscription_id: string;
  subscription_status: string;
  created_at: string;
  has_intake: boolean;
}

export default function AdminPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await adminFetch<Patient[]>("/api/admin/patients");
      if (result.ok) {
        setPatients(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Patients</h1>
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
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Subscription</th>
              <th className="px-4 py-3">Intake</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-gray-dark">Loading...</td></tr>
            ) : patients.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-gray-dark">No patients yet</td></tr>
            ) : (
              patients.map((p) => (
                <tr key={p.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium text-brand-navy">{p.first_name}</td>
                  <td className="px-4 py-3 text-brand-gray-dark">{p.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-brand-teal-light px-2 py-0.5 text-xs font-medium text-brand-teal-dark capitalize">
                      {p.plan || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        p.subscription_status === "active"
                          ? "bg-green-100 text-green-700"
                          : p.subscription_status === "past_due"
                          ? "bg-amber-100 text-amber-700"
                          : p.subscription_status === "canceled"
                          ? "bg-red-100 text-red-700"
                          : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {p.subscription_status || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${p.has_intake ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                      {p.has_intake ? "Submitted" : "Pending"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-brand-gray-dark">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
