import { NextRequest, NextResponse } from 'next/server';
import { execFile } from 'child_process';
import { getTenderDetailData } from '@/lib/tender-detail';

export const dynamic = 'force-dynamic';

function runCmd(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string; error?: string }> {
  return new Promise((resolve) => {
    execFile(cmd, args, { timeout: 10000 }, (error, stdout, stderr) => {
      resolve({
        stdout: stdout ? stdout.toString() : '',
        stderr: stderr ? stderr.toString() : '',
        error: error ? error.message : undefined
      });
    });
  });
}

export async function GET(request: NextRequest) {
  const curlCmd = process.platform === 'win32' ? 'curl.exe' : 'curl';
  const versionCheck = await runCmd(curlCmd, ['--version']);

  const curlFetch = await runCmd(curlCmd, [
    '-s', '-L',
    '--connect-timeout', '8',
    '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,application/json,*/*;q=0.8',
    '-H', 'Accept-Language: mn,en-US;q=0.7,en;q=0.3',
    'https://www.tender.gov.mn/mn/invitation/detail/1789954038947'
  ]);

  const detailData = await getTenderDetailData('1789954038947');

  return NextResponse.json({
    platform: process.platform,
    curlCmd,
    versionCheck,
    curlFetchLength: curlFetch.stdout.length,
    curlFetchError: curlFetch.error,
    curlFetchStderr: curlFetch.stderr,
    curlFetchSnippet: curlFetch.stdout.substring(0, 300),
    detailDocsCount: detailData?.technicalSpecs?.documents?.length,
    detailDocs: detailData?.technicalSpecs?.documents
  });
}
