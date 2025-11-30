import React from 'react';

interface PanelProps {
  step: number;
  title: string;
  children: React.ReactNode;
  className?: string;
}

const Panel: React.FC<PanelProps> = ({ step, title, children, className = '' }) => {
  return (
    <div className={`bg-[#161b22] border border-gray-700 rounded-lg p-6 shadow-lg ${className}`}>
      <h2 className="text-xl font-semibold text-blue-400 mb-4">
        {step}. {title}
      </h2>
      {children}
    </div>
  );
};

export default Panel;
