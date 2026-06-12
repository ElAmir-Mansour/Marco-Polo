export async function sendOtpEmail(email: string, otp: string) {
  const subject = "Your Silk Road Verification Code - " + otp;
  
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background-color: #070F19;
            color: #F4F6F8;
            font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
            margin: 0;
            padding: 40px 20px;
            text-align: center;
          }
          .container {
            background-color: #0D1B2A;
            border: 1px solid rgba(212, 175, 55, 0.2);
            border-radius: 16px;
            max-width: 500px;
            margin: 0 auto;
            padding: 40px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          }
          .logo {
            font-family: 'Cinzel', serif;
            font-size: 24px;
            font-weight: bold;
            color: #D4AF37;
            text-transform: uppercase;
            letter-spacing: 3px;
            margin-bottom: 24px;
          }
          h1 {
            font-size: 20px;
            color: #F4F6F8;
            margin-bottom: 12px;
          }
          p {
            color: #8D99AE;
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 30px;
          }
          .otp-box {
            background-color: #070F19;
            border: 2px solid #D4AF37;
            border-radius: 12px;
            color: #D4AF37;
            font-size: 32px;
            font-weight: bold;
            letter-spacing: 6px;
            padding: 16px 24px;
            display: inline-block;
            margin-bottom: 30px;
            text-shadow: 0 0 10px rgba(212, 175, 55, 0.3);
          }
          .footer {
            color: #8D99AE;
            font-size: 11px;
            margin-top: 40px;
            border-top: 1px solid rgba(141, 153, 174, 0.1);
            padding-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="logo">Silk Road</div>
          <h1>Verify Your Expedition</h1>
          <p>Welcome, Traveler. To secure your AI-generated roadmap, track your survival streaks, and trade in the Great Bazaar, verify your email address using the one-time code below:</p>
          <div class="otp-box">${otp}</div>
          <p style="font-size: 12px; color: #EF476F;">This verification code is valid for 5 minutes and can only be used once.</p>
          <div class="footer">
            Silk Road © 2026. Built for Devpost AWS Hackathon.
          </div>
        </div>
      </body>
    </html>
  `;

  // Check if we are running in mock mode or dev mode without a key
  const resendKey = process.env.RESEND_API_KEY;
  const isMock = process.env.MOCK_EMAIL === "true" || !resendKey;

  if (isMock) {
    console.log(`
┌────────────────────────────────────────────────────────┐
│               SILK ROAD LOCAL EMAIL LOG                │
├────────────────────────────────────────────────────────┤
│ To:      ${email.padEnd(46)}│
│ Subject: ${subject.padEnd(46)}│
│ OTP:     ${otp.padEnd(46, " ")}│
├────────────────────────────────────────────────────────┤
│ Developer Bypass Notice:                               │
│ Enter the code above directly in the UI to log in.     │
└────────────────────────────────────────────────────────┘
    `);
    
    // Also save the OTP in a global mock store or a JSON file so the UI can display it
    // if requested (to make hackathon evaluations seamless)
    try {
      if (typeof window === "undefined") {
        const fs = require("fs");
        const path = require("path");
        const bypassPath = path.join(process.cwd(), "in-memory-db.json");
        if (fs.existsSync(bypassPath)) {
          const dbData = JSON.parse(fs.readFileSync(bypassPath, "utf8"));
          if (!dbData.mockOtps) dbData.mockOtps = {};
          dbData.mockOtps[email] = otp;
          fs.writeFileSync(bypassPath, JSON.stringify(dbData, null, 2), "utf8");
        }
      }
    } catch (e) {
      console.warn("Failed to write to in-memory-db mockOtps:", e);
    }
    
    return { success: true, mock: true };
  }

  // Send real email via Resend API
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Silk Road <onboarding@resend.dev>", // Or verified domain
        to: [email],
        subject: subject,
        html: html,
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.message || "Failed to send email via Resend");
    }

    return { success: true, mock: false };
  } catch (error: any) {
    console.error("Resend API error:", error);
    return { success: false, error: error.message };
  }
}
