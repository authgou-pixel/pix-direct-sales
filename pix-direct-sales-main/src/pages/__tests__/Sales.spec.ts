import { describe, it, expect, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { setSaleStatus } from "../../pages/Sales";

describe("setSaleStatus", () => {
  it("atualiza para APPROVED com filtro de seller_id", async () => {
    const calls: Array<{ table: string; update: any; where: Record<string, any> }> = [];
    const mock = {
      from: (table: string) => ({
        update: (obj: any) => ({
          eq: (col: string, val: any) => ({
            eq: (col2: string, val2: any) => {
              calls.push({ table, update: obj, where: { [col]: val, [col2]: val2 } });
              return Promise.resolve({ error: null });
            },
          }),
        }),
      }),
    } as any;

    const status = await setSaleStatus(mock, "sale-1", "approved", "user-1");
    expect(status).toBe("approved");
    expect(calls[0].update).toEqual({ payment_status: "approved" });
    expect(calls[0].where).toEqual({ id: "sale-1", seller_id: "user-1" });
  });

  it("propaga erro do banco", async () => {
    const mock = {
      from: () => ({
        update: () => ({
          eq: () => ({ eq: () => Promise.resolve({ error: { message: "RLS violation" } }) }),
        }),
      }),
    } as any;
    await expect(setSaleStatus(mock, "sale-2", "pending", "user-1")).rejects.toMatchObject({ message: "RLS violation" });
  });
});
