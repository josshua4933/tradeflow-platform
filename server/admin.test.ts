import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Admin Router", () => {
  let adminUserId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    // Find or create an admin user
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "josshuajunior@gmail.com"))
      .limit(1);

    if (existingAdmin.length > 0) {
      adminUserId = existingAdmin[0].id;
      // Ensure they're admin
      if (existingAdmin[0].role !== "admin") {
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, adminUserId));
      }
    } else {
      // Create admin user for testing
      const result = await db.insert(users).values({
        openId: `test-admin-${Date.now()}`,
        email: "josshuajunior@gmail.com",
        name: "Test Admin",
        role: "admin",
        loginMethod: "test",
      });
      adminUserId = result[0].insertId as number;
    }
  });

  it("should have admin user in database", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database unavailable");

    const admin = await db
      .select()
      .from(users)
      .where(eq(users.id, adminUserId))
      .limit(1);

    expect(admin.length).toBe(1);
    expect(admin[0].role).toBe("admin");
  });

  it("should verify admin router imports correctly", async () => {
    // This test verifies the admin router can be imported without errors
    const { adminRouter } = await import("./routers/admin");
    expect(adminRouter).toBeDefined();
  });
});
