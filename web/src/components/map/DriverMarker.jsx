'use client';

/**
 * DriverMarker Component
 * Displays driver location marker on map
 */

export default function DriverMarker({ driver }) {
  return (
    <div className="p-3 rounded-lg bg-red-100 border-2 border-red-500">
      <p className="font-semibold text-sm">{driver.name}</p>
      <p className="text-xs text-gray-600">Driver: {driver.name}</p>
      <p className="text-xs text-gray-700">Vehicle: {driver.vehicle}</p>
    </div>
  );
}
