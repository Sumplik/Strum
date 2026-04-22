# Implementation Plan: Add Log Download to ReportsDailyPage & TrendsPage

## 1. [✅] Backend API (Strum-Backend/src/routes/api.ts)
   - Add GET /logs/download?format=csv|json&amp;start=YYYY-MM-DD&amp;end=YYYY-MM-DD (optional deviceId)
   - Query DeviceLog by timestamp range
   - CSV: device/location, timestamp, status, rawData keys
   - JSON: array of logs
   - Headers for download filename="strum-logs-{range}.{ext}"

## 2. [✅] Frontend API Client (frontend/src/lib/api.ts)
   - downloadLogs(format, start, end)

## 3. [✅] Update ReportsDailyPage.tsx
   - Buttons using tanggal (start=end)

## 4. [✅] Update TrendsPage.tsx
   - Buttons using startDate/endDate

## 5. [ ] Add types frontend/src/types/api.ts

## 6. [ ] Test & Complete

**Progress: Step 1-3 ✅ ReportsDailyPage. Step 4 TrendsPage [IN PROGRESS]**

