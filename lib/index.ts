import * as core from '@actions/core'
import { context } from '@actions/github'
import { getOctokit } from '@actions/github'
import type { components } from '@octokit/openapi-types'

type ActionsListJobsForWorkflowRunResponseData = components['schemas']['job']

async function getJobs(): Promise<Array<ActionsListJobsForWorkflowRunResponseData>> {
  const octokit = getOctokit(core.getInput('GITHUB_TOKEN', { required: true }))
  return octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {
    ...context.repo,
    run_id: context.runId,
  })
}

function getJobConclusions(jobs: Array<{ conclusion: string | null }>): Set<string> {
  return new Set(
    jobs
      .filter((job): job is { conclusion: string } => null !== job.conclusion)
      .map((job) => job.conclusion),
  )
}

const CONCLUSIONS = [
  'neutral',
  'skipped',
  'success',
  'cancelled',
  'timed_out',
  'action_required',
  'failure',
]

function getWorkflowConclusion(conclusions: Set<string>): string {
  const FALLBACK_CONCLUSION = 'skipped'
  return !conclusions.size
    ? FALLBACK_CONCLUSION
    : CONCLUSIONS.filter((conclusion) => conclusions.has(conclusion)).slice(-1)[0] ??
        FALLBACK_CONCLUSION
}

async function main() {
  const jobs = await getJobs()
  const conclusions = getJobConclusions(jobs)
  const conclusion = getWorkflowConclusion(conclusions)

  core.startGroup('Jobs: ')
  console.log(jobs)
  core.endGroup()

  core.startGroup('Conclusions: ')
  console.log(conclusions)
  core.endGroup()

  core.startGroup('Conclusion: ')
  console.log(conclusion)
  core.endGroup()

  core.setOutput('conclusion', conclusion)
}

main().catch((e) => core.setFailed(e.message))
