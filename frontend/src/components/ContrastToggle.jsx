import React, { useState } from 'react';

const ContrastToggle = () => {
  const [highContrast, setHighContrast] = useState(false);

  const toggleContrast = () => {
    setHighContrast(!highContrast);
    document.body.classList.toggle('high-contrast', !highContrast);
  };

  return (
    <button 
      onClick={toggleContrast} 
      className="contrast-toggle"
      aria-pressed={highContrast}
      title="Toggle high contrast mode"
    >
      {highContrast ? '🔆 Normal Contrast' : '🌙 High Contrast'}
    </button>
  );
};

export default ContrastToggle;
