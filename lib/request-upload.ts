import {
  ref,
  uploadBytesResumable,
} from "firebase/storage";

import type {
  UploadTarget,
} from "./api-client";
import { storage } from "./firebase";

export interface RequestUploadFiles {
  idCard: File;
  policeReport: File;
  scene: File[];
}

export interface RequestUploadProgress {
  completedFiles: number;
  totalFiles: number;
  currentFileName: string;
  currentFilePercent: number;
  overallPercent: number;
}

interface UploadEntry {
  file: File;
  target: UploadTarget;
}

function createUploadEntries(
  files: RequestUploadFiles,
  targets: UploadTarget[],
): UploadEntry[] {
  const idCardTarget = targets.find(
    (target) =>
      target.kind === "id-card",
  );

  const policeReportTarget =
    targets.find(
      (target) =>
        target.kind ===
        "police-report",
    );

  const sceneTargets = targets.filter(
    (target) => target.kind === "scene",
  );

  if (
    !idCardTarget ||
    !policeReportTarget
  ) {
    throw new Error(
      "Server ไม่ได้ส่งตำแหน่งอัปโหลดเอกสารที่จำเป็น",
    );
  }

  if (
    sceneTargets.length !==
    files.scene.length
  ) {
    throw new Error(
      "จำนวนภาพเหตุการณ์ไม่ตรงกับข้อมูลที่แจ้ง",
    );
  }

  return [
    {
      file: files.idCard,
      target: idCardTarget,
    },
    {
      file: files.policeReport,
      target: policeReportTarget,
    },
    ...files.scene.map(
      (file, index) => ({
        file,
        target: sceneTargets[index],
      }),
    ),
  ];
}

function validateUploadEntry(
  entry: UploadEntry,
): void {
  const {
    file,
    target,
  } = entry;

  if (file.size !== target.size) {
    throw new Error(
      `ขนาดไฟล์ ${file.name} เปลี่ยนแปลง ` +
      "กรุณาเลือกไฟล์ใหม่",
    );
  }

  if (
    file.type !== target.contentType
  ) {
    throw new Error(
      `ชนิดไฟล์ ${file.name} ไม่ตรงกับข้อมูลที่แจ้ง`,
    );
  }

  if (file.size > 10 * 1024 * 1024) {
    throw new Error(
      `ไฟล์ ${file.name} ต้องมีขนาดไม่เกิน 10 MB`,
    );
  }
}

function uploadSingleFile(options: {
  entry: UploadEntry;
  completedFiles: number;
  totalFiles: number;
  onProgress?: (
    progress: RequestUploadProgress,
  ) => void;
}): Promise<void> {
  const {
    entry,
    completedFiles,
    totalFiles,
    onProgress,
  } = options;

  validateUploadEntry(entry);

  const storageReference = ref(
    storage,
    entry.target.storagePath,
  );

  const uploadTask =
    uploadBytesResumable(
      storageReference,
      entry.file,
      {
        contentType:
          entry.target.contentType,
        cacheControl:
          "private, no-store, max-age=0",
        customMetadata: {
          uploadId: entry.target.id,
          uploadKind:
            entry.target.kind,
        },
      },
    );

  return new Promise<void>(
    (resolve, reject) => {
      uploadTask.on(
        "state_changed",

        (snapshot) => {
          const currentFileProgress =
            snapshot.totalBytes > 0
              ? snapshot.bytesTransferred /
                snapshot.totalBytes
              : 0;

          onProgress?.({
            completedFiles,
            totalFiles,
            currentFileName:
              entry.file.name,
            currentFilePercent:
              Math.round(
                currentFileProgress *
                  100,
              ),
            overallPercent:
              Math.round(
                ((completedFiles +
                  currentFileProgress) /
                  totalFiles) *
                  100,
              ),
          });
        },

        (error) => {
          reject(error);
        },

        () => {
          resolve();
        },
      );
    },
  );
}

export async function uploadRequestFiles(
  options: {
    files: RequestUploadFiles;
    targets: UploadTarget[];
    onProgress?: (
      progress: RequestUploadProgress,
    ) => void;
  },
): Promise<void> {
  const {
    files,
    targets,
    onProgress,
  } = options;

  const entries = createUploadEntries(
    files,
    targets,
  );

  for (
    let index = 0;
    index < entries.length;
    index += 1
  ) {
    const entry = entries[index];

    await uploadSingleFile({
      entry,
      completedFiles: index,
      totalFiles: entries.length,
      onProgress,
    });
  }

  onProgress?.({
    completedFiles: entries.length,
    totalFiles: entries.length,
    currentFileName: "",
    currentFilePercent: 100,
    overallPercent: 100,
  });
}