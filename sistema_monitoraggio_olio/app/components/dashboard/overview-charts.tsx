
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';

interface OverviewChartsProps {
  trendData?: Array<{
    data: string;
    contenuti: number;
    sentimentScore: number;
  }>;
  sentimentDistribution?: Array<{
    sentiment: string;
    count: number;
  }>;
  keywordPerformance?: Array<{
    keyword: string;
    menzioni: number;
    sentiment: number;
  }>;
}

const SENTIMENT_COLORS = {
  positivo: '#10B981',
  neutro: '#6B7280', 
  negativo: '#EF4444'
};

export function OverviewCharts({ trendData = [], sentimentDistribution = [], keywordPerformance = [] }: OverviewChartsProps) {
  // Usa i dati reali, mostra messaggio se vuoti
  const trendsToShow = trendData;
  const sentimentToShow = sentimentDistribution;
  const keywordData = keywordPerformance;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* Trend Giornaliero */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>📈</span>
            <span>Trend Contenuti Giornaliero</span>
          </CardTitle>
          <CardDescription>
            Andamento delle menzioni e sentiment negli ultimi 7 giorni
          </CardDescription>
        </CardHeader>
        <CardContent>
          {trendsToShow.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsToShow}>
                <XAxis
                  dataKey="data"
                  tickFormatter={(date) => new Date(date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="contenuti"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  label={{ value: 'Contenuti', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="sentiment"
                  orientation="right"
                  domain={[-1, 1]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  label={{ value: 'Sentiment Score', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 11 } }}
                />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString('it-IT')}
                  formatter={(value: number, name: string) => [
                    name === 'contenuti' ? value.toString() : value.toFixed(2),
                    name === 'contenuti' ? 'Contenuti' : 'Sentiment Score'
                  ]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Line
                  yAxisId="contenuti"
                  type="monotone"
                  dataKey="contenuti"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="sentimentScore"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Nessun dato disponibile per il trend giornaliero</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribuzione Sentiment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🎯</span>
            <span>Distribuzione Sentiment</span>
          </CardTitle>
          <CardDescription>
            Proporzione dei contenuti per sentiment
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sentimentToShow.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sentimentToShow}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="count"
                  >
                    {sentimentToShow.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={SENTIMENT_COLORS[entry.sentiment as keyof typeof SENTIMENT_COLORS] || '#6B7280'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [value, 'Contenuti']}
                    contentStyle={{ fontSize: 11 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center space-x-4 mt-4">
                {sentimentToShow.map((entry) => (
                  <div key={entry.sentiment} className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: SENTIMENT_COLORS[entry.sentiment as keyof typeof SENTIMENT_COLORS] || '#6B7280' }}
                    />
                    <span className="text-xs text-gray-600 capitalize">{entry.sentiment}</span>
                    <span className="text-xs font-semibold text-gray-900">({entry.count})</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Nessun dato disponibile per la distribuzione sentiment</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Keywords */}
      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>🔍</span>
            <span>Performance Keywords</span>
          </CardTitle>
          <CardDescription>
            Menzioni e sentiment per le keywords principali
          </CardDescription>
        </CardHeader>
        <CardContent>
          {keywordData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={keywordData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <XAxis
                  dataKey="keyword"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="menzioni"
                  orientation="left"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  label={{ value: 'Menzioni', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fontSize: 11 } }}
                />
                <YAxis
                  yAxisId="sentiment"
                  orientation="right"
                  domain={[-1, 1]}
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  label={{ value: 'Avg Sentiment', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fontSize: 11 } }}
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    name === 'menzioni' ? value.toString() : value.toFixed(2),
                    name === 'menzioni' ? 'Menzioni' : 'Sentiment Medio'
                  ]}
                  contentStyle={{ fontSize: 11 }}
                />
                <Bar
                  yAxisId="menzioni"
                  dataKey="menzioni"
                  fill="#60B5FF"
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="sentiment"
                  stroke="#10B981"
                  strokeWidth={3}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 5 }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              <p>Nessun dato disponibile per le keywords</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
