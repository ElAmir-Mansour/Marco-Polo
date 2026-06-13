import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { mentors, users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const list = await db
      .select({
        id: mentors.id,
        specialty: mentors.specialization,
        hourlyRate: mentors.hourlyRate,
        rating: mentors.rating,
        bio: mentors.bio,
        email: users.email,
      })
      .from(mentors)
      .leftJoin(users, eq(mentors.userId, users.id));

    // Map database models to match the Mentor UI format
    const formattedMentors = list.map((item) => {
      let name = "Verified Expert";
      let avatar = "E";
      const email = item.email?.toLowerCase() || "";

      if (email.includes("battuta")) {
        name = "Mentor Ibn Battuta";
        avatar = "I";
      } else if (email.includes("polo")) {
        name = "Companion Marco Polo";
        avatar = "M";
      } else if (email.includes("idrisi")) {
        name = "Sherif Al-Idrisi";
        avatar = "S";
      } else if (email.includes("zhenghe")) {
        name = "Admiral Zheng He";
        avatar = "Z";
      }

      return {
        id: item.id,
        name,
        specialty: item.specialty,
        hourlyRate: item.hourlyRate,
        rating: parseFloat(item.rating || "5.0"),
        bio: item.bio || "",
        avatar,
      };
    });

    return NextResponse.json({ success: true, mentors: formattedMentors });
  } catch (error: any) {
    console.error("Fetch mentors API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}
