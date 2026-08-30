import {
  existsSync,
  readFileSync,
} from "node:fs";

const ENV_FILE = ".env.local";
const FIREBASE_CONFIG_FILE =
  ".firebaserc";

const REQUIRED_PUBLIC_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_FIREBASE_APP_CHECK_SITE_KEY",
];

const LEGACY_SERVER_KEYS = [
  "LINE_CHANNEL_ACCESS_TOKEN",
  "LINE_ADMIN_USER_ID",
  "GOOGLE_SCRIPT_URL",
];

function parseEnvFile(contents) {
  const values = new Map();

  for (const rawLine of contents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex =
      line.indexOf("=");

    if (separatorIndex < 1) {
      continue;
    }

    const key = line
      .slice(0, separatorIndex)
      .replace(/^export\s+/u, "")
      .trim();

    let value = line
      .slice(separatorIndex + 1)
      .trim();

    if (
      (value.startsWith('"') &&
        value.endsWith('"')) ||
      (value.startsWith("'") &&
        value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

function isPlaceholder(value) {
  return /^(your_|replace_|changeme|example)/iu.test(
    value,
  );
}

if (!existsSync(ENV_FILE)) {
  console.error(
    `ไม่พบ ${ENV_FILE} กรุณาคัดลอกจาก .env.local.example`,
  );
  process.exitCode = 1;
} else {
  const env = parseEnvFile(
    readFileSync(ENV_FILE, "utf8"),
  );
  const errors = [];
  const warnings = [];

  for (const key of REQUIRED_PUBLIC_KEYS) {
    const value = env.get(key)?.trim();

    if (!value) {
      errors.push(`${key} ไม่มีค่า`);
    } else if (isPlaceholder(value)) {
      errors.push(
        `${key} ยังเป็นค่าตัวอย่าง`,
      );
    }
  }

  if (
    env.get(
      "NEXT_PUBLIC_USE_FIREBASE_EMULATORS",
    ) === "true"
  ) {
    errors.push(
      "NEXT_PUBLIC_USE_FIREBASE_EMULATORS ต้องเป็น false สำหรับ production",
    );
  }

  for (const key of LEGACY_SERVER_KEYS) {
    if (env.has(key)) {
      warnings.push(
        `${key} ไม่ถูกใช้จากฝั่งเว็บ ควรเก็บเป็น Functions Secret หรือเอาออก`,
      );
    }
  }

  if (existsSync(FIREBASE_CONFIG_FILE)) {
    try {
      const firebaseConfig = JSON.parse(
        readFileSync(
          FIREBASE_CONFIG_FILE,
          "utf8",
        ),
      );
      const selectedProject =
        firebaseConfig.projects?.default;
      const configuredProject = env.get(
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      );

      if (
        selectedProject &&
        configuredProject &&
        selectedProject !== configuredProject
      ) {
        errors.push(
          "NEXT_PUBLIC_FIREBASE_PROJECT_ID ไม่ตรงกับ default project ใน .firebaserc",
        );
      }
    } catch {
      errors.push(
        ".firebaserc ไม่ใช่ JSON ที่ถูกต้อง",
      );
    }
  }

  for (const warning of warnings) {
    console.warn(`คำเตือน: ${warning}`);
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`ไม่พร้อม: ${error}`);
    }

    console.error(
      "Production environment ยังไม่พร้อม โดยไม่มีการแสดงค่าความลับ",
    );
    process.exitCode = 1;
  } else {
    console.log(
      "Production environment พร้อม และไม่มีการแสดงค่าความลับ",
    );
  }
}
