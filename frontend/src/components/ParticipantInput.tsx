import React from "react";

type Props = {
  participants: string[];
  onChange: (next: string[]) => void;
};

export default function ParticipantInput({ participants, onChange }: Props) {
  const addParticipant = () => {
    onChange([...participants, ""]);
  };

  const removeParticipant = (index: number) => {
    const next = participants.slice();
    next.splice(index, 1);
    onChange(next);
  };

  const updateParticipant = (index: number, value: string) => {
    const next = participants.slice();
    next[index] = value.trim();
    onChange(next);
  };

  const isValidPubKey = (value: string) => {
    // Chia BLS compressed public key: 48 bytes = 96 hex chars
    const hex = /^[0-9a-fA-F]+$/;
    return value.length === 96 && hex.test(value);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700">
          Participants (public keys)
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="btn"
            onClick={addParticipant}
            title="Add a participant"
          >
            + Add
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => participants.length > 0 && removeParticipant(participants.length - 1)}
            title="Remove the last participant"
            disabled={participants.length === 0}
          >
            − Remove
          </button>
        </div>
      </div>

      {participants.length === 0 && (
        <p className="text-xs text-gray-500">
          No participants yet. Click “+ Add” to add at least one.
        </p>
      )}

      <div className="space-y-2">
        {participants.map((p, i) => {
          const valid = isValidPubKey(p);
          return (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                className={`input-field flex-1 ${p && !valid ? "border-red-400 focus:border-red-500" : ""}`}
                placeholder={`Participant ${i + 1} public key (96-hex)`}
                value={p}
                onChange={(e) => updateParticipant(i, e.target.value)}
                onKeyDown={(e) => {
                  // Cmd+Enter adds a new participant
                  if (e.key === "Enter" && (e as React.KeyboardEvent<HTMLInputElement>).metaKey) {
                    e.preventDefault();
                    addParticipant();
                  }
                  // Delete on empty input removes this row
                  if (e.key === "Delete" && p.trim() === "") {
                    e.preventDefault();
                    removeParticipant(i);
                  }
                }}
                title="Paste a Chia BLS public key (96 hex characters). Cmd+Enter to add a row; Delete on empty removes this row."
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={() => removeParticipant(i)}
                title="Remove this participant"
              >
                Remove
              </button>
            </div>
          );
        })}
      </div>

      {participants.some((v) => v && !isValidPubKey(v)) && (
        <p className="text-xs text-red-600">
          One or more public keys look invalid. Expected 96 hex characters (compressed BLS pubkey).
        </p>
      )}

      <p className="text-xs text-gray-500 mt-2">
        Tip: Add multiple participants to enable m‑of‑n multi‑signature.
      </p>
    </div>
  );
}
