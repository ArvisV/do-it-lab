
import { randomUUID } from "node:crypto";
import * as path from "node:path";
import {
  mkdir,
  writeFile,
  unlink,
} from "node:fs/promises";

type ImageFolder = "cover" | "steps" | "gallery";

type ImageType = {
  extension: "jpg" | "png" | "webp";
};

// Attēlu glabāšanas pamatmape.
// Attēli netiks publiski pieejami bez atļaujas pārbaudes.
const UPLOAD_ROOT = path.resolve(process.cwd(), "uploads");

// Pārbaudām, vai faila saturs patiešām ir atļauts attēla formāts.
function detectImageType(buffer: Buffer): ImageType | null {
  // JPEG
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { extension: "jpg" };
  }

  // PNG
  const pngSignature = Buffer.from([
    0x89, 0x50, 0x4e, 0x47,
    0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(pngSignature)
  ) {
    return { extension: "png" };
  }

  // WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { extension: "webp" };
  }

  return null;
}

// Pārbaudām projekta ID, lai nepieļautu nedrošus failu ceļus.
function isValidProjectId(projectId: string): boolean {
  const uuidPattern =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  return uuidPattern.test(projectId);
}

// Saglabā projekta attēlu un atgriež relatīvo faila ceļu.
export async function saveProjectImage(
  buffer: Buffer,
  projectId: string,
  folder: ImageFolder,
): Promise<string> {
  if (!isValidProjectId(projectId)) {
    throw new Error("Nederīgs projekta ID.");
  }

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new Error("Attēla fails ir tukšs.");
  }

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error("Attēla izmērs nedrīkst pārsniegt 5 MB.");
  }

  const imageType = detectImageType(buffer);

  if (!imageType) {
    throw new Error(
      "Attēla saturs nav derīgs. Atļauti JPG, PNG un WEBP attēli.",
    );
  }

  const fileName = `${randomUUID()}.${imageType.extension}`;

  const relativePath = path.posix.join(
    "projects",
    projectId,
    folder,
    fileName,
  );

  const absolutePath = path.resolve(
    UPLOAD_ROOT,
    ...relativePath.split("/"),
  );

  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Nederīgs attēla saglabāšanas ceļš.");
  }

  await mkdir(path.dirname(absolutePath), {
    recursive: true,
  });

  await writeFile(absolutePath, buffer, {
    flag: "wx",
  });

  return relativePath;
}

// Dzēš iepriekš saglabātu projekta attēlu.
export async function deleteStoredImage(
  relativePath: string | null | undefined,
): Promise<void> {
  if (!relativePath) {
    return;
  }

  const normalizedPath = relativePath.replace(/\\/g, "/");
  const segments = normalizedPath.split("/");

  if (
    segments[0] !== "projects" ||
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === "..",
    )
  ) {
    throw new Error("Nederīgs attēla dzēšanas ceļš.");
  }

  const absolutePath = path.resolve(
    UPLOAD_ROOT,
    ...segments,
  );

  if (!absolutePath.startsWith(UPLOAD_ROOT + path.sep)) {
    throw new Error("Nederīgs attēla dzēšanas ceļš.");
  }

  try {
    await unlink(absolutePath);
  } catch (error) {
    const fileError = error as NodeJS.ErrnoException;

    if (fileError.code !== "ENOENT") {
      throw error;
    }
  }
}
