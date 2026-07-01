import { prisma } from '@/lib/prisma'
import { JobForm } from '@/components/JobForm'

export default async function NewJobPage() {
  const [hospitals, users] = await Promise.all([
    prisma.hospital.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
  ])

  return <JobForm hospitals={hospitals} users={users} />
}
