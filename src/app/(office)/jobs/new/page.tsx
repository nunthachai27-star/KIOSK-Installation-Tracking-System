import { prisma } from '@/lib/prisma'
import { JobForm } from '@/components/JobForm'
import { getProductTypes } from '@/lib/dashboard'

export default async function NewJobPage() {
  const [hospitals, users, productTypes] = await Promise.all([
    prisma.hospital.findMany({ orderBy: { name: 'asc' } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true, role: true }, orderBy: { name: 'asc' } }),
    getProductTypes(),
  ])

  return <JobForm hospitals={hospitals} users={users} productTypes={productTypes} />
}
