'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2, Check, Search, ExternalLink } from 'lucide-react';

export interface LocationData {
  location_address: string;
  city: string;
  district: string;
  state: string;
  latitude: number;
  longitude: number;
  google_maps_url: string;
}

interface LocationAutocompleteProps {
  initialAddress?: string;
  initialCity?: string;
  onLocationSelect: (location: LocationData) => void;
  className?: string;
}

export default function LocationAutocomplete({
  initialAddress = '',
  initialCity = '',
  onLocationSelect,
  className = '',
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(initialAddress || initialCity || '');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [selectedData, setSelectedData] = useState<LocationData | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search fetching for Google Places / OpenStreetMap suggestions
  useEffect(() => {
    if (!query || query.length < 3 || selectedData?.location_address === query) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query
          )}&addressdetails=1&limit=5&countrycodes=in`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
          setDropdownOpen(true);
        }
      } catch (err) {
        console.error('Location search error:', err);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, selectedData]);

  const selectPlace = (item: any) => {
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const addressObj = item.address || {};

    const city =
      addressObj.city ||
      addressObj.town ||
      addressObj.village ||
      addressObj.county ||
      addressObj.state_district ||
      '';
    const district = addressObj.state_district || addressObj.county || city || '';
    const state = addressObj.state || '';
    const formattedAddress = item.display_name || query;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

    const loc: LocationData = {
      location_address: formattedAddress,
      city,
      district,
      state,
      latitude: lat,
      longitude: lon,
      google_maps_url: mapsUrl,
    };

    setSelectedData(loc);
    setQuery(formattedAddress);
    setSuggestions([]);
    setDropdownOpen(false);
    onLocationSelect(loc);
  };

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1`
          );
          if (res.ok) {
            const data = await res.json();
            const addressObj = data.address || {};
            const city =
              addressObj.city ||
              addressObj.town ||
              addressObj.village ||
              addressObj.county ||
              '';
            const district = addressObj.state_district || addressObj.county || city || '';
            const state = addressObj.state || '';
            const formattedAddress = data.display_name || `Lat: ${lat}, Lon: ${lon}`;
            const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;

            const loc: LocationData = {
              location_address: formattedAddress,
              city,
              district,
              state,
              latitude: lat,
              longitude: lon,
              google_maps_url: mapsUrl,
            };

            setSelectedData(loc);
            setQuery(formattedAddress);
            onLocationSelect(loc);
          }
        } catch (err) {
          console.error('Reverse geocode error:', err);
        } finally {
          setLocating(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setLocating(false);
        alert('Could not retrieve exact location. Please type your shop address manually.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  return (
    <div className={`relative space-y-2 ${className}`} ref={dropdownRef}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedData(null);
            }}
            placeholder="Search store address, area or Google place…"
            className="w-full pl-10 pr-10 py-3 bg-white border border-[#E8E3DA] rounded-xl text-xs font-semibold text-[#3E3B36] focus:outline-none focus:border-[#5C4033]"
          />
          {loading && (
            <Loader2 size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-amber-600 animate-spin" />
          )}
        </div>

        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={locating}
          className="px-4 py-3 bg-[#5C4033] hover:bg-[#3E3B36] text-white rounded-xl text-xs font-bold tracking-wider uppercase flex items-center gap-2 shrink-0 transition-colors shadow-sm disabled:opacity-50"
          title="Detect GPS Store Location"
        >
          {locating ? (
            <Loader2 size={14} className="animate-spin text-amber-400" />
          ) : (
            <Navigation size={14} className="text-amber-400" />
          )}
          <span className="hidden sm:inline">GPS Detect</span>
        </button>
      </div>

      {/* Autocomplete Suggestions Dropdown */}
      {dropdownOpen && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-white border border-[#E5DCD3] rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100">
          {suggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => selectPlace(item)}
              className="w-full text-left px-4 py-3 hover:bg-[#FAF6F0] flex items-start gap-3 transition-colors text-xs"
            >
              <MapPin size={14} className="text-[#5C4033] shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[#3E3B36] line-clamp-1">{item.display_name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">
                  {[item.address?.city, item.address?.state].filter(Boolean).join(', ')}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Selected Location Card Badge */}
      {selectedData && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800">
          <div className="flex items-center gap-2 min-w-0">
            <Check size={14} className="text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <span className="font-bold block truncate">
                {selectedData.city ? `${selectedData.city}${selectedData.state ? `, ${selectedData.state}` : ''}` : 'Selected Store Location'}
              </span>
              <span className="text-[10px] text-emerald-700 block truncate font-medium">
                {selectedData.location_address}
              </span>
            </div>
          </div>
          <a
            href={selectedData.google_maps_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-bold tracking-wider uppercase text-emerald-700 hover:underline flex items-center gap-1 shrink-0 ml-2"
          >
            Maps <ExternalLink size={10} />
          </a>
        </div>
      )}
    </div>
  );
}
