import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Pencil, Save, X, Trash2 } from 'lucide-react';

export interface QTOLineItem {
  lineKey: string;
  description: string;
  quantity: number;
  unit: string;
  unitRate?: number;
  total?: number;
}

export interface EditableQTOTableProps {
  items: QTOLineItem[];
  overrides: Record<string, { customQuantity?: number; customUnit?: string; customDescription?: string }>;
  onUpdateLineItem: (lineKey: string, customQuantity?: number, customUnit?: string, customDescription?: string) => Promise<void>;
  onDeleteLineItem: (lineKey: string) => Promise<void>;
  labourRates?: Record<string, number>;  // keyed by lineKey
  isLoading?: boolean;
}

export const EditableQTOTable: React.FC<EditableQTOTableProps> = ({
  items,
  overrides,
  onUpdateLineItem,
  onDeleteLineItem,
  labourRates,
  isLoading = false,
}) => {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<{ quantity?: number; unit?: string; description?: string }>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);

  const appliedItems = useMemo(() => {
    return items.map(item => {
      const override = overrides[item.lineKey];
      if (!override) return item;
      return {
        ...item,
        quantity: override.customQuantity ?? item.quantity,
        unit: override.customUnit ?? item.unit,
        description: override.customDescription ?? item.description,
      };
    });
  }, [items, overrides]);

  const handleEdit = (item: QTOLineItem) => {
    setEditingKey(item.lineKey);
    setEditValues({
      quantity: item.quantity,
      unit: item.unit,
      description: item.description,
    });
  };

  const handleSave = async (lineKey: string) => {
    setSavingKey(lineKey);
    try {
      await onUpdateLineItem(lineKey, editValues.quantity, editValues.unit, editValues.description);
      setEditingKey(null);
      setEditValues({});
    } catch (error) {
      console.error('Failed to save QTO line item:', error);
    } finally {
      setSavingKey(null);
    }
  };

  const handleDelete = async (lineKey: string) => {
    setDeletingKey(lineKey);
    try {
      await onDeleteLineItem(lineKey);
    } catch (error) {
      console.error('Failed to delete QTO line item:', error);
    } finally {
      setDeletingKey(null);
    }
  };

  const handleCancel = () => {
    setEditingKey(null);
    setEditValues({});
  };

  const totalCost = appliedItems.reduce((sum, item) => {
    const labRate = labourRates?.[item.lineKey] ?? 0;
    const itemTotal = item.quantity * ((item.unitRate ?? 0) + labRate);
    return sum + itemTotal;
  }, 0);

  return (
    <Card className="p-4">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted">
            <tr>
              <th className="text-left py-2 px-3 font-semibold">Description</th>
              <th className="text-right py-2 px-3 font-semibold">Qty</th>
              <th className="text-center py-2 px-3 font-semibold">Unit</th>
              <th className="text-right py-2 px-3 font-semibold">Mat Rate</th>
              <th className="text-right py-2 px-3 font-semibold">Lab Rate</th>
              <th className="text-right py-2 px-3 font-semibold">Total</th>
              <th className="text-center py-2 px-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {appliedItems.map((item) => {
              const isEditing = editingKey === item.lineKey;
              const isSaving = savingKey === item.lineKey;
              const isDeleting = deletingKey === item.lineKey;
              const labRate = labourRates?.[item.lineKey] ?? 0;
              const itemTotal = item.quantity * ((item.unitRate ?? 0) + labRate);

              return (
                <tr key={item.lineKey} className="border-b hover:bg-muted/50">
                  <td className="py-3 px-3">
                    {isEditing ? (
                      <Input
                        value={editValues.description || ''}
                        onChange={(e) => setEditValues({ ...editValues, description: e.target.value })}
                        className="text-sm"
                        placeholder="Description"
                      />
                    ) : (
                      <span className={overrides[item.lineKey] ? 'font-semibold text-blue-600' : ''}>
                        {item.description}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    {isEditing ? (
                      <Input
                        type="number"
                        value={editValues.quantity || 0}
                        onChange={(e) => setEditValues({ ...editValues, quantity: parseFloat(e.target.value) || 0 })}
                        className="text-sm w-20 ml-auto"
                        step="0.01"
                      />
                    ) : (
                      <span>{item.quantity.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isEditing ? (
                      <Input
                        value={editValues.unit || ''}
                        onChange={(e) => setEditValues({ ...editValues, unit: e.target.value })}
                        className="text-sm w-16 mx-auto"
                        placeholder="Unit"
                      />
                    ) : (
                      <span>{item.unit}</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right">
                    ${item.unitRate ? item.unitRate.toFixed(2) : '0.00'}
                  </td>
                  <td className="py-3 px-3 text-right text-blue-600">
                    ${labRate > 0 ? labRate.toFixed(2) : '—'}
                  </td>
                  <td className="py-3 px-3 text-right font-semibold">
                    ${itemTotal.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {isEditing ? (
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleSave(item.lineKey)}
                          disabled={isSaving || isLoading}
                        >
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleCancel}
                          disabled={isSaving || isLoading}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(item)}
                          disabled={isLoading}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item.lineKey)}
                          disabled={isDeleting || isLoading}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="border-t bg-muted font-semibold">
            <tr>
              <td colSpan={5} className="py-3 px-3 text-right">
                Category Total (mat + labour):
              </td>
              <td className="py-3 px-3 text-right">
                ${totalCost.toFixed(2)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Card>
  );
};
