import { prisma } from './prisma'

// Whether a FIELD user may act on a given job. They qualify if they are the
// job's installer owner, or if they have at least one activity assigned to them
// on that job (which is how the job surfaces in their mobile "my tasks" list).
// OFFICE users are unrestricted and should be checked by the caller before this.
export async function fieldCanAccessJob(jobId: string, userId: string | undefined): Promise<boolean> {
  if (!userId) return false
  const job = await prisma.job.findUnique({ where: { id: jobId }, select: { installerOwnerId: true } })
  if (!job) return false
  if (job.installerOwnerId === userId) return true
  const activity = await prisma.jobActivity.findFirst({ where: { jobId, responsibleUserId: userId } })
  return activity != null
}
