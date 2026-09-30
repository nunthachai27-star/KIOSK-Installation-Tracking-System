import { FormBuilder } from '@/components/FormBuilder'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams
  const session = await auth()
  // ผูก "การจำรูปแบบฟอร์ม" ไว้กับผู้ใช้ — ของใครของมัน
  const userId = session?.user?.id ?? 'anon'
  return <FormBuilder initialJobId={job} userId={userId} />
}
