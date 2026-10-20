import { GoalContributionForm, GoalForm } from '@/components/forms';
import { EmptyState, ProgressBar } from '@/components/ui';
import { loadWorkspace } from '@/lib/data';
import { goalProgressList } from '@/lib/calc/goals';
import { currentPeriod, formatRupiah } from '@/lib/format';

export default async function TargetPage() {
  const ws = await loadWorkspace();
  const progress = goalProgressList(ws.goals, ws.contributions, currentPeriod());

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Target keuangan</h1>
        <p className="text-sm text-muted">
          Lacak dana darurat, modal bisnis, dan investasi — beserta berapa yang perlu disisihkan tiap bulan.
        </p>
      </header>

      <GoalForm />

      <section className="grid gap-4 lg:grid-cols-2">
        {progress.length === 0 ? (
          <div className="lg:col-span-2">
            <EmptyState
              title="Belum ada target aktif"
              description="Tetapkan target agar sistem bisa menghitung setoran per bulan yang diperlukan."
            />
          </div>
        ) : (
          progress.map((item) => (
            <div key={item.goal.id} className="card space-y-3">
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium">{item.goal.name}</h2>
                    <p className="text-xs text-muted">{item.goal.type}</p>
                  </div>
                  <p className="text-sm font-semibold">
                    {formatRupiah(item.saved)} / {formatRupiah(item.goal.target_amount)}
                  </p>
                </div>
                <div className="mt-2">
                  <ProgressBar ratio={item.ratio} tone={item.ratio >= 1 ? 'positive' : 'accent'} />
                </div>
                <p className="mt-1 text-xs text-muted">
                  Kurang {formatRupiah(item.remaining)}
                  {item.monthlyNeeded
                    ? ` · perlu ${formatRupiah(item.monthlyNeeded)}/bulan selama ${item.monthsLeft} bulan`
                    : item.monthsLeft === 0
                      ? ' · batas waktu tercapai'
                      : ''}
                </p>
              </div>
              <GoalContributionForm goalId={item.goal.id} />
            </div>
          ))
        )}
      </section>
    </div>
  );
}
