"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  CreditCard,
  ClipboardList,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { adminFetch } from "@/lib/admin-client";

interface Stats {
  totalLeads: number;
  conversions: number;
  activeSubscribers: number;
  monthlyRevenue: number;
  pendingIntakes: number;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats>({
    totalLeads: 0,
    conversions: 0,
    activeSubscribers: 0,
    monthlyRevenue: 0,
    pendingIntakes: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const result = await adminFetch<Stats>("/api/admin/stats");
      if (result.ok) {
        setStats(result.data);
      } else {
        setError(result.error);
      }
      setLoading(false);
    })();
  }, []);

  const cards = [
    { label: "Total Leads", value: stats.totalLeads, icon: Users, color: "bg-blue-100 text-blue-600" },
    { label: "Conversions", value: stats.conversions, icon: CreditCard, color: "bg-green-100 text-green-600" },
    { label: "Active Subscribers", value: stats.activeSubscribers, icon: ClipboardList, color: "bg-purple-100 text-purple-600" },
    { label: "Monthly Revenue", value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: "bg-brand-teal-light text-brand-teal-dark" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy">Dashboard</h1>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          Error loading stats: {error}
        </p>
      )}

      {!loading && stats.pendingIntakes > 0 && (
        <Link
          href="/admin/intakes"
          className="mt-4 flex items-center gap-3 rounded-xl border-2 border-amber-200 bg-amber-50 p-4 transition-colors hover:bg-amber-100"
        >
          <div className="flex size-10 items-center justify-center rounded-lg bg-amber-200 text-amber-800">
            <AlertCircle className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">
              {stats.pendingIntakes} intake
              {stats.pendingIntakes === 1 ? "" : "s"} awaiting review
            </p>
            <p className="text-xs text-amber-800">
              Patients are waiting for provider approval.
            </p>
          </div>
          <span className="text-sm font-medium text-amber-900">Review →</span>
        </Link>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-sm text-brand-gray-dark">{card.label}</span>
              <div className={`flex size-9 items-center justify-center rounded-lg ${card.color}`}>
                <card.icon className="size-4" />
              </div>
            </div>
            <p className="mt-2 text-2xl font-bold text-brand-navy">
              {loading ? "—" : card.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <Link
          href="/admin/leads"
          className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold text-brand-navy">Leads</p>
          <p className="mt-1 text-xs text-brand-gray-dark">
            Review captured leads, AI qualification scores, and conversions.
          </p>
        </Link>
        <Link
          href="/admin/patients"
          className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold text-brand-navy">Patients</p>
          <p className="mt-1 text-xs text-brand-gray-dark">
            See all paying patients and their subscription status.
          </p>
        </Link>
        <Link
          href="/admin/intakes"
          className="rounded-xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <p className="text-sm font-semibold text-brand-navy">Intakes</p>
          <p className="mt-1 text-xs text-brand-gray-dark">
            Review medical intakes and approve prescriptions.
          </p>
        </Link>
      </div>
    </div>
  );
}
