/**
 * Custodian Agent — Audio Data Lifecycle Manager
 *
 * Privacy principle: audio is transient. Files are uploaded to S3 solely to
 * enable AWS Transcribe to process them, then deleted immediately after
 * transcription completes. Audio data must never persist beyond that window.
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({ region: process.env.KOMMIT_AWS_REGION!, credentials: { accessKeyId: process.env.KOMMIT_AWS_KEY!, secretAccessKey: process.env.KOMMIT_AWS_SECRET! } });

/**
 * Uploads an audio buffer to S3 for transcription.
 *
 * @param buffer - The raw audio data to upload.
 * @param filename - The S3 object key under which the audio will be stored.
 * @returns The S3 key of the uploaded object on success.
 * @throws An error with message "Audio upload failed: <error message>" on failure.
 */
export async function uploadAudio(buffer: Buffer, filename: string): Promise<string> {
  try {
    const command = new PutObjectCommand({
      Bucket: process.env.KOMMIT_S3_BUCKET!,
      Key: filename,
      Body: buffer,
    });
    await s3.send(command);
    return filename;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Audio upload failed: ${message}`);
  }
}

/**
 * Deletes an audio object from S3 after transcription.
 *
 * Deletion failures are silently swallowed — a failed cleanup must never
 * surface as a user-facing error. Errors are logged to console.error only.
 *
 * @param key - The S3 object key to delete.
 */
export async function deleteAudio(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: process.env.KOMMIT_S3_BUCKET!,
      Key: key,
    });
    await s3.send(command);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Custodian: failed to delete audio key "${key}": ${message}`);
  }
}