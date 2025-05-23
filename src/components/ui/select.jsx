import React from 'react';
export function Select({ value, onValueChange, children }) {
  return <select value={value} onChange={(e) => onValueChange(e.target.value)} className="border rounded px-2 py-1 w-full">{children}</select>;
}
export function SelectItem({ value, children }) {
  return <option value={value}>{children}</option>;
}