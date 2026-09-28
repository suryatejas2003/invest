'use server';

import { revalidatePath } from 'next/cache';
import type { ReportStatus, UserStatus, VerificationStatus, VerificationType } from '@prisma/client';
import { requireAdmin } from '@/lib/auth/session';
import { assertSameOrigin } from '@/lib/auth/csrf';
import { toPublicError } from '@/lib/errors';
import { adminSetUserStatus, adminSetVerification, adminResolveReport } from '@/server/admin';

export interface ActionState { error?: string; success?: string }

export async function setUserStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const admin = await requireAdmin();
    await adminSetUserStatus(
      admin.id,
      String(formData.get('userId')),
      String(formData.get('status')) as UserStatus,
      String(formData.get('reason') ?? '') || undefined,
    );
    revalidatePath('/admin/users');
    return { success: 'Account updated.' };
  } catch (err) { return { error: toPublicError(err).message }; }
}

export async function setVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const admin = await requireAdmin();
    await adminSetVerification(
      admin.id,
      String(formData.get('userId')),
      String(formData.get('type')) as VerificationType,
      String(formData.get('status')) as VerificationStatus,
      String(formData.get('note') ?? '') || undefined,
    );
    revalidatePath('/admin/verification');
    return { success: 'Verification updated.' };
  } catch (err) { return { error: toPublicError(err).message }; }
}

export async function resolveReportAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  try {
    await assertSameOrigin();
    const admin = await requireAdmin();
    await adminResolveReport(
      admin.id,
      String(formData.get('reportId')),
      String(formData.get('status')) as ReportStatus,
      String(formData.get('note') ?? '') || undefined,
    );
    revalidatePath('/admin/reports');
    return { success: 'Report updated.' };
  } catch (err) { return { error: toPublicError(err).message }; }
}
