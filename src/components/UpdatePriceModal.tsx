import { useState } from "react";
import { Save, Archive, ArchiveRestore } from "lucide-react";
import { Modal } from "./ui/Modal";
import { PositionMeta, PositionSummary } from "../types";

interface EditPositionModalProps {
  position: PositionSummary;
  onSave: (meta: PositionMeta) => void;
  onClose: () => void;
}

export function UpdatePriceModal({ position, onSave, onClose }: EditPositionModalProps) {
  const [displayName, setDisplayName] = useState(position.meta.displayName ?? "");
  const [strategy, setStrategy] = useState(position.meta.strategy ?? "");
  const [notes, setNotes] = useState(position.meta.notes ?? "");
  const [isArchived, setIsArchived] = useState(position.meta.isArchived ?? false);

  const handleSave = () => {
    onSave({
      ticker: position.ticker,
      displayName: displayName.trim() || undefined,
      strategy: strategy.trim() || undefined,
      notes: notes.trim() || undefined,
      isArchived: isArchived || undefined,
    });
    onClose();
  };

  return (
    <Modal title={`Edit ${position.ticker}`} onClose={onClose}>
      <div className="space-y-4">
        {/* Display name */}
        <div>
          <label htmlFor="pos-name" className="section-label block mb-2">Display Name</label>
          <input
            id="pos-name"
            type="text"
            placeholder={`${position.ticker} full name (optional)`}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="apex-input"
          />
        </div>

        {/* Strategy */}
        <div>
          <label htmlFor="pos-strategy" className="section-label block mb-2">Strategy</label>
          <input
            id="pos-strategy"
            type="text"
            placeholder="e.g. Core Holdings, Growth, DCA..."
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
            className="apex-input"
          />
        </div>

        {/* Notes */}
        <div>
          <label htmlFor="pos-notes" className="section-label block mb-2">Notes</label>
          <textarea
            id="pos-notes"
            placeholder="Investment thesis or notes..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="apex-input resize-none"
          />
        </div>

        {/* Archive toggle */}
        <button
          type="button"
          onClick={() => setIsArchived((v) => !v)}
          role="switch"
          aria-checked={isArchived}
          className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer ${
            isArchived
              ? "bg-warn/5 border-warn/30 text-warn"
              : "bg-transparent border-[#1A2435] text-ink-muted hover:border-[#243044] hover:text-ink-secondary"
          }`}
        >
          <span className="flex items-center gap-2">
            {isArchived ? <ArchiveRestore size={13} /> : <Archive size={13} />}
            <span className="font-medium">
              {isArchived ? "Archived - hidden from portfolio" : "Archive position"}
            </span>
          </span>
          <span className={`w-8 h-4 rounded-full relative transition-colors ${isArchived ? "bg-warn/40" : "bg-[#243044]"}`}>
            <span className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-ink-primary transition-transform ${isArchived ? "translate-x-4" : ""}`} />
          </span>
        </button>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} className="btn-primary flex-1">
            <Save size={14} />
            Save
          </button>
        </div>
      </div>
    </Modal>
  );
}
