/**
 * @file app/api/commitments/checkin/route.ts
 * @description API route for marking a commitment as completed when a user follows through.
 */

import { NextRequest, NextResponse } from "next/server";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

/**
 * POST /api/commitments/checkin
 *
 * Marks a commitment as completed by updating its status in the database.
 *
 * @param {NextRequest} request - The incoming HTTP request containing `{ id: string }` in the JSON body.
 * @returns {NextResponse} 200 with `{ success: true }` on success,
 *                         400 if `id` is missing,
 *                         500 with `{ error: string }` on database or server error.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { id } = body as { id?: string };

    if (!id) {
      return NextResponse.json(
        { error: "Missing required field: id" },
        { status: 400 }
      );
    }

    await sql`UPDATE commitments SET status = 'completed' WHERE id = ${id}`;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}