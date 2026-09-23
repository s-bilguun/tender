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

  const tests = [
    { name: 'gw153_www', url: 'https://www.tender.gov.mn/api/gw/153/list?tenderDocumentId=1789954038670' },
    { name: 'gw153_user', url: 'https://user.tender.gov.mn/api/gw/153/list?tenderDocumentId=1789954038670' },
    { name: 'gw88_www', url: 'https://www.tender.gov.mn/api/gw/88/list?tenderDocumentId=1789954038670' },
    { name: 'gw88_user', url: 'https://user.tender.gov.mn/api/gw/88/list?tenderDocumentId=1789954038670' },
    { name: 'detail_user_domain', url: 'https://user.tender.gov.mn/mn/invitation/detail/1789954038947' },
    { name: 'detail_no_www', url: 'https://tender.gov.mn/mn/invitation/detail/1789954038947' },
    { name: 'detail_www', url: 'https://www.tender.gov.mn/mn/invitation/detail/1789954038947' }
  ];

  const results: any[] = [];
  for (const t of tests) {
    const res = await runCmd(curlCmd, [
      '-s', '-L',
      '--connect-timeout', '6',
      '-A', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      '-H', 'Accept: application/json, text/html, */*',
      '-H', 'Accept-Language: mn',
      t.url
    ]);
    results.push({
      name: t.name,
      url: t.url,
      length: res.stdout.length,
      snippet: res.stdout.substring(0, 150),
      isJson: res.stdout.trim().startsWith('[') || res.stdout.trim().startsWith('{'),
      error: res.error
    });
  }

  return NextResponse.json({
    platform: process.platform,
    results
  });
}
