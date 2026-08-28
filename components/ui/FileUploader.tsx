'use client';

import React from 'react';
import { Upload, FileText, Trash2 } from 'lucide-react';

interface FileUploaderProps {
  label: string;
  description: string;
  icon?: any;
  multiple?: boolean;
  files: File[] | File | null;
  onFileChange: (files: any) => void;
}

/**
 * ✅ แก้ไขปัญหาการอัปโหลด:
 * 1. ใช้ <label> ครอบทั้งหมดเพื่อให้คลิกได้ทุกพื้นที่
 * 2. จัดการ State ของไฟล์ทั้งแบบเดี่ยวและแบบกลุ่ม (Multiple)
 */
const FileUploader = ({ 
  label, 
  description, 
  icon: Icon = Upload, 
  multiple = false, 
  files, 
  onFileChange 
}: FileUploaderProps) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      if (multiple) {
        // สำหรับอัปโหลดหลายไฟล์ (เช่น ภาพเหตุการณ์)
        const currentFiles = Array.isArray(files) ? files : [];
        onFileChange([...currentFiles, ...newFiles]);
      } else {
        // สำหรับอัปโหลดไฟล์เดียว (เช่น บัตรประชาชน)
        onFileChange(newFiles[0]);
      }
    }
  };

  const removeFile = (index: number) => {
    if (multiple && Array.isArray(files)) {
      onFileChange(files.filter((_, i) => i !== index));
    } else {
      onFileChange(null);
    }
  };

  const fileList = multiple 
    ? (Array.isArray(files) ? files : []) 
    : (files ? [files] : []);

  return (
    <div className="w-full group">
      <label className="block text-[13px] font-semibold text-slate-600 mb-2 uppercase tracking-wider ml-1">
        {label}
      </label>
      
      <label className="mt-1 flex justify-center px-6 pt-8 pb-8 border-2 border-slate-200 border-dashed rounded-3xl bg-slate-50/50 hover:bg-blue-50/40 hover:border-blue-300 transition-all cursor-pointer relative group-hover:shadow-sm">
        <input 
          type="file" 
          className="sr-only" 
          multiple={multiple} 
          onChange={handleFileChange} 
          accept="image/*,.pdf" 
        />
        <div className="space-y-3 text-center">
          <div className="mx-auto w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
             <Icon className="h-7 w-7 text-slate-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div className="flex flex-col items-center text-sm text-slate-600 justify-center gap-1">
            <span className="font-bold text-blue-700 hover:text-blue-600 text-base">คลิกเพื่ออัปโหลด</span>
            <span className="text-xs text-slate-400 font-medium">{description}</span>
          </div>
        </div>
      </label>
      
      {fileList.length > 0 && (
        <div className="mt-4 space-y-2">
          {fileList.map((file: any, index: number) => (
            <div key={index} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl shadow-sm animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="p-2 bg-blue-50 rounded-xl flex-shrink-0 text-blue-600">
                    <FileText className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-semibold text-slate-700 truncate max-w-[200px]">{file?.name}</span>
                  <span className="text-[10px] text-slate-400">{(file?.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => removeFile(index)} 
                className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors flex-shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUploader;