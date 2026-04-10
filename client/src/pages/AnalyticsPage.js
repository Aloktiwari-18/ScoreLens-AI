import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { Bar, Doughnut, Line, Radar } from 'react-chartjs-2';
import {
  ChartBarIcon, TrophyIcon, ExclamationTriangleIcon,
  UserGroupIcon, DocumentCheckIcon, ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, RadialLinearScale,
  Title, Tooltip, Legend, Filler
);

const CHART_COLORS = {
  brand:   'rgba(97, 114, 243, 1)',
  brandBg: 'rgba(97, 114, 243, 0.15)',
  green:   'rgba(16, 185, 129, 1)',
  greenBg: 'rgba(16, 185, 129, 0.15)',
  amber:   'rgba(245, 158, 11, 1)',
  amberBg: 'rgba(245, 158, 11, 0.15)',
  red:     'rgba(239, 68, 68, 1)',
  purple:  'rgba(168, 85, 247, 1)',
  purpleBg:'rgba(168, 85, 247, 0.15)',
};

const commonOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: '#1e293b',
      titleFont: { family: 'DM Sans', size: 12 },
      bodyFont: { family: 'DM Sans', size: 12 },
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: { grid: { display: false }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#94a3b8' } },
    y: { grid: { color: '#f1f5f9' }, ticks: { font: { family: 'DM Sans', size: 11 }, color: '#94a3b8' } },
  },
};

