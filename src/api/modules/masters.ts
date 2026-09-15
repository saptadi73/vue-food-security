import { endpoints } from '../endpoints'
import { createResource } from '../resource'
import type { AuditFields, DecimalString, Uuid } from '../types'

export type MasterStatus = 'ACTIVE' | 'INACTIVE'
export type StorageType = 'COLD_STORAGE' | 'FREEZER' | 'DRY_STORAGE'
export type DeviceStatus = 'REGISTERED' | 'ACTIVE' | 'INACTIVE'

export interface KitchenInput {
  kitchen_code: string
  kitchen_name: string
  latitude?: DecimalString | null
  longitude?: DecimalString | null
  address?: string | null
  capacity?: number | null
  status?: MasterStatus
}
export interface Kitchen extends AuditFields, Required<Omit<KitchenInput, 'status'>> {
  kitchen_id: Uuid
  status: MasterStatus
}

export interface StorageInput {
  kitchen_id: Uuid
  storage_code: string
  storage_name: string
  storage_type: StorageType
  temperature_min?: DecimalString | null
  temperature_max?: DecimalString | null
  latitude?: DecimalString | null
  longitude?: DecimalString | null
  status?: MasterStatus
}
export interface Storage extends AuditFields, Required<Omit<StorageInput, 'status'>> {
  storage_id: Uuid
  status: MasterStatus
}

export interface ZoneInput {
  storage_id: Uuid
  zone_code: string
  zone_name: string
}
export interface StorageZone extends AuditFields, ZoneInput {
  zone_id: Uuid
}

export interface SupplierInput {
  supplier_code: string
  supplier_name: string
  phone?: string | null
  email?: string | null
  status?: MasterStatus
}
export interface Supplier extends AuditFields, Required<Omit<SupplierInput, 'status'>> {
  supplier_id: Uuid
  status: MasterStatus
}

export interface RawMaterialInput {
  material_code: string
  material_name: string
  category?: string | null
  uom: string
  storage_type?: StorageType | null
  recommended_temperature_min?: DecimalString | null
  recommended_temperature_max?: DecimalString | null
  maximum_storage_hours?: DecimalString | null
  status?: MasterStatus
}
export interface RawMaterial extends AuditFields, Required<Omit<RawMaterialInput, 'status'>> {
  raw_material_id: Uuid
  status: MasterStatus
}

export interface SupplierMaterialInput {
  supplier_id: Uuid
  raw_material_id: Uuid
}
export interface SupplierMaterial extends AuditFields, SupplierMaterialInput {
  supplier_material_id: Uuid
}

export interface SchoolInput {
  kitchen_id: Uuid
  school_code: string
  school_name: string
  latitude?: DecimalString | null
  longitude?: DecimalString | null
  address?: string | null
  student_count?: number | null
  status?: MasterStatus
}
export interface School extends AuditFields, Required<Omit<SchoolInput, 'status'>> {
  school_id: Uuid
  status: MasterStatus
}

export interface DriverInput {
  driver_code: string
  driver_name: string
  phone?: string | null
  status?: MasterStatus
}
export interface Driver extends AuditFields, Required<Omit<DriverInput, 'status'>> {
  driver_id: Uuid
  status: MasterStatus
}

export interface VehicleInput {
  vehicle_code: string
  plate_number: string
  vehicle_type: string
  capacity?: DecimalString | null
  driver_id?: Uuid | null
  gps_device?: Uuid | null
  latitude?: DecimalString | null
  longitude?: DecimalString | null
  status?: MasterStatus
}
export interface Vehicle extends AuditFields, Required<Omit<VehicleInput, 'status'>> {
  vehicle_id: Uuid
  status: MasterStatus
}

export interface FoodItemInput {
  food_code: string
  food_name: string
  category?: string | null
  uom: string
  holding_limit_minutes?: number | null
  status?: MasterStatus
}
export interface FoodItem extends AuditFields, Required<Omit<FoodItemInput, 'status'>> {
  food_item_id: Uuid
  status: MasterStatus
}

export interface RecipeInput {
  food_item_id: Uuid
  raw_material_id: Uuid
  quantity: DecimalString
  uom: string
}
export interface Recipe extends AuditFields, RecipeInput {
  recipe_id: Uuid
}

export interface PackagingTypeInput {
  code: string
  name: string
  material?: string | null
  volume?: DecimalString | null
}
export interface PackagingType extends AuditFields, PackagingTypeInput {
  packaging_type_id: Uuid
}

export interface DeviceInput {
  zone_id?: Uuid | null
  device_uuid?: Uuid | null
  device_name: string
  device_type: string
  firmware?: string | null
  hardware?: string | null
  mqtt_topic?: string | null
  status?: DeviceStatus
  last_online?: string | null
}
export interface Device extends AuditFields, Required<Omit<DeviceInput, 'status'>> {
  device_id: Uuid
  status: DeviceStatus
}

export interface DeviceBindingInput {
  device_id: Uuid
  vehicle_id: Uuid
}
export interface DeviceBinding extends AuditFields, DeviceBindingInput {
  binding_id: Uuid
}

export const mastersApi = {
  kitchens: createResource<Kitchen, KitchenInput>(endpoints.kitchens, 'Dapur'),
  storages: createResource<Storage, StorageInput>(endpoints.storages, 'Penyimpanan'),
  storageZones: createResource<StorageZone, ZoneInput>(endpoints.storageZones, 'Zona penyimpanan'),
  suppliers: createResource<Supplier, SupplierInput>(endpoints.suppliers, 'Pemasok'),
  rawMaterials: createResource<RawMaterial, RawMaterialInput>(endpoints.rawMaterials, 'Bahan baku'),
  supplierMaterials: createResource<SupplierMaterial, SupplierMaterialInput>(
    endpoints.supplierMaterials,
    'Relasi pemasok-bahan',
  ),
  schools: createResource<School, SchoolInput>(endpoints.schools, 'Sekolah'),
  vehicles: createResource<Vehicle, VehicleInput>(endpoints.vehicles, 'Kendaraan'),
  drivers: createResource<Driver, DriverInput>(endpoints.drivers, 'Pengemudi'),
  foodItems: createResource<FoodItem, FoodItemInput>(endpoints.foodItems, 'Menu'),
  recipes: createResource<Recipe, RecipeInput>(endpoints.recipes, 'Resep'),
  packagingTypes: createResource<PackagingType, PackagingTypeInput>(
    endpoints.packagingTypes,
    'Jenis kemasan',
  ),
  devices: createResource<Device, DeviceInput>(endpoints.devices, 'Perangkat'),
  deviceBindings: createResource<DeviceBinding, DeviceBindingInput>(
    endpoints.deviceBindings,
    'Binding perangkat',
  ),
}

export type MasterKey = keyof typeof mastersApi
