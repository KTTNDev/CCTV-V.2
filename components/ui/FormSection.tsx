import React from 'react';

const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="pt-8 mt-8 border-t border-gray-200 first:mt-0 first:pt-0 first:border-0">
    <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
      {title}
    </h3>
    <div className="space-y-6">{children}</div>
  </div>
);

export default FormSection;