import { Elysia, t } from "elysia";
import {
  createBranch,
  deleteBranch,
  listBranches,
  requireBranch,
  serializeBranch,
  updateBranch,
} from "../services/branches";
import { getAllBranchStats, getBranchStats, sumStats, EMPTY_STATS } from "../services/stats";
import { operationalHoursSchema, validateOperationalHours } from "./shared";

export const branchRoutes = new Elysia({ prefix: "/branches" })
  .get("/", async () => ({ success: true, data: await listBranches() }))

  .post(
    "/",
    async ({ body, set }) => {
      if (body.operationalHours) validateOperationalHours(body.operationalHours);
      set.status = 201;
      return { success: true, data: await createBranch(body) };
    },
    {
      body: t.Object({
        id: t.String({ minLength: 2, maxLength: 20 }),
        name: t.Optional(t.String({ maxLength: 100 })),
        operationalHours: t.Optional(operationalHoursSchema),
      }),
    },
  )

  .get("/:branchId", async ({ params }) => {
    const branch = await requireBranch(params.branchId);
    return { success: true, data: { ...serializeBranch(branch), stats: await getBranchStats(branch.id) } };
  })

  .patch(
    "/:branchId",
    async ({ params, body }) => {
      const branch = await requireBranch(params.branchId);
      if (body.operationalHours) validateOperationalHours(body.operationalHours);
      return { success: true, data: await updateBranch(branch, body) };
    },
    {
      body: t.Object({
        name: t.Optional(t.String({ minLength: 1, maxLength: 100 })),
        operationalHours: t.Optional(operationalHoursSchema),
      }),
    },
  )

  .delete("/:branchId", async ({ params }) => {
    const branch = await requireBranch(params.branchId);
    await deleteBranch(branch);
    return { success: true, message: `Cabang ${branch.id} dihapus` };
  })

  .get("/:branchId/stats", async ({ params }) => {
    const branch = await requireBranch(params.branchId);
    return { success: true, data: await getBranchStats(branch.id) };
  });

export const overviewRoutes = new Elysia().get("/overview", async () => {
  const [branches, statsByBranch] = await Promise.all([listBranches(), getAllBranchStats()]);
  const rows = branches.map((branch) => ({ ...branch, stats: statsByBranch.get(branch.id) ?? EMPTY_STATS }));
  return {
    success: true,
    data: { branches: rows, totals: sumStats(rows.map((row) => row.stats)) },
  };
});
