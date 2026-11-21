import { Building2, CircleCheck, CircleX, Wallet } from 'lucide-react';
import { useState } from 'react';
import StatCard from '../components/StatCard';
import { OverviewChart, RevenueChart } from '../components/Charts';
import { DashboardInvoices, DashboardTransactions } from '../components/DashboardTables';
import ProjectShowcase from '../components/ProjectShowcase';

type ChartRange = '7D' | '30D' | '90D';
export default function Dashboard() {
  const [dateRange, setDateRange] = useState('Last 30 Days');
  const [chartRange, setChartRange] = useState<ChartRange>('30D');
  return <div className="dashboard-page">
    <div className="page-title-row"><div><div className="eyebrow">Dashboard overview</div><h1>Welcome back, Pritam!</h1><p>Here's your billing overview for Acme Corp</p></div><select className="range-select" value={dateRange} onChange={e=>{const value=e.target.value;setDateRange(value);setChartRange(value==='Last 7 Days'?'7D':value==='Last 90 Days'?'90D':'30D')}}><option>Last 30 Days</option><option>Last 7 Days</option><option>Last 90 Days</option></select></div>
    <div className="stats-grid"><StatCard title="Total Revenue" value="$24,750" change="+12.5%" icon={Wallet} color="blue" footnote="vs. previous period"/><StatCard title="Successful Payments" value="1,248" change="+8.3%" icon={CircleCheck} color="green" footnote="vs. previous period"/><StatCard title="Failed Payments" value="42" change="-2.1%" icon={CircleX} color="red" footnote="vs. previous period"/><StatCard title="Active Organizations" value="2" change="0%" icon={Building2} color="purple" footnote="organizations"/></div>
    <div className="dashboard-analytics"><RevenueChart range={chartRange} onRangeChange={setChartRange}/><OverviewChart/></div>
    <div className="dashboard-tables"><DashboardTransactions/><DashboardInvoices/></div>
    <ProjectShowcase/>
  </div>;
}
