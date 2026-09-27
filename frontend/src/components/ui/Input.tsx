import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, helperText, className = '', ...props }) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && <label className="text-xs font-semibold text-slate-700 tracking-wide">{label}</label>}
      <input
        className={`w-full px-3.5 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          error
            ? 'border-rose-300 focus:ring-rose-500 focus:border-rose-500'
            : 'border-slate-300 focus:ring-sky-500 focus:border-sky-500'
        } ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rose-500">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
};
