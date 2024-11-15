import { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

export function Tooltip({ children, content, position = 'top' }) {
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const [show, setShow] = useState(false);
  const targetRef = useRef(null);
  const tooltipRef = useRef(null);

  const calculatePosition = () => {
    if (!targetRef.current || !tooltipRef.current) return;

    const targetRect = targetRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const spacing = 8; // Space between target and tooltip

    let top = 0;
    let left = 0;

    switch (position) {
      case 'top':
        top = targetRect.top - tooltipRect.height - spacing;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'bottom':
        top = targetRect.bottom + spacing;
        left = targetRect.left + (targetRect.width - tooltipRect.width) / 2;
        break;
      case 'left':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.left - tooltipRect.width - spacing;
        break;
      case 'right':
        top = targetRect.top + (targetRect.height - tooltipRect.height) / 2;
        left = targetRect.right + spacing;
        break;
    }

    // Ensure tooltip stays within viewport
    const viewport = {
      top: spacing,
      left: spacing,
      right: window.innerWidth - spacing,
      bottom: window.innerHeight - spacing
    };

    // Adjust horizontal position
    if (left < viewport.left) left = viewport.left;
    if (left + tooltipRect.width > viewport.right) {
      left = viewport.right - tooltipRect.width;
    }

    // Adjust vertical position
    if (top < viewport.top) {
      top = position === 'top' ? targetRect.bottom + spacing : viewport.top;
    }
    if (top + tooltipRect.height > viewport.bottom) {
      top = position === 'bottom'
        ? targetRect.top - tooltipRect.height - spacing
        : viewport.bottom - tooltipRect.height;
    }

    setTooltipPosition({ top, left });
  };

  useEffect(() => {
    if (show) calculatePosition();
  }, [show]);

  return (
    <div
      className="tooltip-container"
      ref={targetRef}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          className="tooltip"
          ref={tooltipRef}
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
            position: 'fixed'
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}
