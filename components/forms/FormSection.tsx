'use client';
import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

const FormSection = ({ title, children }: FormSectionProps) => (
  <div className="pt-10 mt-2 border-t border-slate-100 first:mt-0 first:pt-0 first:border-0">
    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-3 tracking-tight">
      {title}
    </h3>
    <div className="space-y-6">{children}</div>
  </div>
);

export default FormSection;