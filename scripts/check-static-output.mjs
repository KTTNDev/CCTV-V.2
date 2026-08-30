import {
  existsSync,
  readFileSync,
  statSync,
} from "node:fs";

const REQUIRED_OUTPUT_FILES = [
  "out/index.html",
  "out/404.html",
  "out/rawai-cctv-hero.webp",
];

const EXPECTED_FUNCTION_REWRITES = [
  ["/api/requests/create", "createRequest"],
  ["/api/requests/finalize", "finalizeRequest"],
  ["/api/requests/track", "trackRequest"],
  ["/api/public/stats", "publicStats"],
  [
    "/api/admin/requests/update",
    "updateRequest",
  ],
];

const REQUIRED_SECURITY_HEADERS = [
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Referrer-Policy",
  "Cross-Origin-Opener-Policy",
  "Permissions-Policy",
  "Strict-Transport-Security",
];

const errors = [];

for (const file of REQUIRED_OUTPUT_FILES) {
  if (!existsSync(file)) {
    errors.push(`ไม่พบไฟล์ build: ${file}`);
  }
}

if (existsSync("out/index.html")) {
  const indexHtml = readFileSync(
    "out/index.html",
    "utf8",
  );

  if (
    !indexHtml.includes(
      "CCTV Service Portal",
    )
  ) {
    errors.push(
      "index.html ไม่มีชื่อระบบที่กำหนดไว้",
    );
  }
}

if (existsSync("out/404.html")) {
  const notFoundHtml = readFileSync(
    "out/404.html",
    "utf8",
  );

  if (
    !notFoundHtml.includes(
      "ไม่พบหน้าที่ต้องการ",
    )
  ) {
    errors.push(
      "404.html ไม่มีข้อความหน้า 404 ของระบบ",
    );
  }
}

if (
  existsSync("out/rawai-cctv-hero.webp") &&
  statSync("out/rawai-cctv-hero.webp")
    .size >
    500_000
) {
  errors.push(
    "ภาพ hero มีขนาดเกิน 500 KB",
  );
}

try {
  const firebaseConfig = JSON.parse(
    readFileSync("firebase.json", "utf8"),
  );
  const hosting = firebaseConfig.hosting;
  const rewrites = hosting?.rewrites ?? [];
  const globalHeaders =
    hosting?.headers?.find(
      (entry) => entry.source === "**",
    )?.headers ?? [];

  for (const [source, functionId] of
    EXPECTED_FUNCTION_REWRITES) {
    const rewrite = rewrites.find(
      (entry) => entry.source === source,
    );

    if (
      rewrite?.function?.functionId !==
      functionId
    ) {
      errors.push(
        `Hosting rewrite ${source} ไม่ได้ชี้ไป ${functionId}`,
      );
    }
  }

  if (
    rewrites.some(
      (entry) => entry.source === "**",
    )
  ) {
    errors.push(
      "พบ catch-all rewrite ที่จะกลืนหน้า 404",
    );
  }

  const configuredHeaderNames = new Set(
    globalHeaders.map((header) => header.key),
  );

  for (const header of
    REQUIRED_SECURITY_HEADERS) {
    if (!configuredHeaderNames.has(header)) {
      errors.push(
        `ยังไม่ได้กำหนด security header: ${header}`,
      );
    }
  }
} catch {
  errors.push(
    "ไม่สามารถอ่าน firebase.json ได้",
  );
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`ไม่ผ่าน: ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log(
    "Static output, API rewrites และ security headers ผ่านการตรวจสอบ",
  );
}
