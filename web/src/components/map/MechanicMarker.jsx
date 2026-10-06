'use client';

/**
 * MechanicMarker Component
 * Displays mechanic location marker on map
 */

export default function MechanicMarker({ mechanic, isActive = false }) {
  return (
    <div className={`p-3 rounded-lg ${isActive ? 'bg-blue-100 border-2 border-blue-500' : 'bg-gray-100'}`}>
      <p className="font-semibold text-sm">{mechanic.name}</p>
      <p className="text-xs text-gray-600">{mechanic.distance} km away</p>
      <p className="text-xs text-yellow-600">⭐ {mechanic.rating}</p>
    </div>
  );
}
