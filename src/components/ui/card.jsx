import React from 'react';
export function Card({ children }) {
  return <div className="bg-white shadow rounded p-4">{children}</div>;
}
export function CardContent({ children }) {
  return <div className="p-2">{children}</div>;
}