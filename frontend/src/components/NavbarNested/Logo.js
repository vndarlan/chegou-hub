// frontend/src/components/NavbarNested/Logo.js - SHADCN/UI
import React from 'react';

export function Logo(props) {
  return (
    <div className="flex items-center gap-2" {...props}>
      <img
        src="/logo192.png"
        alt="ChegouHub Logo"
        className="w-8 h-8 object-contain"
        onError={(e) => {
          e.target.src = "data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3e%3crect width='32' height='32' rx='6' fill='%23fd7e14'/%3e%3ctext x='16' y='20' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='12'%3eCH%3c/text%3e%3c/svg%3e";
        }}
      />
      <div>
        <h2 className="text-lg font-bold text-foreground leading-tight">
          Chegou Hub
        </h2>
      </div>
    </div>
  );
}