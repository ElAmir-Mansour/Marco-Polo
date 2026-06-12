import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { mentorId, menteeId, scheduledAt } = body;

    if (!mentorId || !menteeId || !scheduledAt) {
      return NextResponse.json({ error: "Missing required booking details" }, { status: 400 });
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
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Missing parameter: userId" }, { status: 400 });
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
