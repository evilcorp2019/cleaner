import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './BootTimeChart.css';

const BootTimeChart = ({ data, trend }) => {
  if (!data || data.length === 0) {
    return (
      <div className="boot-time-chart-empty">
        <p>No boot time data available yet.</p>
        <p className="boot-time-chart-empty-hint">
          Data will be collected over time as you use your system.
        </p>
      </div>
    );
  }

  // Custom tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="boot-time-tooltip">
          <p className="tooltip-date">{payload[0].payload.date}</p>
          <p className="tooltip-time">
            <span className="tooltip-label">Boot Time:</span>
            <span className="tooltip-value">{payload[0].value}s</span>
          </p>
          <p className="tooltip-programs">
            <span className="tooltip-label">Startup Programs:</span>
            <span className="tooltip-value">{payload[0].payload.programs}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Calculate trend indicator
  const getTrendInfo = () => {
    if (!trend) return null;

    const { trend: trendDirection, change, percentChange } = trend;

    if (trendDirection === 'stable') {
      return (
        <div className="trend-indicator trend-stable">
          <span className="trend-icon">→</span>
          <span className="trend-text">Stable</span>
        </div>
      );
    } else if (trendDirection === 'improving') {
      return (
        <div className="trend-indicator trend-improving">
          <span className="trend-icon">↓</span>
          <span className="trend-text">
            Improving by {Math.abs(change)}s ({percentChange}%)
          </span>
        </div>
      );
    } else {
      return (
        <div className="trend-indicator trend-declining">
          <span className="trend-icon">↑</span>
          <span className="trend-text">
            Slower by {Math.abs(change)}s ({Math.abs(percentChange)}%)
          </span>
        </div>
      );
    }
  };

  return (
    <div className="boot-time-chart">
      <div className="chart-header">
        <h3>Boot Time History (Last 30 Days)</h3>
        {getTrendInfo()}
      </div>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
          <XAxis
            dataKey="date"
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="var(--text-secondary)"
            style={{ fontSize: '12px' }}
            label={{ value: 'Boot Time (seconds)', angle: -90, position: 'insideLeft' }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: '12px', color: 'var(--text-primary)' }}
          />
          <Line
            type="monotone"
            dataKey="bootTime"
            name="Boot Time (s)"
            stroke="var(--accent-color)"
            strokeWidth={2}
            dot={{ fill: 'var(--accent-color)', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BootTimeChart;
