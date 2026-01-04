import React from "react";

export default function InsecureModeWarning() {
  return (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-4 rounded">
      <div className="flex items-center gap-2">
        <span className="font-bold">⚠️ Insecure Mode Enabled</span>
        <span className="text-xs">(CHIA_ALLOW_INSECURE=true)</span>
      </div>
      <p className="text-xs mt-1">
        SSL certificate validation is <b>disabled</b> for local development. Never use this setting in production!
      </p>
    </div>
  );
}
