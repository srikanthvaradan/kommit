import { NextRequest, NextResponse } from "next/server";
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { S3Client } from "@aws-sdk/client-s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { uploadAudio, deleteAudio } from "@/lib/custodian";

const transcribeClient = new TranscribeClient({
  region: process.env.KOMMIT_TRANSCRIBE_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

const s3 = new S3Client({
  region: process.env.KOMMIT_TRANSCRIBE_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const SUPPORTED_LANGUAGE_OPTIONS = [
  "en-US", "en-GB", "en-IN", "en-AU",
  "ta-IN", "hi-IN", "id-ID", "ms-MY",
  "fr-FR", "zh-CN", "ko-KR", "ja-JP",
  "de-DE", "es-ES", "pt-BR", "ar-SA",
  "it-IT", "nl-NL", "vi-VN", "tr-TR"
];

export async function POST(req: NextRequest): Promise<NextResponse> {
  let key: string | undefined;

  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio");

    if (!audioFile || !(audioFile instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const mimeType = audioFile.type || "audio/webm";
    const mediaFormat = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";

    key = "audio/" + Date.now() + "." + mediaFormat;
    await uploadAudio(buffer, key);

    const jobName = "kommit-" + Date.now();

    await transcribeClient.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: undefined,
        IdentifyLanguage: true,
        LanguageOptions: SUPPORTED_LANGUAGE_OPTIONS as unknown as import("@aws-sdk/client-transcribe").LanguageCode[],
        MediaFormat: mediaFormat,
        Media: {
          MediaFileUri:
            "s3://" + process.env.KOMMIT_S3_BUCKET! + "/" + key,
        },
        OutputBucketName: process.env.KOMMIT_S3_BUCKET!,
      })
    );

    const maxAttempts = 30;
    const pollIntervalMs = 3000;
    let transcriptText = "";
    let languageCode = "";
    let completed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollIntervalMs);

      const jobResponse = await transcribeClient.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );

      const job = jobResponse;
      if (!job.TranscriptionJob) {
        throw new Error("Transcription job not found");
      }

      const status = job.TranscriptionJob.TranscriptionJobStatus;

      if (status === "FAILED") {
        throw new Error(
          "Transcription job failed: " + (job.TranscriptionJob.FailureReason ?? "Unknown reason")
        );
      }

      if (status === "COMPLETED") {
        const outputUri = job.TranscriptionJob?.Transcript?.TranscriptFileUri || "";
        const uriPath = new URL(outputUri).pathname.slice(1);
        const s3Key = uriPath.startsWith(process.env.KOMMIT_S3_BUCKET! + "/")
          ? uriPath.slice((process.env.KOMMIT_S3_BUCKET! + "/").length)
          : uriPath;
        const s3Response = await s3.send(new GetObjectCommand({
          Bucket: process.env.KOMMIT_S3_BUCKET!,
          Key: s3Key
        }));
        const bodyText = await s3Response.Body?.transformToString();
        if (!bodyText) throw new Error("Empty transcript response from S3");
        const transcriptData = JSON.parse(bodyText);
        transcriptText = transcriptData?.results?.transcripts?.[0]?.transcript || "";
        languageCode = job.TranscriptionJob?.LanguageCode || "en-US";
        completed = true;
        break;
      }
    }

    if (!completed) {
      throw new Error("Transcription job timed out after 90 seconds");
    }

    if (key) {
      await deleteAudio(key);
    }

    console.log("TRANSCRIPT RESULT:", { transcriptText, languageCode });
    return NextResponse.json({ transcript: transcriptText, languageCode });
  } catch (error: unknown) {
    if (key) {
      try {
        await deleteAudio(key);
      } catch {
        // best-effort cleanup
      }
    }

    console.error("TRANSCRIBE ERROR:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}