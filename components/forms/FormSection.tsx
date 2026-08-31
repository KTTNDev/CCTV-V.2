'use client';
import React from 'react';

interface FormSectionProps {
  title: string;
  children: React.ReactNode;
}

const FormSection = ({ title, children }: FormSectionProps) => (
  <div className="mt-2 border-t border-slate-100 pt-7 first:mt-0 first:border-0 first:pt-0 sm:pt-10">
    <h3 className="mb-4 flex items-center gap-3 text-base font-bold tracking-tight text-slate-800 sm:mb-6 sm:text-lg">
      {title}
    </h3>
    <div className="space-y-5 sm:space-y-6">{children}</div>
  </div>
);

export default FormSection;
