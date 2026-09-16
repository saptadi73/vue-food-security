export interface NavItem {
  label: string
  to: string
  icon: string
  /** Permission untuk menyembunyikan menu; otorisasi tetap di server. */
  permission?: string | string[]
  badge?: 'alarms' | 'complaints' | 'notifications'
  description?: string
}

export interface NavSection {
  title: string
  icon: string
  items: NavItem[]
}

export const navigation: NavSection[] = [
  {
    title: 'Ikhtisar',
    icon: 'lucide:layout-dashboard',
    items: [
      {
        label: 'Dashboard',
        to: '/',
        icon: 'lucide:layout-dashboard',
        description: 'Ringkasan operasional tenant',
      },
      {
        label: 'Monitor Suhu',
        to: '/monitoring/temperature',
        icon: 'lucide:thermometer',
        description: 'Suhu terbaru per penyimpanan',
      },
      {
        label: 'Alarm',
        to: '/monitoring/alarms',
        icon: 'lucide:siren',
        badge: 'alarms',
        description: 'Kejadian alarm dan acknowledgment',
      },
      {
        label: 'Sesi Perangkat',
        to: '/monitoring/device-sessions',
        icon: 'lucide:radio',
        description: 'Koneksi perangkat IoT',
      },
    ],
  },
  {
    title: 'Traceability',
    icon: 'lucide:git-branch',
    items: [
      {
        label: 'Cek Kemasan',
        to: '/scan/traceability',
        icon: 'lucide:scan-line',
        description: 'Resolve paket dari QR',
      },
      { label: 'Pindai Bahan Storage', to: '/scan/material', icon: 'lucide:wheat' },
      { label: 'Loading Delivery', to: '/scan/loading', icon: 'lucide:truck' },
      { label: 'Penerimaan Sekolah', to: '/scan/school-receiving', icon: 'lucide:school' },
      { label: 'Pengiriman Aktif', to: '/deliveries', icon: 'lucide:truck' },
      {
        label: 'Paket & QR',
        to: '/packages',
        icon: 'lucide:package',
        description: 'Alokasi paket dan pembuatan QR',
      },
      {
        label: 'Penerimaan Bahan',
        to: '/raw-material-batches',
        icon: 'lucide:package-check',
        description: 'QR batch bahan makanan yang diterima',
      },
      {
        label: 'Batch Produksi',
        to: '/production-batches',
        icon: 'lucide:chef-hat',
        description: 'Rencana produksi, cooking, suhu inti dan waktu selesai masak',
      },
      {
        label: 'Jejak Asset',
        to: '/traceability',
        icon: 'lucide:git-branch',
        description: 'Passport, traversal dan impact',
      },
    ],
  },
  {
    title: 'Insiden',
    icon: 'lucide:shield-alert',
    items: [
      {
        label: 'Keluhan',
        to: '/complaints',
        icon: 'lucide:message-square-warning',
        badge: 'complaints',
      },
      { label: 'Recall', to: '/recalls', icon: 'lucide:undo-2' },
      {
        label: 'Notifikasi',
        to: '/notifications',
        icon: 'lucide:bell',
        badge: 'notifications',
      },
    ],
  },
  {
    title: 'Master Data',
    icon: 'lucide:database',
    items: [
      { label: 'Dapur', to: '/master/kitchens', icon: 'lucide:chef-hat' },
      { label: 'Penyimpanan', to: '/master/storages', icon: 'lucide:warehouse' },
      { label: 'Zona Penyimpanan', to: '/master/storage-zones', icon: 'lucide:grid-3x3' },
      { label: 'Sekolah', to: '/master/schools', icon: 'lucide:school' },
      { label: 'Pemasok', to: '/master/suppliers', icon: 'lucide:truck' },
      { label: 'Bahan Baku', to: '/master/raw-materials', icon: 'lucide:wheat' },
      { label: 'Relasi Pemasok', to: '/master/supplier-materials', icon: 'lucide:link' },
      { label: 'Menu', to: '/master/food-items', icon: 'lucide:utensils' },
      { label: 'Resep', to: '/master/recipes', icon: 'lucide:book-open' },
      { label: 'Jenis Kemasan', to: '/master/packaging-types', icon: 'lucide:box' },
      { label: 'Kendaraan', to: '/master/vehicles', icon: 'lucide:truck' },
      { label: 'Pengemudi', to: '/master/drivers', icon: 'lucide:id-card' },
      { label: 'Perangkat', to: '/master/devices', icon: 'lucide:cpu' },
      { label: 'Binding Perangkat', to: '/master/device-bindings', icon: 'lucide:plug' },
    ],
  },
  {
    title: 'Konfigurasi',
    icon: 'lucide:sliders-horizontal',
    items: [
      { label: 'Holding Rule', to: '/config/holding-rules', icon: 'lucide:timer' },
      { label: 'Alarm Rule', to: '/config/alarm-rules', icon: 'lucide:bell-ring' },
      { label: 'Diagnostik API', to: '/config/diagnostics', icon: 'lucide:activity' },
    ],
  },
]

/** Menu bawah khusus mobile â€” aksi paling sering dipakai di lapangan. */
export const mobileQuickNav: NavItem[] = [
  { label: 'Dashboard', to: '/', icon: 'lucide:layout-dashboard' },
  { label: 'Paket', to: '/packages', icon: 'lucide:package' },
  { label: 'Cek QR', to: '/scan/traceability', icon: 'lucide:scan-line' },
  { label: 'Jejak', to: '/traceability', icon: 'lucide:git-branch' },
  { label: 'Alarm', to: '/monitoring/alarms', icon: 'lucide:siren' },
]


