'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AreaChart, Area, XAxis, CartesianGrid } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { formatWon } from '@/lib/format';
import type { RevenueTrendChartProps } from '@/types/seller/statistics';

const chartConfig = {
  revenue: { label: '매출', color: 'var(--color-primary)' },
} satisfies ChartConfig;

function formatDateLabel(dateStr: string) {
  const date = new Date(`${dateStr}T00:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <Card className="border-border shadow-sm">
      <CardHeader className="pb-3 border-b border-border">
        <CardTitle className="text-h5 font-semibold text-dark-text">기간별 매출 추이</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <ChartContainer config={chartConfig} className="h-64 w-full max-mobile:h-52">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueTrendFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDateLabel}
              interval={data.length > 30 ? 6 : data.length > 7 ? 3 : 0}
            />
            <ChartTooltip
              cursor={{ stroke: 'var(--color-revenue)', strokeWidth: 1, strokeDasharray: '4 4' }}
              content={
                <ChartTooltipContent
                  labelKey="date"
                  indicator="dot"
                  labelFormatter={(_, payload) =>
                    formatDateLabel(payload?.[0]?.payload?.date ?? '')
                  }
                  formatter={(value) => formatWon(Number(value))}
                />
              }
            />
            <Area
              dataKey="revenue"
              type="monotone"
              stroke="var(--color-revenue)"
              strokeWidth={2.5}
              fill="url(#revenueTrendFill)"
              dot={false}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'var(--color-background)' }}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
