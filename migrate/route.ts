import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  try {
    const { stdout, stderr } = await execAsync('cd /var/task/sistema_monitoraggio_olio/app && npx prisma db push --accept-data-loss --skip-generate');
    
    return NextResponse.json({
      success: true,
      message: 'Database migrated successfully',
      stdout,
      stderr
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stderr: error.stderr
    }, { status: 500 });
  }
}
