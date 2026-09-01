import { FormBuilder } from '@/components/FormBuilder'

export const dynamic = 'force-dynamic'

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams
  return <FormBuilder initialJobId={job} />
}
