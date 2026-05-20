"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";

export default function NewSlabPage() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    grade: "",
    estimatedValueUsd: "",
    acquiredAt: "",
    imageUrl: "",
    vaultedUrl: "",
    collectrUrl: "",
    solPrice: "",
    svfPrice: "",
    status: "AVAILABLE",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/admin/slabs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          estimatedValueUsd: formData.estimatedValueUsd ? parseFloat(formData.estimatedValueUsd) : null,
          solPrice: parseFloat(formData.solPrice),
          svfPrice: parseFloat(formData.svfPrice),
        }),
      });

      if (!response.ok) throw new Error("Failed to create slab");

      window.location.href = "/admin/slabs";
    } catch {
      alert("Failed to create slab");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-12 sm:px-5 sm:py-16">
      <Breadcrumbs
        items={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Slabs", href: "/admin/slabs" },
          { label: "New", href: "/admin/slabs/new" },
        ]}
      />

      <div className="space-y-4">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Add New Slab
        </h1>
        <p className="text-lg text-muted">
          Add a new slab to the marketplace.
        </p>
      </div>

      <Card className="space-y-6 p-6 bg-gradient-to-br from-vault-panel/50 to-vault-deep/50">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="e.g., Charizard 1st Edition"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Grade</label>
              <input
                type="text"
                required
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="e.g., PSA 10"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estimated Value (USD)</label>
              <input
                type="number"
                value={formData.estimatedValueUsd}
                onChange={(e) => setFormData({ ...formData, estimatedValueUsd: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="e.g., 5000"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Acquired Date</label>
              <input
                type="date"
                required
                value={formData.acquiredAt}
                onChange={(e) => setFormData({ ...formData, acquiredAt: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image URL</label>
            <input
              type="url"
              required
              value={formData.imageUrl}
              onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
              className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
              placeholder="https://..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Vaulted URL</label>
              <input
                type="url"
                required
                value={formData.vaultedUrl}
                onChange={(e) => setFormData({ ...formData, vaultedUrl: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="https://vaulted.id/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Collectr URL (optional)</label>
              <input
                type="url"
                value={formData.collectrUrl}
                onChange={(e) => setFormData({ ...formData, collectrUrl: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="https://collectr.com/..."
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">SOL Price</label>
              <input
                type="number"
                step="0.000001"
                required
                value={formData.solPrice}
                onChange={(e) => setFormData({ ...formData, solPrice: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="e.g., 0.5"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">SVF Price</label>
              <input
                type="number"
                step="0.000001"
                required
                value={formData.svfPrice}
                onChange={(e) => setFormData({ ...formData, svfPrice: e.target.value })}
                className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
                placeholder="e.g., 1000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full rounded-lg border border-line bg-vault-panel px-4 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-vault-amber/50"
            >
              <option value="AVAILABLE">Available</option>
              <option value="RESERVED">Reserved</option>
              <option value="SOLD">Sold</option>
              <option value="NOT_FOR_SALE">Not for Sale</option>
            </select>
          </div>

          <div className="flex gap-4">
            <Button
              type="submit"
              disabled={loading}
              className="transition-all duration-300 hover:scale-105"
            >
              {loading ? "Creating..." : "Create Slab"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => window.location.href = "/admin/slabs"}
              className="transition-all duration-300 hover:scale-105"
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
