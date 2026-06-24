import { supabase } from '@/lib/supabase';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import NextLink from 'next/link';
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, ShieldAlert, FileText } from 'lucide-react';
import Image from 'next/image';
import BeforeAfterSlider from '@/components/BeforeAfterSlider';

export default async function MyReports() {
  const citizenId = (await cookies()).get('citizen_id')?.value;

  if (!citizenId) {
    redirect('/');
  }

  // Also get the citizen to know their preferred language
  const { data: citizen } = await supabase
    .from('citizens')
    .select('preferred_language')
    .eq('id', citizenId)
    .single();

  const { data: reports, error } = await supabase
    .from('reports')
    .select('*')
    .eq('citizen_id', citizenId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Error fetching reports:", error);
  }

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'resolved': return <CheckCircle2 className="text-green-500 w-5 h-5" />;
      case 'in_progress': return <AlertTriangle className="text-orange-500 w-5 h-5" />;
      default: return <Clock className="text-blue-500 w-5 h-5" />;
    }
  };

  const getStatusText = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <NextLink href="/" className="text-slate-400 hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </NextLink>
            <div className="flex items-center gap-2">
              <div className="bg-blue-600 p-1.5 rounded-lg">
                <ShieldAlert size={18} className="text-white" />
              </div>
              <span className="font-bold text-lg tracking-tight text-white">CivicTriage AI</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">My Submitted Reports</h1>

        {(!reports || reports.length === 0) ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
            <p className="text-slate-400 text-lg mb-4">You haven't submitted any reports yet.</p>
            <NextLink href="/" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors inline-block">
              Report an Issue
            </NextLink>
          </div>
        ) : (
          <div className="grid gap-6">
            {reports.map((report) => (
              <div key={report.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-6 hover:border-slate-700 transition-colors">
                {/* Image Section (Static or Slider) */}
                <div className="relative w-full md:w-64 h-48 flex-shrink-0 bg-slate-800 rounded-xl overflow-hidden">
                  {report.status === 'resolved' && report.resolved_image_url ? (
                    <BeforeAfterSlider beforeUrl={report.image_url} afterUrl={report.resolved_image_url} />
                  ) : (
                    <Image 
                      src={report.image_url} 
                      alt="Issue image" 
                      fill 
                      className="object-cover"
                      unoptimized 
                    />
                  )}
                </div>
                
                {/* Details Section */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(report.status)}
                        <span className="font-medium text-slate-200">{getStatusText(report.status)}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {new Date(report.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-semibold mb-2">{report.ai_category || 'Uncategorized Issue'}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2 mb-4">{report.description}</p>

                    {/* Official Reply Section */}
                    {(report.official_reply || report.official_reply_translated) && (
                      <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl mb-4">
                        <div className="flex items-center gap-2 mb-1 text-sm font-semibold text-blue-400">
                          <FileText size={16} /> Official Response
                        </div>
                        <p className="text-slate-300 text-sm">
                          {report.original_language && report.original_language !== 'en' && report.official_reply_translated 
                            ? report.official_reply_translated 
                            : report.official_reply}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    {report.ai_severity !== null && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        report.ai_severity > 80 ? 'bg-red-500/20 text-red-400' :
                        report.ai_severity > 50 ? 'bg-orange-500/20 text-orange-400' :
                        'bg-green-500/20 text-green-400'
                      }`}>
                        Severity: {report.ai_severity}/100
                      </span>
                    )}
                    {report.ai_suggested_department && (
                      <span className="text-xs font-medium px-2 py-1 rounded-md bg-slate-800 text-slate-300">
                        {report.ai_suggested_department}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
