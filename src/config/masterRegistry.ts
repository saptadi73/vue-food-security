import type { SelectOption } from '@/components/ui/AppSelect.vue'
import type { TableColumn } from '@/components/ui/DataTable.vue'
import { mastersApi, type MasterKey } from '@/api/modules/masters'

export type FieldType =
  'text' | 'number' | 'decimal' | 'select' | 'reference' | 'email' | 'datetime'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  required?: boolean
  hint?: string
  placeholder?: string
  options?: SelectOption[]
  /** Untuk type 'reference': master lain yang menjadi sumber pilihan. */
  reference?: { master: MasterKey; valueKey: string; labelKey: string; filterActive?: boolean }
  /** Tidak dapat diubah setelah create (dikirim apa adanya pada PUT). */
  immutable?: boolean
  maxlength?: number
  min?: number
  max?: number
  step?: string
  full?: boolean
  defaultValue?: unknown
}

export interface MasterDefinition {
  key: MasterKey
  route: string
  title: string
  singular: string
  description: string
  icon: string
  permission: string
  idKey: string
  /** Nilai yang dipakai pada konfirmasi hapus (harus diketik ulang pengguna). */
  identityKey: string
  columns: TableColumn[]
  fields: FieldDef[]
  searchKeys: string[]
  /** Filter induk opsional yang didukung endpoint list. */
  parentFilter?: {
    key: string
    label: string
    master: MasterKey
    valueKey: string
    labelKey: string
  }
}

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ACTIVE', label: 'ACTIVE' },
  { value: 'INACTIVE', label: 'INACTIVE' },
]

const STORAGE_TYPE_OPTIONS: SelectOption[] = [
  { value: 'COLD_STORAGE', label: 'COLD_STORAGE' },
  { value: 'FREEZER', label: 'FREEZER' },
  { value: 'DRY_STORAGE', label: 'DRY_STORAGE' },
]

const statusField: FieldDef = {
  key: 'status',
  label: 'Status',
  type: 'select',
  options: STATUS_OPTIONS,
  defaultValue: 'ACTIVE',
  hint: 'PUT mengganti seluruh definisi; status kosong kembali ke ACTIVE.',
}

const coordinateFields: FieldDef[] = [
  {
    key: 'latitude',
    label: 'Latitude',
    type: 'decimal',
    hint: '-90..90, maksimal 6 desimal. Harus berpasangan dengan longitude.',
    placeholder: '-6.200000',
  },
  {
    key: 'longitude',
    label: 'Longitude',
    type: 'decimal',
    hint: '-180..180, maksimal 6 desimal.',
    placeholder: '106.800000',
  },
]

const statusColumn: TableColumn = { key: 'status', label: 'Status', align: 'center' }
const updatedColumn: TableColumn = {
  key: 'updated_at',
  label: 'Diperbarui',
  hideBelow: 'lg',
  align: 'right',
}
const versionColumn: TableColumn = { key: 'version', label: 'Ver', align: 'right', width: '64px' }

