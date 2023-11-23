import { z } from 'zod';
import { parse, stringify } from 'superjson';
import { router, orgProcedure } from '../../../trpc';
import { eq, and } from '@uninbox/database/orm';
import { orgs } from '@uninbox/database/schema';
import { nanoId, nanoIdLength } from '@uninbox/utils';
import { isUserAdminOfOrg } from '~/server/utils/user';
import { TRPCError } from '@trpc/server';

export const orgProfileRouter = router({
  getOrgProfile: orgProcedure
    .input(
      z.object({
        orgPublicId: z.string().min(3).max(nanoIdLength).optional()
      })
    )
    .query(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;
      const { orgPublicId } = input;

      const orgProfileQuery = await db.read.query.orgs.findFirst({
        columns: {
          publicId: true,
          name: true,
          avatarId: true
        },
        where: orgPublicId
          ? eq(orgs.publicId, orgPublicId)
          : eq(orgs.id, +orgId)
      });

      return {
        orgProfile: orgProfileQuery
      };
    }),

  setOrgProfile: orgProcedure
    .input(
      z.object({
        orgName: z.string().min(3).max(32),
        orgAvatarId: z.string().optional()
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db, user, org } = ctx;
      const userId = user?.id || 0;
      const orgId = org?.id || 0;
      const { orgName, orgAvatarId } = input;

      const isAdmin = await isUserAdminOfOrg(org, userId);
      if (!isAdmin) {
        throw new TRPCError({
          code: 'UNAUTHORIZED',
          message: 'You are not an admin'
        });
      }

      await db.write
        .update(orgs)
        .set({
          name: orgName,
          ...(orgAvatarId && { avatarId: orgAvatarId })
        })
        .where(eq(orgs.id, orgId));

      return {
        success: true
      };
    })
});
