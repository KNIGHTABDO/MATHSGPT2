
import React from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ChartData } from '../types';

interface GraphVisualizerProps {
  chartData: ChartData;
}

const GraphVisualizer: React.FC<GraphVisualizerProps> = ({ chartData }) => {
  const { type, data, dataKey } = chartData;
  const ChartComponent = type === 'line' ? LineChart : BarChart;
  const DataComponent = type === 'line' ? Line : Bar;

  return (
    <div className="w-full h-80 bg-gray-900 p-4 rounded-lg">
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent
          data={data}
          margin={{
            top: 5,
            right: 20,
            left: 0,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4B5563" />
          <XAxis dataKey="name" stroke="#9CA3AF" />
          <YAxis stroke="#9CA3AF" />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1F2937',
              borderColor: '#374151',
              color: '#F9FAFB'
            }}
          />
          <Legend wrapperStyle={{ color: '#D1D5DB' }}/>
          <DataComponent dataKey={dataKey} fill="#3B82F6" stroke="#3B82F6" />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default GraphVisualizer;
