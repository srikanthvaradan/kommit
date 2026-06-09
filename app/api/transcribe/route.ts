import { NextRequest, NextResponse } from "next/server";
import {
  TranscribeClient,
  StartTranscriptionJobCommand,
  GetTranscriptionJobCommand,
} from "@aws-sdk/client-transcribe";
import { uploadAudio, deleteAudio } from "@/lib/custodian";

const transcribeClient = new TranscribeClient({
  region: process.env.KOMMIT_TRANSCRIBE_REGION!,
  credentials: {
    accessKeyId: process.env.KOMMIT_AWS_KEY!,
    secretAccessKey: process.env.KOMMIT_AWS_SECRET!,
  },
});

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    key = "audio/" + Date.now() + ".webm";
    await uploadAudio(buffer, key);

    const jobName = "kommit-" + Date.now();

    await transcribeClient.send(
      new StartTranscriptionJobCommand({
        TranscriptionJobName: jobName,
        LanguageCode: undefined,
        IdentifyLanguage: true,
        MediaFormat: "webm",
        Media: {
          MediaFileUri:
            "s3://" + process.env.KOMMIT_S3_BUCKET! + "/" + key,
        },
        OutputBucketName: process.env.KOMMIT_S3_BUCKET!,
      })
    );

    const maxAttempts = 15;
    const pollIntervalMs = 2000;
    let transcriptText = "";
    let languageCode = "";
    let completed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await sleep(pollIntervalMs);

      const jobResponse = await transcribeClient.send(
        new GetTranscriptionJobCommand({ TranscriptionJobName: jobName })
      );

      const job = jobResponse.TranscriptionJob;
      if (!job) {
        throw new Error("Transcription job not found");
      }

      const status = job.TranscriptionJobStatus;

      if (status === "FAILED") {
        throw new Error(
          "Transcription job failed: " + (job.FailureReason ?? "Unknown reason")
        );
      }

      if (status === "COMPLETED") {
        const outputUri = job.Transcript?.TranscriptFileUri;
        if (!outputUri) {
          throw new Error("Transcript output URI is missing");
        }

        const transcriptResponse = await fetch(outputUri);
        if (!transcriptResponse.ok) {
          throw new Error(
            "Failed to fetch transcript JSON: " + transcriptResponse.statusText
          );
        }

        const transcriptJson = await transcriptResponse.json();
        transcriptText =
          transcriptJson?.results?.transcripts?.[0]?.transcript ?? "";
        languageCode = job.LanguageCode ?? "";
        completed = true;
        break;
      }
    }

    if (!completed) {
      throw new Error("Transcription job timed out after 30 seconds");
    }

    if (key) {
      await deleteAudio(key);
    }

    return NextResponse.json({ transcript: transcriptText, languageCode });
  } catch (err: unknown) {
    if (key) {
      try {
        await deleteAudio(key);
      } catch {
        // best-effort cleanup
      }
    }

    const message =
      err instanceof Error ? err.message : "An unknown error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}