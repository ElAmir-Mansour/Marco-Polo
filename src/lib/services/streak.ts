import { getStreak, saveStreak, Streak } from "@/lib/aws/dynamodb";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/**
 * Checks if a user's streak has decayed, and automatically applies streak shields
 * from PostgreSQL if available to prevent the streak from breaking.
 */
export async function checkAndDecayStreak(userId: string): Promise<Streak> {
  const streak = await getStreak(userId);
  if (!streak.lastCompletedTimestamp) {
    return streak;
  }

  const todayStr = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const lastCompletedStr = streak.lastCompletedTimestamp.split("T")[0];

  // If completed today or yesterday, the streak is currently active
  if (lastCompletedStr === todayStr) {
    return streak;
  }

  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  if (lastCompletedStr === yesterdayStr) {
    return streak;
  }

  // Last completion was 2+ days ago, meaning yesterday was missed.
  // Calculate the number of missed days.
  const lastCompletedDate = new Date(lastCompletedStr);
  const todayDate = new Date(todayStr);
  
  // Calculate difference in days (ignoring hours/minutes by converting dates to UTC midnights)
  const utc1 = Date.UTC(lastCompletedDate.getUTCFullYear(), lastCompletedDate.getUTCMonth(), lastCompletedDate.getUTCDate());
  const utc2 = Date.UTC(todayDate.getUTCFullYear(), todayDate.getUTCMonth(), todayDate.getUTCDate());
  
  const diffDays = Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
  const missedDays = diffDays - 1; // days yesterday and prior that were missed

  if (missedDays > 0) {
    // Check if the user has streak shields in PostgreSQL RDS
    const userRecord = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (userRecord && userRecord.streakShields > 0) {
      const shieldsAvailable = userRecord.streakShields;
      
      if (shieldsAvailable >= missedDays) {
        // We have enough shields to protect the entire gap!
        const remainingShields = shieldsAvailable - missedDays;
        
        // Deduct shields in Relational DB
        await db
          .update(users)
          .set({ streakShields: remainingShields })
          .where(eq(users.id, userId));

        // Shift last completed to yesterday to keep the streak active
        streak.lastCompletedTimestamp = new Date(yesterday.setUTCHours(12, 0, 0, 0)).toISOString();
        await saveStreak(streak);
        
        console.log(`[Streak Service] Streak protected for user ${userId}. Consumed ${missedDays} shields. Remaining: ${remainingShields}.`);
      } else {
        // Not enough shields to protect the streak. All shields are lost and streak resets to 0.
        await db
          .update(users)
          .set({ streakShields: 0 })
          .where(eq(users.id, userId));

        streak.currentStreak = 0;
        await saveStreak(streak);
        
        console.log(`[Streak Service] Streak broken for user ${userId}. Insufficient shields (${shieldsAvailable} available, ${missedDays} needed). All shields consumed.`);
      }
    } else {
      // No shields available, streak decays to 0.
      streak.currentStreak = 0;
      await saveStreak(streak);
      
      console.log(`[Streak Service] Streak broken for user ${userId}. No shields available.`);
    }
  }

  return streak;
}