export const masterRegistry: Record<string, MasterDefinition> = {
  kitchens: {
    key: 'kitchens',
    route: 'kitchens',
    title: 'Dapur',
    singular: 'dapur',
    description: 'Master dapur produksi beserta koordinat dan kapasitasnya.',
    icon: 'lucide:chef-hat',
    permission: 'Kitchen.Read',
    idKey: 'kitchen_id',
    identityKey: 'kitchen_code',
    searchKeys: ['kitchen_code', 'kitchen_name', 'address'],
    columns: [
      { key: 'kitchen_code', label: 'Kode', mono: true },
      { key: 'kitchen_name', label: 'Nama' },
      { key: 'capacity', label: 'Kapasitas', align: 'right', hideBelow: 'md' },
      statusColumn,
      versionColumn,
      updatedColumn,
    ],
    fields: [
      { key: 'kitchen_code', label: 'Kode dapur', type: 'text', required: true, maxlength: 50 },
      { key: 'kitchen_name', label: 'Nama dapur', type: 'text', required: true, maxlength: 200 },
      ...coordinateFields,
      { key: 'address', label: 'Alamat', type: 'text', full: true },
      { key: 'capacity', label: 'Kapasitas', type: 'number', min: 0 },
      statusField,
    ],
  },

  storages: {
    key: 'storages',
    route: 'storages',
    title: 'Penyimpanan',
    singular: 'penyimpanan',
    description: 'Storage per dapur dengan tipe dan ambang suhu.',
    icon: 'lucide:warehouse',
    permission: 'Storage.Read',
    idKey: 'storage_id',
    identityKey: 'storage_code',
    searchKeys: ['storage_code', 'storage_name', 'storage_type'],
    parentFilter: {
      key: 'kitchen_id',
      label: 'Dapur',
      master: 'kitchens',
      valueKey: 'kitchen_id',
      labelKey: 'kitchen_name',
    },
    columns: [
      { key: 'storage_code', label: 'Kode', mono: true },
      { key: 'storage_name', label: 'Nama' },
      { key: 'storage_type', label: 'Tipe', hideBelow: 'md' },
      { key: 'temperature_min', label: 'Min °C', align: 'right', hideBelow: 'lg' },
      { key: 'temperature_max', label: 'Max °C', align: 'right', hideBelow: 'lg' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      {
        key: 'kitchen_id',
        label: 'Dapur induk',
        type: 'reference',
        required: true,
        immutable: true,
        reference: {
          master: 'kitchens',
          valueKey: 'kitchen_id',
          labelKey: 'kitchen_name',
          filterActive: true,
        },
        hint: 'Induk tidak dapat dipindahkan melalui PUT.',
      },
      { key: 'storage_code', label: 'Kode', type: 'text', required: true, maxlength: 50 },
      { key: 'storage_name', label: 'Nama', type: 'text', required: true, maxlength: 200 },
      {
        key: 'storage_type',
        label: 'Tipe penyimpanan',
        type: 'select',
        required: true,
        options: STORAGE_TYPE_OPTIONS,
      },
      { key: 'temperature_min', label: 'Suhu minimum (°C)', type: 'decimal', step: '0.01' },
      { key: 'temperature_max', label: 'Suhu maksimum (°C)', type: 'decimal', step: '0.01' },
      ...coordinateFields,
      statusField,
    ],
  },

  'storage-zones': {
    key: 'storageZones',
    route: 'storage-zones',
    title: 'Zona Penyimpanan',
    singular: 'zona',
    description: 'Pembagian rak/zona di dalam satu storage.',
    icon: 'lucide:grid-3x3',
    permission: 'StorageZone.Read',
    idKey: 'zone_id',
    identityKey: 'zone_code',
    searchKeys: ['zone_code', 'zone_name'],
    parentFilter: {
      key: 'storage_id',
      label: 'Penyimpanan',
      master: 'storages',
      valueKey: 'storage_id',
      labelKey: 'storage_name',
    },
    columns: [
      { key: 'zone_code', label: 'Kode', mono: true },
      { key: 'zone_name', label: 'Nama' },
      { key: 'storage_id', label: 'Storage', mono: true, hideBelow: 'lg' },
      versionColumn,
      updatedColumn,
    ],
    fields: [
      {
        key: 'storage_id',
        label: 'Penyimpanan induk',
        type: 'reference',
        required: true,
        immutable: true,
        reference: {
          master: 'storages',
          valueKey: 'storage_id',
          labelKey: 'storage_name',
          filterActive: true,
        },
      },
      { key: 'zone_code', label: 'Kode zona', type: 'text', required: true, maxlength: 50 },
      { key: 'zone_name', label: 'Nama zona', type: 'text', required: true, maxlength: 200 },
    ],
  },

  schools: {
    key: 'schools',
    route: 'schools',
    title: 'Sekolah',
    singular: 'sekolah',
    description: 'Titik penerima distribusi beserta jumlah siswa.',
    icon: 'lucide:school',
    permission: 'School.Read',
    idKey: 'school_id',
    identityKey: 'school_code',
    searchKeys: ['school_code', 'school_name', 'address'],
    parentFilter: {
      key: 'kitchen_id',
      label: 'Dapur',
      master: 'kitchens',
      valueKey: 'kitchen_id',
      labelKey: 'kitchen_name',
    },
    columns: [
      { key: 'school_code', label: 'Kode', mono: true },
      { key: 'school_name', label: 'Nama' },
      { key: 'student_count', label: 'Siswa', align: 'right', hideBelow: 'md' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      {
        key: 'kitchen_id',
        label: 'Dapur induk',
        type: 'reference',
        required: true,
        immutable: true,
        reference: {
          master: 'kitchens',
          valueKey: 'kitchen_id',
          labelKey: 'kitchen_name',
          filterActive: true,
        },
      },
      { key: 'school_code', label: 'Kode sekolah', type: 'text', required: true, maxlength: 50 },
      { key: 'school_name', label: 'Nama sekolah', type: 'text', required: true, maxlength: 200 },
      ...coordinateFields,
      { key: 'address', label: 'Alamat', type: 'text', full: true },
      { key: 'student_count', label: 'Jumlah siswa', type: 'number', min: 0 },
      statusField,
    ],
  },

  suppliers: {
    key: 'suppliers',
    route: 'suppliers',
    title: 'Pemasok',
    singular: 'pemasok',
    description: 'Master supplier bahan baku.',
    icon: 'lucide:truck',
    permission: 'Supplier.Read',
    idKey: 'supplier_id',
    identityKey: 'supplier_code',
    searchKeys: ['supplier_code', 'supplier_name', 'email', 'phone'],
    columns: [
      { key: 'supplier_code', label: 'Kode', mono: true },
      { key: 'supplier_name', label: 'Nama' },
      { key: 'phone', label: 'Telepon', hideBelow: 'md' },
      { key: 'email', label: 'Email', hideBelow: 'lg' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      { key: 'supplier_code', label: 'Kode pemasok', type: 'text', required: true, maxlength: 50 },
      { key: 'supplier_name', label: 'Nama pemasok', type: 'text', required: true, maxlength: 200 },
      { key: 'phone', label: 'Telepon', type: 'text', maxlength: 30 },
      { key: 'email', label: 'Email', type: 'email', maxlength: 254 },
      statusField,
    ],
  },

  'raw-materials': {
    key: 'rawMaterials',
    route: 'raw-materials',
    title: 'Bahan Baku',
    singular: 'bahan baku',
    description: 'Katalog bahan dengan UOM dan rekomendasi penyimpanan.',
    icon: 'lucide:wheat',
    permission: 'RawMaterial.Read',
    idKey: 'raw_material_id',
    identityKey: 'material_code',
    searchKeys: ['material_code', 'material_name', 'category'],
    columns: [
      { key: 'material_code', label: 'Kode', mono: true },
      { key: 'material_name', label: 'Nama' },
      { key: 'category', label: 'Kategori', hideBelow: 'md' },
      { key: 'uom', label: 'UOM', align: 'center' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      { key: 'material_code', label: 'Kode bahan', type: 'text', required: true, maxlength: 50 },
      { key: 'material_name', label: 'Nama bahan', type: 'text', required: true, maxlength: 200 },
      { key: 'category', label: 'Kategori', type: 'text', maxlength: 100 },
      {
        key: 'uom',
        label: 'UOM',
        type: 'text',
        required: true,
        maxlength: 30,
        immutable: true,
        hint: 'Tidak dapat diubah setelah dibuat.',
      },
      {
        key: 'storage_type',
        label: 'Tipe penyimpanan',
        type: 'select',
        options: STORAGE_TYPE_OPTIONS,
      },
      {
        key: 'recommended_temperature_min',
        label: 'Suhu rekomendasi min (°C)',
        type: 'decimal',
        step: '0.01',
      },
      {
        key: 'recommended_temperature_max',
        label: 'Suhu rekomendasi max (°C)',
        type: 'decimal',
        step: '0.01',
      },
      {
        key: 'maximum_storage_hours',
        label: 'Maksimum simpan (jam)',
        type: 'decimal',
        step: '0.01',
      },
      statusField,
    ],
  },

  'supplier-materials': {
    key: 'supplierMaterials',
    route: 'supplier-materials',
    title: 'Relasi Pemasok–Bahan',
    singular: 'relasi',
    description: 'Daftar bahan yang dapat dipasok oleh setiap supplier.',
    icon: 'lucide:link',
    permission: 'SupplierMaterial.Read',
    idKey: 'supplier_material_id',
    identityKey: 'supplier_material_id',
    searchKeys: ['supplier_id', 'raw_material_id'],
    columns: [
      { key: 'supplier_id', label: 'Supplier', mono: true },
      { key: 'raw_material_id', label: 'Bahan', mono: true },
      versionColumn,
      updatedColumn,
    ],
    fields: [
      {
        key: 'supplier_id',
        label: 'Pemasok',
        type: 'reference',
        required: true,
        reference: {
          master: 'suppliers',
          valueKey: 'supplier_id',
          labelKey: 'supplier_name',
          filterActive: true,
        },
      },
      {
        key: 'raw_material_id',
        label: 'Bahan baku',
        type: 'reference',
        required: true,
        reference: {
          master: 'rawMaterials',
          valueKey: 'raw_material_id',
          labelKey: 'material_name',
          filterActive: true,
        },
      },
    ],
  },

  'food-items': {
    key: 'foodItems',
    route: 'food-items',
    title: 'Menu',
    singular: 'menu',
    description: 'Menu/food item beserta batas holding bawaan.',
    icon: 'lucide:utensils',
    permission: 'FoodItem.Read',
    idKey: 'food_item_id',
    identityKey: 'food_code',
    searchKeys: ['food_code', 'food_name', 'category'],
    columns: [
      { key: 'food_code', label: 'Kode', mono: true },
      { key: 'food_name', label: 'Nama menu' },
      { key: 'category', label: 'Kategori', hideBelow: 'md' },
      { key: 'uom', label: 'UOM', align: 'center' },
      { key: 'holding_limit_minutes', label: 'Holding (m)', align: 'right', hideBelow: 'lg' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      { key: 'food_code', label: 'Kode menu', type: 'text', required: true, maxlength: 50 },
      { key: 'food_name', label: 'Nama menu', type: 'text', required: true, maxlength: 200 },
      {
        key: 'category',
        label: 'Kategori',
        type: 'text',
        maxlength: 100,
        hint: 'Dipakai mencocokkan holding rule saat pengemasan.',
      },
      { key: 'uom', label: 'UOM', type: 'text', required: true, maxlength: 30, immutable: true },
      {
        key: 'holding_limit_minutes',
        label: 'Batas holding (menit)',
        type: 'number',
        min: 0,
        hint: 'Nilai 0 menolak pengemasan.',
      },
      statusField,
    ],
  },

  recipes: {
    key: 'recipes',
    route: 'recipes',
    title: 'Resep',
    singular: 'resep',
    description: 'Komposisi bahan per menu. Pasangan menu–bahan tidak dapat dipindah.',
    icon: 'lucide:book-open',
    permission: 'Recipe.Read',
    idKey: 'recipe_id',
    identityKey: 'recipe_id',
    searchKeys: ['food_item_id', 'raw_material_id', 'uom'],
    columns: [
      { key: 'food_item_id', label: 'Menu', mono: true },
      { key: 'raw_material_id', label: 'Bahan', mono: true },
      { key: 'quantity', label: 'Jumlah', align: 'right' },
      { key: 'uom', label: 'UOM', align: 'center' },
      versionColumn,
    ],
    fields: [
      {
        key: 'food_item_id',
        label: 'Menu',
        type: 'reference',
        required: true,
        immutable: true,
        reference: {
          master: 'foodItems',
          valueKey: 'food_item_id',
          labelKey: 'food_name',
          filterActive: true,
        },
      },
      {
        key: 'raw_material_id',
        label: 'Bahan baku',
        type: 'reference',
        required: true,
        immutable: true,
        reference: {
          master: 'rawMaterials',
          valueKey: 'raw_material_id',
          labelKey: 'material_name',
          filterActive: true,
        },
      },
      { key: 'quantity', label: 'Jumlah', type: 'decimal', required: true, step: '0.000001' },
      {
        key: 'uom',
        label: 'UOM',
        type: 'text',
        required: true,
        maxlength: 30,
        hint: 'Harus sama persis dengan UOM bahan.',
      },
    ],
  },

  'packaging-types': {
    key: 'packagingTypes',
    route: 'packaging-types',
    title: 'Jenis Kemasan',
    singular: 'jenis kemasan',
    description: 'Master kemasan paket. Volume dalam milliliter, bukan kapasitas porsi.',
    icon: 'lucide:box',
    permission: 'PackagingType.Read',
    idKey: 'packaging_type_id',
    identityKey: 'code',
    searchKeys: ['code', 'name', 'material'],
    columns: [
      { key: 'code', label: 'Kode', mono: true },
      { key: 'name', label: 'Nama' },
      { key: 'material', label: 'Material', hideBelow: 'md' },
      { key: 'volume', label: 'Volume (ml)', align: 'right', hideBelow: 'md' },
      versionColumn,
      updatedColumn,
    ],
    fields: [
      { key: 'code', label: 'Kode', type: 'text', required: true, maxlength: 50 },
      { key: 'name', label: 'Nama', type: 'text', required: true, maxlength: 200 },
      { key: 'material', label: 'Material', type: 'text', maxlength: 100 },
      { key: 'volume', label: 'Volume (ml)', type: 'decimal', step: '0.001' },
    ],
  },

  vehicles: {
    key: 'vehicles',
    route: 'vehicles',
    title: 'Kendaraan',
    singular: 'kendaraan',
    description: 'Armada distribusi beserta pengemudi dan perangkat GPS terpasang.',
    icon: 'lucide:truck',
    permission: 'Vehicle.Read',
    idKey: 'vehicle_id',
    identityKey: 'vehicle_code',
    searchKeys: ['vehicle_code', 'plate_number', 'vehicle_type'],
    columns: [
      { key: 'vehicle_code', label: 'Kode', mono: true },
      { key: 'plate_number', label: 'Nomor polisi' },
      { key: 'vehicle_type', label: 'Tipe', hideBelow: 'md' },
      { key: 'capacity', label: 'Kapasitas', align: 'right', hideBelow: 'lg' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      { key: 'vehicle_code', label: 'Kode kendaraan', type: 'text', required: true, maxlength: 50 },
      { key: 'plate_number', label: 'Nomor polisi', type: 'text', required: true, maxlength: 30 },
      { key: 'vehicle_type', label: 'Tipe kendaraan', type: 'text', required: true, maxlength: 50 },
      {
        key: 'capacity',
        label: 'Kapasitas',
        type: 'decimal',
        step: '0.01',
        hint: 'Satuan belum didefinisikan kontrak; jangan diasumsikan kg/liter.',
      },
      {
        key: 'driver_id',
        label: 'Pengemudi',
        type: 'reference',
        reference: {
          master: 'drivers',
          valueKey: 'driver_id',
          labelKey: 'driver_name',
          filterActive: true,
        },
      },
      {
        key: 'gps_device',
        label: 'Perangkat GPS',
        type: 'reference',
        reference: {
          master: 'devices',
          valueKey: 'device_id',
          labelKey: 'device_name',
          filterActive: true,
        },
        hint: 'Hanya device ACTIVE bertipe GPS yang diterima backend.',
      },
      ...coordinateFields,
      statusField,
    ],
  },

  drivers: {
    key: 'drivers',
    route: 'drivers',
    title: 'Pengemudi',
    singular: 'pengemudi',
    description: 'Master driver distribusi.',
    icon: 'lucide:id-card',
    permission: 'Driver.Read',
    idKey: 'driver_id',
    identityKey: 'driver_code',
    searchKeys: ['driver_code', 'driver_name', 'phone'],
    columns: [
      { key: 'driver_code', label: 'Kode', mono: true },
      { key: 'driver_name', label: 'Nama' },
      { key: 'phone', label: 'Telepon', hideBelow: 'md' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      { key: 'driver_code', label: 'Kode pengemudi', type: 'text', required: true, maxlength: 50 },
      { key: 'driver_name', label: 'Nama', type: 'text', required: true, maxlength: 200 },
      { key: 'phone', label: 'Telepon', type: 'text', maxlength: 30 },
      statusField,
    ],
  },

  devices: {
    key: 'devices',
    route: 'devices',
    title: 'Perangkat',
    singular: 'perangkat',
    description: 'Master device IoT (suhu, GPS) dan penempatannya pada zona.',
    icon: 'lucide:cpu',
    permission: 'Device.Read',
    idKey: 'device_id',
    identityKey: 'device_name',
    searchKeys: ['device_name', 'device_type', 'device_uuid', 'mqtt_topic'],
    parentFilter: {
      key: 'zone_id',
      label: 'Zona',
      master: 'storageZones',
      valueKey: 'zone_id',
      labelKey: 'zone_name',
    },
    columns: [
      { key: 'device_name', label: 'Nama' },
      { key: 'device_type', label: 'Tipe', align: 'center' },
      { key: 'device_uuid', label: 'UUID publik', mono: true, hideBelow: 'lg' },
      { key: 'last_online', label: 'Terakhir online', hideBelow: 'md', align: 'right' },
      statusColumn,
      versionColumn,
    ],
    fields: [
      { key: 'device_name', label: 'Nama perangkat', type: 'text', required: true, maxlength: 200 },
      {
        key: 'device_type',
        label: 'Tipe perangkat',
        type: 'select',
        required: true,
        options: [
          { value: 'GPS', label: 'GPS — posisi armada' },
          { value: 'FOOD_TEMPERATURE', label: 'FOOD_TEMPERATURE — suhu makanan' },
          { value: 'TEMPERATURE', label: 'TEMPERATURE — suhu storage/chiller/freezer' },
          { value: 'HUMIDITY', label: 'HUMIDITY — kelembapan' },
        ],
        hint: 'Wajib. Pilih sesuai fungsi device; GPS untuk armada, FOOD_TEMPERATURE untuk production/holding.',
      },
      {
        key: 'zone_id',
        label: 'Zona penempatan',
        type: 'reference',
        reference: {
          master: 'storageZones',
          valueKey: 'zone_id',
          labelKey: 'zone_name',
          filterActive: true,
        },
        hint: 'Opsional. Isi untuk sensor yang ditempatkan pada storage; GPS dan sensor production boleh kosong.',
      },
      {
        key: 'device_uuid',
        label: 'UUID publik',
        type: 'text',
        hint: 'Opsional. Kosongkan agar backend membuat UUID otomatis.',
      },
      {
        key: 'firmware', label: 'Firmware', type: 'text', maxlength: 100,
        hint: 'Opsional. Contoh: esp32-fw-1.0.3.',
      },
      {
        key: 'hardware', label: 'Hardware', type: 'text', maxlength: 100,
        hint: 'Opsional. Contoh: ESP32-WROOM, DS18B20, atau GPS NEO-6M.',
      },
      {
        key: 'mqtt_topic', label: 'MQTT topic', type: 'text', maxlength: 512, full: true,
        hint: 'Opsional. Contoh: fsos/gps atau fsos/suhu1. Topic fsos multiplexed perlu selector event/sensor.',
      },
      {
        key: 'mqtt_event', label: 'MQTT event selector', type: 'text', maxlength: 200, full: true,
        hint: 'Opsional. Isi payload.event, misalnya Suhu Makanan, bila topic dipakai bersama banyak event.',
      },
      {
        key: 'mqtt_sensor', label: 'MQTT sensor selector', type: 'number', min: 0,
        hint: 'Opsional. Isi payload.sensor, misalnya 1, bila topic dipakai bersama banyak sensor.',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [{ value: 'REGISTERED', label: 'REGISTERED' }, ...STATUS_OPTIONS],
        defaultValue: 'REGISTERED',
        hint: 'Pilih ACTIVE agar device langsung dapat menerima telemetry MQTT.',
      },
      { key: 'last_online', label: 'Terakhir online', type: 'datetime', hint: 'Opsional; biasanya diisi otomatis oleh telemetry.' },
    ],
  },

  'device-bindings': {
    key: 'deviceBindings',
    route: 'device-bindings',
    title: 'Binding Perangkat',
    singular: 'binding',
    description: 'Hubungan perangkat GPS aktif dengan kendaraan aktif.',
    icon: 'lucide:plug',
    permission: 'DeviceBinding.Read',
    idKey: 'binding_id',
    identityKey: 'binding_id',
    searchKeys: ['device_id', 'vehicle_id'],
    columns: [
      { key: 'device_id', label: 'Perangkat', mono: true },
      { key: 'vehicle_id', label: 'Kendaraan', mono: true },
      versionColumn,
      updatedColumn,
    ],
    fields: [
      {
        key: 'device_id',
        label: 'Perangkat GPS',
        type: 'reference',
        required: true,
        reference: {
          master: 'devices',
          valueKey: 'device_id',
          labelKey: 'device_name',
          filterActive: true,
        },
      },
      {
        key: 'vehicle_id',
        label: 'Kendaraan',
        type: 'reference',
        required: true,
        reference: {
          master: 'vehicles',
          valueKey: 'vehicle_id',
          labelKey: 'plate_number',
          filterActive: true,
        },
      },
    ],
  },
}

export function resolveMaster(route: string): MasterDefinition | null {
  return masterRegistry[route] ?? null
}

export function resourceFor(definition: MasterDefinition) {
  return mastersApi[definition.key]
}
