import { JobStepNav, type StepNo } from './JobStepNav'

// Two-column job-detail layout: vertical step nav on the left, form on the right.
export function JobDetailShell({
  jobId, active, children,
}: {
  jobId: string
  active: StepNo
  children: React.ReactNode
}) {
  return (
    <div className="max-w-[1220px] mx-auto w-full flex flex-col md:flex-row md:items-start md:gap-4 md:px-4">
      <JobStepNav jobId={jobId} active={active} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
