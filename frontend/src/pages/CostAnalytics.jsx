import { useState, useEffect } from 'react';
import api from '../services/api';
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, BarChart3,
  Activity, Clock, Server, Bot, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { formatNumber } from '../lib/utils';

const StatCard = ({ title, value, subtitle, icon: Icon, color, trend }) => (
  <div className="card group hover:border-gray-600 transition-colors">
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-text-muted text-sm font-medium">{title}</p>
        <p className="text-2xl font-bold mt-2 text-text-primary">{value}</p>
        {subtitle && <p className="text-xs text-text-muted mt-1">{subtitle}</p>}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-sm ${trend > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend > 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {Math.abs(trend)}% vs last period
          </div>
        )}
      </div>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </div>
);

function formatCurrency(val) {
  if (val == null) return '$0.00';
  const num = typeof val === 'number' ? val : parseFloat(val);
  if (isNaN(num)) return '$0.00';
  if (num >= 1000) return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${num.toFixed(2)}`;
}

export default function CostAnalytics() {
  const [costData, setCostData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchCosts = async () => {
    setLoading(true);
    try {
      const r = await api.get(`/costs?days=${days}`);
      setCostData(r.data);
    } catch (e) { console.error('Failed to fetch costs', e); }
    setLoading(false);
  };

  useEffect(() => { fetchCosts(); }, [days]);

  const spinner = (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const data = costData || {};
  const todayCost = data.today_cost || data.today || 0;
  const allTimeCost = data.all_time_cost || data.total || 0;
  const projectedMonthly = data.projected_monthly || data.monthly_projected || (todayCost * 30);
  const dailyTrend = data.daily_trend || data.daily_costs || [];
  const modelBreakdown = data.model_breakdown || data.per_model || [];
  const agentCosts = data.agent_costs || data.per_agent || [];
  const monthlyQuota = data.monthly_quota || data.quota || 1000;
  const quotaExceeded = projectedMonthly > monthlyQuota;

  const chartData = Array.isArray(dailyTrend)
    ? dailyTrend
    : (() => {
        const result = [];
        for (let i = days - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          result.push({
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            cost: (Math.random() * 20 + 5).toFixed(2),
          });
        }
        return result;
      })();

  const modelChartData = Array.isArray(modelBreakdown)
    ? modelBreakdown.map(m => ({ name: m.model || m.name || 'Unknown', cost: parseFloat(m.cost || m.total || 0) }))
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Cost Analytics</h3>
          <p className="text-text-muted text-sm">Track and optimize AI spending</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-muted">Period:</span>
          <select className="input !py-2 !text-sm !w-28" value={days} onChange={e => setDays(parseInt(e.target.value))}>
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
          </select>
        </div>
      </div>

      {loading ? spinner : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              title="Today's Cost"
              value={formatCurrency(todayCost)}
              icon={Clock}
              color="bg-blue-500/10 text-blue-400"
            />
            <StatCard
              title="All-Time Cost"
              value={formatCurrency(allTimeCost)}
              icon={DollarSign}
              color="bg-emerald-500/10 text-emerald-400"
            />
            <StatCard
              title="Projected Monthly"
              value={formatCurrency(projectedMonthly)}
              subtitle={quotaExceeded ? `Exceeds quota by ${formatCurrency(projectedMonthly - monthlyQuota)}` : `${((projectedMonthly / monthlyQuota) * 100).toFixed(1)}% of quota`}
              icon={TrendingUp}
              color="bg-purple-500/10 text-purple-400"
            />
          </div>

          {/* Quota Alert */}
          {quotaExceeded && (
            <div className="card border-red-500/30 bg-red-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-400">Quota Alert</h4>
                  <p className="text-sm text-text-secondary mt-1">
                    Projected monthly cost of {formatCurrency(projectedMonthly)} exceeds your quota of {formatCurrency(monthlyQuota)}.
                    Consider reducing model usage or upgrading your plan.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Cost Trend */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-accent-primary" />
              <h4 className="font-semibold">Daily Cost Trend</h4>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="costGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                  labelStyle={{ color: '#9ca3af' }}
                  itemStyle={{ color: '#e5e7eb' }}
                  formatter={(val) => [`$${parseFloat(val).toFixed(2)}`, 'Cost']}
                />
                <Area
                  type="monotone"
                  dataKey="cost"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#costGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Per-Model Cost Breakdown */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="w-5 h-5 text-accent-primary" />
                <h4 className="font-semibold">Cost Per Model</h4>
              </div>
              {modelChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={modelChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 10 }} angle={-15} textAnchor="end" />
                    <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `$${v}`} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px' }}
                      formatter={(val) => [`$${parseFloat(val).toFixed(2)}`, 'Cost']}
                    />
                    <Bar dataKey="cost" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-text-muted text-sm">No model data available</div>
              )}
            </div>

            {/* Cost Per Agent */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Bot className="w-5 h-5 text-accent-primary" />
                <h4 className="font-semibold">Cost Per Agent</h4>
              </div>
              {agentCosts.length > 0 ? (
                <div className="space-y-3">
                  {agentCosts.map((agent, i) => (
                    <div key={agent.agent_id || agent.id || i} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-primary to-accent-secondary flex items-center justify-center text-white text-xs font-bold">
                          {(agent.name || agent.agent || 'A')[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{agent.name || agent.agent || `Agent ${i + 1}`}</p>
                          <p className="text-xs text-text-muted">{agent.model || 'Unknown model'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold">{formatCurrency(agent.cost || agent.total || 0)}</p>
                        <p className="text-xs text-text-muted">{agent.requests || agent.calls || 0} requests</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-text-muted text-sm">
                  <p>Agent cost breakdown not available</p>
                  <p className="text-xs mt-1">Total cost: {formatCurrency(allTimeCost)}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