function StatCard({ icon: Icon, label, value, sub, color }) {
  const colorMap = {
    brand: 'bg-brand-50 text-brand-600',
    green: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    red:   'bg-red-50 text-red-600',
    purple:'bg-purple-50 text-purple-600',
  };
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${colorMap[color] || colorMap.brand}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-2xl font-display font-bold text-slate-900">{value}</div>
      <div className="text-sm font-medium text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

// ─── Teacher Analytics ────────────────────────────────────────────────────────
function TeacherAnalytics({ data }) {
  const { overview, scoreDistribution, topPerformers, assignmentStats, plagiarismAlerts, processingStats } = data;

  const distChartData = {
    labels: scoreDistribution.map(d => d.grade),
    datasets: [{
      data: scoreDistribution.map(d => d.count),
      backgroundColor: [
        CHART_COLORS.green, CHART_COLORS.brand, CHART_COLORS.purple,
        CHART_COLORS.amber, '#fb923c', CHART_COLORS.red,
      ],
      borderWidth: 0,
      borderRadius: 6,
    }],
  };

  const assignBarData = {
    labels: assignmentStats.slice(0, 8).map(a => a.title.slice(0, 15) + (a.title.length > 15 ? '…' : '')),
    datasets: [{
      label: 'Avg Score (%)',
      data: assignmentStats.slice(0, 8).map(a => a.avgScore),
      backgroundColor: CHART_COLORS.brandBg,
      borderColor: CHART_COLORS.brand,
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  const passRateData = {
    labels: assignmentStats.slice(0, 6).map(a => a.title.slice(0, 12) + '…'),
    datasets: [{
      label: 'Pass Rate (%)',
      data: assignmentStats.slice(0, 6).map(a => a.passRate),
      backgroundColor: CHART_COLORS.greenBg,
      borderColor: CHART_COLORS.green,
      borderWidth: 2,
      fill: true,
      tension: 0.4,
    }],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={ChartBarIcon}           label="Total Assignments"    value={overview.totalAssignments}    color="brand"  />
        <StatCard icon={DocumentCheckIcon}       label="Evaluated"           value={overview.evaluatedSubmissions} color="green"  sub={`of ${overview.totalSubmissions} total`} />
        <StatCard icon={ArrowTrendingUpIcon}     label="Class Average"       value={`${overview.avgScore}%`}      color="purple" />
        <StatCard icon={ExclamationTriangleIcon} label="Plagiarism Alerts"   value={overview.plagiarismAlerts}    color={overview.plagiarismAlerts > 0 ? 'red' : 'brand'} />
      </div>

      {/* Charts row */}
      <div className="grid lg:grid-cols-5 gap-6">
        {/* Score distribution */}
        <div className="card p-5 lg:col-span-2">
          <h2 className="section-title">Score Distribution</h2>
          <div className="h-52">
            <Bar
              data={distChartData}
              options={{
                ...commonOptions,
                plugins: { ...commonOptions.plugins, legend: { display: false } },
              }}
            />
          </div>
        </div>

        {/* Assignment avg scores */}
        <div className="card p-5 lg:col-span-3">
          <h2 className="section-title">Average Score by Assignment</h2>
          <div className="h-52">
            <Bar
              data={assignBarData}
              options={{
                ...commonOptions,
                plugins: { ...commonOptions.plugins, legend: { display: false } },
                scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, max: 100 } },
              }}
            />
          </div>
        </div>
      </div>

      {/* Pass rate trend */}
      {assignmentStats.length > 1 && (
        <div className="card p-5">
          <h2 className="section-title">Pass Rate Trend</h2>
          <div className="h-48">
            <Line
              data={passRateData}
              options={{
                ...commonOptions,
                plugins: { ...commonOptions.plugins, legend: { display: false } },
                scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 100 } },
              }}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top performers */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
            <TrophyIcon className="w-5 h-5 text-amber-500" />
            <h2 className="section-title mb-0">Top Performers</h2>
          </div>
          {topPerformers.length === 0 ? (
            <p className="p-5 text-slate-400 text-sm">No data yet.</p>
          ) : (
            <div className="divide-y divide-slate-50">
              {topPerformers.map((p, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-slate-200 text-slate-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {i + 1}
                  </span>
                  <p className="flex-1 text-sm font-medium text-slate-800 truncate">{p.name}</p>
                  <span className="text-sm font-bold text-brand-600">{p.avgScore}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Assignment breakdown table */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="section-title mb-0">Assignment Summary</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="table-header">Assignment</th>
                  <th className="table-header">Subs</th>
                  <th className="table-header">Avg</th>
                  <th className="table-header">Pass%</th>
                </tr>
              </thead>
              <tbody>
                {assignmentStats.slice(0, 6).map((a, i) => (
                  <tr key={i} className="table-row">
                    <td className="table-cell max-w-[140px] truncate font-medium">{a.title}</td>
                    <td className="table-cell">{a.submissions}</td>
                    <td className="table-cell font-semibold text-brand-600">{a.avgScore}%</td>
                    <td className="table-cell">
                      <span className={a.passRate >= 70 ? 'text-emerald-600 font-semibold' : a.passRate >= 40 ? 'text-amber-600' : 'text-red-600'}>
                        {a.passRate}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Plagiarism alerts */}
      {plagiarismAlerts.length > 0 && (
        <div className="card border-red-200">
          <div className="px-5 py-4 border-b border-red-100 flex items-center gap-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
            <h2 className="section-title mb-0 text-red-700">Plagiarism Alerts</h2>
          </div>
          <div className="divide-y divide-red-50">
            {plagiarismAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between px-5 py-3.5 hover:bg-red-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-slate-800">{alert.studentName}</p>
                  <p className="text-xs text-slate-400">{alert.assignmentTitle}</p>
                </div>
                <span className="badge-red">{alert.highestSimilarity}% similar</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Processing status */}
      <div className="card p-5">
        <h2 className="section-title">Processing Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {Object.entries(processingStats).map(([status, count]) => (
            <div key={status} className="text-center p-3 bg-slate-50 rounded-lg">
              <div className="text-xl font-bold text-slate-900">{count}</div>
              <div className="text-xs text-slate-500 capitalize mt-0.5">{status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Student Analytics ────────────────────────────────────────────────────────
function StudentAnalytics({ data }) {
  const { overview, performanceTrend, rubricStats } = data;

  const trendData = {
    labels: performanceTrend.map(p => p.assignment?.slice(0, 12) + '…' || 'Assignment'),
    datasets: [{
      label: 'Score (%)',
      data: performanceTrend.map(p => p.score),
      borderColor: CHART_COLORS.brand,
      backgroundColor: CHART_COLORS.brandBg,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: CHART_COLORS.brand,
      pointRadius: 5,
    }],
  };

  const radarData = rubricStats.length > 0 ? {
    labels: rubricStats.map(r => r.criterion),
    datasets: [{
      label: 'Your Performance',
      data: rubricStats.map(r => r.percentage),
      borderColor: CHART_COLORS.brand,
      backgroundColor: CHART_COLORS.brandBg,
      pointBackgroundColor: CHART_COLORS.brand,
    }],
  } : null;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DocumentCheckIcon}   label="Submissions"   value={overview.totalSubmissions} color="brand"  />
        <StatCard icon={ChartBarIcon}         label="Avg Score"     value={`${overview.avgScore}%`}   color="green"  />
        <StatCard icon={TrophyIcon}           label="Best Score"    value={`${overview.bestScore}%`}  color="amber"  />
        <StatCard icon={ArrowTrendingUpIcon}  label="Latest Grade"  value={overview.latestGrade}      color="purple" />
      </div>

      {/* Performance trend */}
      {performanceTrend.length > 0 && (
        <div className="card p-5">
          <h2 className="section-title">Performance Trend</h2>
          <div className="h-56">
            <Line
              data={trendData}
              options={{
                ...commonOptions,
                plugins: { ...commonOptions.plugins, legend: { display: false } },
                scales: { ...commonOptions.scales, y: { ...commonOptions.scales.y, min: 0, max: 100 } },
              }}
            />
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rubric radar */}
        {radarData && (
          <div className="card p-5">
            <h2 className="section-title">Skills Radar</h2>
            <div className="h-56">
              <Radar
                data={radarData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    r: {
                      min: 0, max: 100,
                      ticks: { stepSize: 20, font: { family: 'DM Sans', size: 10 } },
                      pointLabels: { font: { family: 'DM Sans', size: 11 } },
                      grid: { color: '#e2e8f0' },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* Rubric breakdown table */}
        {rubricStats.length > 0 && (
          <div className="card p-5">
            <h2 className="section-title">Criterion Breakdown</h2>
            <div className="space-y-3">
              {rubricStats.map((r, i) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700 capitalize">{r.criterion}</span>
                    <span className={`font-semibold ${r.percentage >= 75 ? 'text-emerald-600' : r.percentage >= 50 ? 'text-brand-600' : 'text-amber-600'}`}>
                      {r.percentage}%
                    </span>
                  </div>
                  <div className="progress-bar">
                    <div
                      className={`progress-fill ${r.percentage >= 75 ? 'bg-emerald-500' : r.percentage >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`}
                      style={{ width: `${r.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Submission history */}
      {performanceTrend.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="section-title mb-0">Submission History</h2>
          </div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-header">Assignment</th>
                <th className="table-header">Score</th>
                <th className="table-header">Grade</th>
                <th className="table-header">Date</th>
              </tr>
            </thead>
            <tbody>
              {[...performanceTrend].reverse().map((p, i) => (
                <tr key={i} className="table-row">
                  <td className="table-cell font-medium">{p.assignment}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-2">
                      <div className="progress-bar flex-1 max-w-[80px]">
                        <div
                          className={`progress-fill ${p.score >= 75 ? 'bg-emerald-500' : p.score >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`}
                          style={{ width: `${p.score}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-slate-700">{p.score?.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`font-bold text-sm ${
                      p.grade?.startsWith('A') ? 'text-emerald-600' :
                      p.grade?.startsWith('B') ? 'text-brand-600' :
                      p.grade?.startsWith('C') ? 'text-amber-600' : 'text-red-600'
                    }`}>
                      {p.grade || 'N/A'}
                    </span>
                  </td>
                  <td className="table-cell text-slate-400">
                    {new Date(p.date).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { user } = useAuth();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = user.role === 'teacher' ? '/analytics/teacher' : '/analytics/student';
    api.get(endpoint)
      .then(r => setData(r.data.analytics))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user.role]);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Analytics</h1>
        <p className="page-subtitle">
          {user.role === 'teacher' ? 'Class performance overview and insights' : 'Your academic progress and performance'}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><div className="w-8 h-8 spinner" /></div>
      ) : !data ? (
        <div className="card py-16 text-center text-slate-400">No data available yet.</div>
      ) : user.role === 'teacher' ? (
        <TeacherAnalytics data={data} />
      ) : (
        <StudentAnalytics data={data} />
      )}
    </div>
  );
}
