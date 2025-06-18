import React, { useState } from 'react';

// Tooltip.tsx
// Simple tooltip component for displaying contextual information on hover/focus.

interface TooltipProps {
  content: string;
  children: React.ReactNode;
}

const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <span
      style={{ position: 'relative', display: 'inline-block', minWidth: 0, lineHeight: 1 }}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
      tabIndex={0}
    >
      {children}
      <span
        style={{
          visibility: visible ? 'visible' : 'hidden',
          opacity: visible ? 1 : 0,
          position: 'absolute',
          left: '50%',
          bottom: '120%',
          transform: 'translateX(-50%)',
          background: '#222',
          color: '#fff',
          padding: '4px 10px',
          borderRadius: 4,
          fontSize: 13,
          whiteSpace: 'nowrap',
          zIndex: 1000,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          pointerEvents: 'none',
          minWidth: 0,
        }}
        role="tooltip"
      >
        {content}
      </span>
    </span>
  );
};

export default Tooltip; 