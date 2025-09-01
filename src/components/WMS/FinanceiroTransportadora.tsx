import { FinanceiroTransportadoraTable } from './FinanceiroTransportadoraTable';
import { FinanceiroTransportadoraDashboard } from './FinanceiroTransportadoraDashboard';

export function FinanceiroTransportadora() {
  return (
    <div className="space-y-6">
      <FinanceiroTransportadoraDashboard />
      <FinanceiroTransportadoraTable />
    </div>
  );
}