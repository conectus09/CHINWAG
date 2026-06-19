"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AdminPage() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin?key=${encodeURIComponent(key)}`);
      const body = await response.json();
      setData(JSON.stringify(body, null, 2));
    } catch {
      setData("Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const saved = sessionStorage.getItem("chinwag-admin-key");
    if (saved) setKey(saved);
  }, []);

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-2xl font-bold">Chinwag Admin</h1>
      <p className="mt-2 text-sm text-muted">
        Live stats, analytics, and recent reports. Default key: chinwag-admin
      </p>
      <div className="mt-6 flex gap-2">
        <Input
          value={key}
          onChange={(event) => setKey(event.target.value)}
          placeholder="Admin key"
          className="max-w-xs"
        />
        <Button
          onClick={() => {
            sessionStorage.setItem("chinwag-admin-key", key);
            void load();
          }}
          disabled={loading}
        >
          {loading ? "Loading..." : "Load dashboard"}
        </Button>
      </div>
      <pre className="mt-6 overflow-auto rounded-xl border border-border bg-card p-4 text-xs text-foreground">
        {data || "No data loaded yet."}
      </pre>
    </main>
  );
}