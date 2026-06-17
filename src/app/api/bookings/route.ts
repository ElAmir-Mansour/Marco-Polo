import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const body = await request.json();
    const { mentorId, menteeId, scheduledAt } = body;

    if (!mentorId || !menteeId || !scheduledAt) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
    }

    if (sessionData.userId !== menteeId) {
      return NextResponse.json({ error: "Forbidden. You cannot book mentorship sessions for other users." }, { status: 403 });
    }

    // Insert booking into relational PG database
    const newBooking = await db.insert(bookings).values({
      mentorId,
      menteeId,
      status: "pending",
      scheduledAt: new Date(scheduledAt),
      meetingLink: `https://meet.jit.si/silkroad-mentor-${Date.now()}`,
    }).returning();

    return NextResponse.json({
      success: true,
      booking: newBooking[0],
      message: "Mentorship session booked. Ledger updated pending checkout.",
    });
  } catch (error: any) {
    console.error("Booking API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const sessionData = await getSession();
    if (!sessionData) {
      return NextResponse.json({ error: "Unauthorized. Please sign in first." }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing parameter: userId" }, { status: 400 });
    }

    if (sessionData.userId !== userId) {
      return NextResponse.json({ error: "Forbidden. You cannot view bookings for other users." }, { status: 403 });
    }

    const list = await db.query.bookings.findMany({
      where: eq(bookings.menteeId, userId),
      orderBy: (bookings, { desc }) => [desc(bookings.scheduledAt)],
    });

    return NextResponse.json({ success: true, bookings: list });
  } catch (error: any) {
    console.error("Fetch bookings API error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
