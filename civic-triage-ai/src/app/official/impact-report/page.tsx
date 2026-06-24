import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { generateImpactReport } from '@/app/actions/generate-impact-report';
import ImpactReportView from '@/components/ImpactReportView';

export default async function ImpactReportPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('official_session')?.value;

  if (!session) {
    redirect('/official/login');
  }

  const reportRes = await generateImpactReport(session);

  if (!reportRes.success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="bg-red-500/10 p-6 rounded-xl border border-red-500/50 text-center">
          <h2 className="text-xl font-bold text-red-400 mb-2">Error</h2>
          <p>{reportRes.error}</p>
        </div>
      </div>
    );
  }

  return <ImpactReportView data={reportRes.data} />;
}
