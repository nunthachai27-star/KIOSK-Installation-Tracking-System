import { prisma } from '@/lib/prisma'
import { JobForm } from '@/components/JobForm'
import { getJobFormOptions } from '@/lib/master'

export default async function NewJobPage() {
  const [hospitals, users, options] = await Promise.all([
    prisma.hospital.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
    getJobFormOptions(),
  ])

  return <JobForm hospitals={hospitals} users={users} productTypes={options.productTypes} provinces={options.provinces} />
}
