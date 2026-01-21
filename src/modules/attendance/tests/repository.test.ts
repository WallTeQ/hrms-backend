import { describe, it, expect, vi } from "vitest";
import { AttendanceRepository } from "../repository.js";

describe("AttendanceRepository", () => {
  it("marks attendance by creating when no existing record", async () => {
    const mockTx: any = {
      attendance: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: "a1", status: "PRESENT" }),
      },
    };
    const mockPrisma: any = {
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockTx)),
    };

    const repo = AttendanceRepository(mockPrisma);
    const res = await repo.mark("e1", new Date("2025-01-01"), "PRESENT" as any);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
    expect(mockTx.attendance.create).toHaveBeenCalled();
    expect(res.id).toBe("a1");
  });

  it("updates attendance when existing record found", async () => {
    const mockTx: any = {
      attendance: {
        findFirst: vi.fn().mockResolvedValue({ id: "a2" }),
        update: vi.fn().mockResolvedValue({ id: "a2", status: "LATE" }),
      },
    };
    const mockPrisma: any = {
      $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockTx)),
    };

    const repo = AttendanceRepository(mockPrisma);
    const res = await repo.mark("e1", new Date("2025-01-02"), "LATE" as any);
    expect(mockTx.attendance.update).toHaveBeenCalled();
    expect(res.status).toBe("LATE");
  });
});
