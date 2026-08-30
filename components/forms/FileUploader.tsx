'use client';

import type {
  ChangeEvent,
} from 'react';

import {
  FileText,
  Trash2,
  Upload,
} from 'lucide-react';

import type {
  LucideIcon,
} from 'lucide-react';

interface BaseFileUploaderProps {
  inputId: string;
  label: string;
  description: string;
  icon?: LucideIcon;
  error?: string;
  required?: boolean;
}

interface SingleFileUploaderProps {
  multiple?: false;
  files: File | null;

  onFileChange: (
    file: File | null,
  ) => void;
}

interface MultipleFileUploaderProps {
  multiple: true;
  files: File[];

  onFileChange: (
    files: File[],
  ) => void;
}

type FileUploaderProps =
  BaseFileUploaderProps &
  (
    | SingleFileUploaderProps
    | MultipleFileUploaderProps
  );

const FileUploader = (
  props: FileUploaderProps,
) => {
  const {
    label,
    description,
    icon: Icon = Upload,
    inputId,
    error,
    required = false,
  } = props;

  const handleFileChange = (
    event:
      ChangeEvent<HTMLInputElement>,
  ): void => {
    const selectedFiles =
      Array.from(
        event.target.files ?? [],
      );

    if (selectedFiles.length === 0) {
      return;
    }

    if (props.multiple) {
      props.onFileChange([
        ...props.files,
        ...selectedFiles,
      ]);
    } else {
      props.onFileChange(
        selectedFiles[0] ?? null,
      );
    }

    // ทำให้เลือกไฟล์เดิมซ้ำได้
    event.target.value = '';
  };

  const removeFile = (
    index: number,
  ): void => {
    if (props.multiple) {
      props.onFileChange(
        props.files.filter(
          (_, fileIndex) =>
            fileIndex !== index,
        ),
      );

      return;
    }

    props.onFileChange(null);
  };

  const fileList: File[] =
    props.multiple
      ? props.files
      : props.files
        ? [props.files]
        : [];

  return (
    <div className="group w-full">
      <p
        id={`${inputId}-label`}
        className="mb-2 ml-1 block text-[13px] font-semibold uppercase tracking-wider text-slate-600"
      >
        {label}
        {required && (
          <span className="text-red-500">
            {' '}*
          </span>
        )}
      </p>

      <label
        htmlFor={inputId}
        className={`relative mt-1 flex cursor-pointer justify-center rounded-3xl border-2 border-dashed px-6 pb-8 pt-8 transition-all group-hover:shadow-sm ${
          error
            ? 'border-red-300 bg-red-50/40 hover:border-red-400'
            : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/40'
        }`}
      >
        <input
          id={inputId}
          type="file"
          aria-labelledby={`${inputId}-label`}
          aria-describedby={
            error
              ? `${inputId}-description ${inputId}-error`
              : `${inputId}-description`
          }
          aria-invalid={Boolean(error)}
          className="peer sr-only"
          multiple={
            props.multiple === true
          }
          onChange={handleFileChange}
          accept="image/jpeg,image/png,image/webp,application/pdf"
        />

        <div className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-sm transition-transform duration-300 group-hover:scale-110 peer-focus-visible:ring-4 peer-focus-visible:ring-blue-200">
            <Icon
              className="h-7 w-7 text-slate-400 transition-colors group-hover:text-blue-600"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col items-center justify-center gap-1 text-sm text-slate-600">
            <span className="text-base font-bold text-blue-700">
              คลิกเพื่ออัปโหลด
            </span>

            <span
              id={`${inputId}-description`}
              className="text-xs font-medium text-slate-400"
            >
              {description}
            </span>
          </div>
        </div>
      </label>

      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-2 text-xs font-semibold text-red-600"
        >
          {error}
        </p>
      )}

      {fileList.length > 0 && (
        <div className="mt-4 space-y-2">
          {fileList.map(
            (file, index) => (
              <div
                key={[
                  file.name,
                  file.lastModified,
                  index,
                ].join('-')}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 shadow-sm animate-in fade-in slide-in-from-top-2"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600">
                    <FileText
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                  </div>

                  <span className="max-w-[200px] truncate text-sm font-semibold text-slate-700">
                    {file.name}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeFile(index)
                  }
                  aria-label={`ลบไฟล์ ${file.name}`}
                  className="shrink-0 rounded-xl p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-100"
                >
                  <Trash2
                    className="h-4 w-4"
                    aria-hidden="true"
                  />
                </button>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
