import { neon } from "@neondatabase/serverless";

export async function POST(request: Request) {
  try {
    const sql = neon(`${process.env.DATABASE_URL}`);
    const { name, clerkId, phoneNumber } = await request.json();

    // Check for missing required fields
    if (!name || !clerkId || !phoneNumber) {
      return Response.json(
          { error: "Missing required fields" },
          { status: 400 }
      );
    }

    // Insert user with phone number into the database
    const response = await sql`
      INSERT INTO users (name, clerk_id, phonenumber)
      VALUES (${name}, ${clerkId}, ${phoneNumber});`;

    return new Response(JSON.stringify({ data: response }), {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return Response.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
