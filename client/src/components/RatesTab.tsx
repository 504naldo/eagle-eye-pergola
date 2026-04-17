/**
 * RatesTab — per-project unit rate editor.
 * Loads saved overrides from the DB, shows all QTO line items with their
 * current rate (default or overridden), lets the user edit any rate, and
 * saves on blur or on the explicit "Save Rates" button.
 */
import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { RotateCcw, Save, Info } from "lucide-react";

interface RateRow {
  category: string;
  description: string;
  unit: string;
  defaultRate: number;
}

interface RatesTabProps {
  projectId: number;
  /** All QTO line items from the current module — used to build the rate table */
  rateRows: RateRow[];
  /** Called after rates are saved so the parent can re-compute QTO totals */
  onRatesSaved?: (overrides: Record<string, number>) => void;
}

export function RatesTab({ projectId, rateRows, onRatesSaved }: RatesTabProps) {
  const [localRates, setLocalRates] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);

  // Load saved overrides
  const { data: savedRates, isLoading } = trpc.rates.get.useQuery(
    { projectId },
    { enabled: !!projectId }
  );

  // Initialise local state once saved rates arrive
  useEffect(() => {
    if (savedRates) {
      const init: Record<string, string> = {};
      rateRows.forEach(r => {
        const saved = savedRates[r.description];
        init[r.description] = saved !== undefined ? String(saved) : String(r.defaultRate);
      });
      setLocalRates(init);
      setIsDirty(false);
    } else if (!isLoading) {
      // No saved rates yet — use defaults
      const init: Record<string, string> = {};
      rateRows.forEach(r => { init[r.description] = String(r.defaultRate); });
      setLocalRates(init);
    }
  }, [savedRates, isLoading, rateRows.length]);

  const saveMutation = trpc.rates.save.useMutation({
    onSuccess: (saved) => {
      setIsDirty(false);
      toast.success("Rates saved", { description: "Unit rate overrides have been saved to this project." });
      onRatesSaved?.(saved);
    },
    onError: (err) => {
      toast.error("Save failed", { description: err.message });
    },
  });

  const handleChange = useCallback((description: string, value: string) => {
    setLocalRates(prev => ({ ...prev, [description]: value }));
    setIsDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    const rates: Record<string, number> = {};
    rateRows.forEach(r => {
      const val = parseFloat(localRates[r.description] ?? "");
      if (!isNaN(val) && val >= 0) rates[r.description] = val;
    });
    saveMutation.mutate({ projectId, rates });
  }, [localRates, rateRows, projectId, saveMutation]);

  const handleReset = useCallback((description: string, defaultRate: number) => {
    setLocalRates(prev => ({ ...prev, [description]: String(defaultRate) }));
    setIsDirty(true);
  }, []);

  const handleResetAll = useCallback(() => {
    const init: Record<string, string> = {};
    rateRows.forEach(r => { init[r.description] = String(r.defaultRate); });
    setLocalRates(init);
    setIsDirty(true);
  }, [rateRows]);

  // Group rows by category
  const grouped = rateRows.reduce<Record<string, RateRow[]>>((acc, row) => {
    if (!acc[row.category]) acc[row.category] = [];
    acc[row.category].push(row);
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground">Unit Rate Overrides</h3>
          <p className="text-sm text-muted-foreground mt-0.5">
            Edit any rate to override the default for this project only. Changes are reflected in the QTO totals after saving.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetAll}
            className="gap-1.5 text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className="gap-1.5 text-xs bg-[#C9A84C] hover:bg-[#b8943d] text-black"
          >
            <Save className="w-3.5 h-3.5" />
            {saveMutation.isPending ? "Saving…" : "Save Rates"}
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-200">
        <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
        <span>
          Rates shown are in <strong>CAD</strong>. Default rates are preliminary estimates only — update them to match your current supplier pricing. Overrides apply to this project only.
        </span>
      </div>

      {/* Rate table grouped by category */}
      <div className="space-y-5">
        {Object.entries(grouped).map(([category, rows]) => (
          <div key={category}>
            <div className="text-xs font-semibold uppercase tracking-wider text-[#C9A84C] mb-2 pb-1 border-b border-border/50">
              {category}
            </div>
            <div className="space-y-1.5">
              {rows.map(row => {
                const current = parseFloat(localRates[row.description] ?? String(row.defaultRate));
                const isOverridden = !isNaN(current) && current !== row.defaultRate;
                return (
                  <div
                    key={row.description}
                    className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/30 transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm text-foreground truncate">{row.description}</span>
                        {isOverridden && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-amber-500/50 text-amber-400 shrink-0">
                            overridden
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">per {row.unit} · default: ${row.defaultRate.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={localRates[row.description] ?? String(row.defaultRate)}
                        onChange={e => handleChange(row.description, e.target.value)}
                        className="w-24 h-8 text-sm text-right tabular-nums"
                      />
                    </div>
                    {isOverridden ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        title="Reset to default"
                        onClick={() => handleReset(row.description, row.defaultRate)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <div className="w-8" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
