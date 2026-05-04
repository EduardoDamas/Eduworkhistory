"use client";

import { useEffect, useState } from "react";
import { Button } from "../../../../components/ui/Button";
import { Card } from "../../../../components/ui/Card";
import { Loader } from "../../../../components/ui/Loader";
import { apiRequest } from "../../../../lib/api";
import { useToast } from "../../../../lib/useToast";

export default function MappingSettingsPage() {
  const toast = useToast();
  const [jsonValue, setJsonValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiRequest<Record<string, unknown>>("/comanda/settings/mapping")
      .then((config) => {
        setJsonValue(JSON.stringify(config, null, 2));
        setError(null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load mapping"))
      .finally(() => setLoading(false));
  }, []);

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      const parsed = JSON.parse(jsonValue) as Record<string, unknown>;
      await apiRequest("/comanda/settings/mapping", {
        method: "PUT",
        body: JSON.stringify(parsed),
      });
      toast.success("Mapping saved");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save mapping";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Mapping settings</h1>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-slate-600">
          <Loader />
          Loading mapping...
        </div>
      ) : null}
      <Card>
        <textarea
          className="h-[500px] w-full rounded-lg border border-slate-300 p-3 font-mono text-xs transition-colors duration-150 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          value={jsonValue}
          onChange={(e) => setJsonValue(e.target.value)}
        />
        <div className="mt-3 flex items-center gap-3">
          <Button variant="secondary" loading={saving} onClick={() => void onSave()}>
            Save mapping
          </Button>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </Card>
    </div>
  );
}
