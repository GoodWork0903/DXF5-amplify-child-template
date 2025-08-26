"use client";

import "@/utils/amplify-client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchAuthSession, getCurrentUser } from "aws-amplify/auth";

// Super-simple DataTable features: search, sort, pagination (client-side)

export default function DashboardPage() {
  const router = useRouter();

  // raw data
  type ChildApp = {
    id?: string;
    appname?: string;
    subdomain?: string;
    manager?: string;
    status?: string;
    createdAt?: string | number | Date;
    url?: string;
    [key: string]: unknown;
  };

  return (
    <main className="p-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold">Dashboard</h2>
      </div>
    </main>
  );
}


