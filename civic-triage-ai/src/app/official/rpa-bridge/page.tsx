import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import RPASimulator from '@/components/RPASimulator';
import { fetchRPAList } from '@/app/actions/export-rpa';

export default async function RPABridgePage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('official_session')?.value;

  if (!session) {
    redirect('/official/login');
  }

  const res = await fetchRPAList();

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <RPASimulator initialList={res.data || []} />
    </div>
  );
}
