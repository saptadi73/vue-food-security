# vue-food-security

Frontend Vue 3 untuk FSOS (Food Security & Traceability Operations System).

## Backend contract

Default API:

```env
VITE_API_ORIGIN=http://localhost:8000
VITE_API_PREFIX=/api/v1
VITE_USE_PROXY=true
VITE_DEFAULT_TENANT=FSOS_DEMO
```

Semua response backend memakai envelope:

```ts
{
  success: boolean
  code: number
  message: string
  data: T | null
  errors: { field: string; message: string }[]
  meta: object
}
```

Client frontend otomatis mengambil `data` dari envelope.

Endpoint sistem publik:

- `GET /api/v1/health` untuk liveness proses API.
- `GET /api/v1/ready` untuk readiness database aplikasi.
- `GET /api/v1/health/database` untuk tombol/test koneksi database eksplisit dari frontend/devops.

CORS:

- Development/testing: backend menangani CORS memakai `CORS_ORIGINS`.
- Production: CORS ditangani NGINX/reverse proxy; backend tidak memasang CORS middleware saat `ENVIRONMENT=production`.

## Demo login

Seed backend `seed_demo_ready.py` menyediakan akun demo berikut:

```text
Tenant: FSOS_DEMO
Username: frontend-admin
Password: DemoFrontend123!
```

Login mengirim field `tenant`, bukan wajib `tenant_id`:

```json
{"tenant":"FSOS_DEMO","username":"frontend-admin","password":"DemoFrontend123!"}
```

## Area UI yang tersedia

- Dashboard operasional, suhu storage, fleet, holding, recall, notification.
- Master CRUD: kitchen, storage, zone/rak, supplier, raw material, school, vehicle, driver, food item, recipe, packaging type, device, device binding.
- Monitoring MQTT: halaman **Binding MQTT Armada** (`/monitoring/mqtt-bindings`)
  menampilkan topic dan event yang sudah tersimpan, kemudian membuat Device GPS
  dan binding ke armada. Live MQTT worker tetap bergantung pada backend.
- Sensor makanan jadi dapat dipilih saat complete Production Batch dan start
  holding package; pembacaan suhu aktual harus menyertakan target batch/package
  dengan binding sensor aktif.
- Raw material receiving form, accepted batch list, dan QR label bahan.
- Production batch screen untuk rencana cooking, start produksi/pemakaian bahan dengan cek stok FEFO, detail bahan, suhu inti dan selesai masak.
- Package allocation, holding start/update/release/discard, QR label client-side, dan delivery manifest/depart/complete/cancel.
- Scan QR paket/material/loading/school receiving/traceability, termasuk form penerimaan sekolah dengan auto-fill delivery/sekolah dari konteks paket, suhu manual, kondisi, foto, accepted, jumlah diterima, serta finalisasi consumed/discarded.
- Complaint intake dari hasil scan paket, termasuk referensi foto operasional.
- Complaint report, recall execution/close, notification outbox.
- Traceability read-only berbasis `asset_uuid` registry.

## Catatan penting integrasi

- QR package memakai format `fsos:package:<package_id>`.
- Raw material receiving frontend membuat receiving satu item lalu langsung complete `accepted=true`; revisi/penolakan batch tetap gunakan workflow backend manual bila diperlukan.
- Endpoint complaint menerima salah satu dari `package_id` atau `package_code`; UI scan memakai `package_code` hasil resolve.
- Field `photo` pada receiving/complaint/school receiving adalah referensi path/URI, bukan upload file multipart.
- `PackageData` dari list/detail/resolve membawa `asset_uuid` registry jika registry package tersedia; gunakan field ini untuk membuka `/traceability/assets/{asset_uuid}`. `package_id` tidak sama dengan `asset_uuid`.
- Refresh token backend single-use, sehingga client memakai satu promise refresh bersama agar request paralel tidak mencabut sesi.

## Project setup

```sh
npm install
```

### Development

```sh
npm run dev
```

### Production build

```sh
npm run build
```







