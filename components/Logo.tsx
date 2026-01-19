"use client";

import { useState } from "react";

export default function Logo({ className = "" }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-100 text-xs text-gray-700 rounded ${className}`}
        role="img"
        aria-label="College logo placeholder"
      >
        <span className="font-semibold">WCE</span>
      </div>
    );
  }

  return (
    <img
      src="/logo.png"
      alt="College Logo"
      className={`${className} object-contain`}
      onError={() => setFailed(true)}
    />
  );
}
