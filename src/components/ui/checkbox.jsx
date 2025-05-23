import React from 'react';
export function Checkbox({ checked, onCheckedChange, label }) {
  return (
    <label className="flex items-center space-x-2">
      <input type="checkbox" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}