export type ChartKind = 'area' | 'line' | 'bar' | 'donut' | 'radialBar' | 'heatmap' | 'pie'

export const CHART_PALETTE = [
  '#16a34a',
  '#0ea5e9',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#14b8a6',
  '#ec4899',
  '#64748b',
]

interface ThemeArgs {
  kind: ChartKind
  dark: boolean
  categories?: (string | number)[]
  labels?: string[]
  colors?: string[]
  stacked?: boolean
  horizontal?: boolean
  extra?: Record<string, unknown>
}

/** Opsi ApexCharts baku agar seluruh chart konsisten dengan tema aplikasi. */
export function chartTheme({
  kind,
  dark,
  categories,
  labels,
  colors,
  stacked,
  horizontal,
  extra,
}: ThemeArgs): Record<string, unknown> {
  const gridColor = dark ? 'rgba(148,163,184,0.14)' : 'rgba(100,116,139,0.16)'
  const textColor = dark ? '#94a3b8' : '#64748b'

  const base: Record<string, unknown> = {
    chart: {
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      foreColor: textColor,
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      stacked: Boolean(stacked),
      animations: {
        enabled: true,
        speed: 500,
        animateGradually: { enabled: true, delay: 80 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      parentHeightOffset: 0,
    },
    theme: { mode: dark ? 'dark' : 'light' },
    colors: colors ?? CHART_PALETTE,
    dataLabels: { enabled: false },
    stroke: {
      curve: 'smooth',
      width: kind === 'area' || kind === 'line' ? 2.5 : 0,
      lineCap: 'round',
    },
    grid: {
      borderColor: gridColor,
      strokeDashArray: 4,
      padding: { left: 4, right: 8, top: 0 },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      theme: dark ? 'dark' : 'light',
      style: { fontSize: '12px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
      x: { show: true },
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontSize: '12px',
      fontWeight: 600,
      markers: { size: 6, shape: 'circle' },
      itemMargin: { horizontal: 10, vertical: 4 },
    },
    states: { hover: { filter: { type: 'lighten', value: 0.06 } } },
    noData: {
      text: 'Belum ada data',
      style: { fontSize: '13px', fontFamily: "'Plus Jakarta Sans', sans-serif" },
    },
  }

  if (kind === 'area') {
    base.fill = {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.42,
        opacityTo: 0.02,
        stops: [0, 95, 100],
      },
    }
  }

  if (kind === 'bar') {
    base.plotOptions = {
      bar: {
        horizontal: Boolean(horizontal),
        borderRadius: 6,
        borderRadiusApplication: 'end',
        columnWidth: '52%',
        barHeight: '62%',
      },
    }
  }

  if (kind === 'donut' || kind === 'pie') {
    base.labels = labels ?? []
    base.plotOptions = {
      pie: {
        donut: {
          size: '72%',
          labels: {
            show: true,
            value: { fontSize: '22px', fontWeight: 800, offsetY: 2 },
            total: {
              show: true,
              label: 'Total',
              fontSize: '12px',
              fontWeight: 600,
              color: textColor,
            },
          },
        },
      },
    }
    base.stroke = { width: 0 }
  }

  if (categories) {
    base.xaxis = {
      categories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: { fontSize: '11px', fontWeight: 600 },
        trim: true,
        hideOverlappingLabels: true,
      },
      tooltip: { enabled: false },
    }
    base.yaxis = {
      labels: {
        style: { fontSize: '11px', fontWeight: 600 },
        formatter: (value: number) =>
          Number.isFinite(value) ? new Intl.NumberFormat('id-ID').format(value) : String(value),
      },
    }
  }

  base.responsive = [
    {
      breakpoint: 640,
      options: {
        chart: { height: 240 },
        legend: { position: 'bottom', fontSize: '11px' },
        plotOptions: { bar: { columnWidth: '68%' } },
      },
    },
  ]

  return { ...base, ...(extra ?? {}) }
}
