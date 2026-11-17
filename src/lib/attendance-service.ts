import { supabase } from "@/integrations/supabase/client";

export type AttendanceEventType = "check_in" | "check_out";
export type AttendanceValidationStatus = "accepted" | "outside_geofence" | "low_accuracy" | "rejected" | "pending";

export interface AttendancePosition {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

export interface AttendanceEventResult {
  event: {
    id: string;
    event_type: AttendanceEventType;
    captured_at: string;
    received_at: string;
    validation_status: AttendanceValidationStatus;
    attendance_record_id: string | null;
  };
  attendance_record_id: string | null;
  duplicate: boolean;
  message: string;
}

export interface TodayAttendance {
  attendance_record_id: string;
  first_check_in_at: string | null;
  last_check_out_at: string | null;
  attendance_status: string;
}

export interface QueuedAttendanceEvent {
  idempotencyKey: string;
  organizationId: string;
  eventType: AttendanceEventType;
  capturedAt: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  queuedAt: number;
}

const DB_NAME = "fieldbuddy-offline";
const STORE_NAME = "attendance-events";
const DB_VERSION = 1;

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "idempotencyKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open offline storage"));
  });
}

async function saveQueuedEvent(event: QueuedAttendanceEvent) {
  const db = await openQueueDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(event);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to save offline attendance"));
    transaction.onabort = () => reject(transaction.error ?? new Error("Offline attendance save was aborted"));
  });
  db.close();
}

export async function getQueuedAttendanceEvents(organizationId?: string) {
  const db = await openQueueDb();
  const rows = await new Promise<QueuedAttendanceEvent[]>((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve((request.result as QueuedAttendanceEvent[]).sort((a, b) => a.queuedAt - b.queuedAt));
    request.onerror = () => reject(request.error ?? new Error("Unable to read offline attendance"));
  });
  db.close();
  return organizationId ? rows.filter((item) => item.organizationId === organizationId) : rows;
}

async function removeQueuedEvent(idempotencyKey: string) {
  const db = await openQueueDb();
  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(idempotencyKey);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Unable to clear synced attendance"));
  });
  db.close();
}

async function invokeAttendanceEvent(event: QueuedAttendanceEvent): Promise<AttendanceEventResult> {
  const { data, error } = await supabase.functions.invoke("attendance-event", {
    body: {
      organizationId: event.organizationId,
      eventType: event.eventType,
      capturedAt: event.capturedAt,
      latitude: event.latitude,
      longitude: event.longitude,
      accuracyMeters: event.accuracyMeters,
      idempotencyKey: event.idempotencyKey,
    },
  });

  if (error) {
    const message = data && typeof data === "object" && "error" in data
      ? String(data.error)
      : error.message;
    throw new Error(message || "Attendance could not be submitted");
  }
  if (!data?.event) throw new Error(data?.error ?? "The attendance service returned an invalid response");
  return data as AttendanceEventResult;
}

export async function queueAttendanceEvent(
  organizationId: string,
  eventType: AttendanceEventType,
  position: AttendancePosition,
): Promise<QueuedAttendanceEvent> {
  const event: QueuedAttendanceEvent = {
    idempotencyKey: crypto.randomUUID(),
    organizationId,
    eventType,
    capturedAt: new Date().toISOString(),
    latitude: position.latitude,
    longitude: position.longitude,
    accuracyMeters: position.accuracyMeters,
    queuedAt: Date.now(),
  };
  await saveQueuedEvent(event);
  return event;
}

export async function syncQueuedAttendanceEvents(organizationId: string) {
  if (!navigator.onLine) return [];
  const queued = await getQueuedAttendanceEvents(organizationId);
  const results: AttendanceEventResult[] = [];

  for (const event of queued) {
    try {
      const result = await invokeAttendanceEvent(event);
      await removeQueuedEvent(event.idempotencyKey);
      results.push(result);
    } catch {
      // Keep failed items in IndexedDB. A later online event or manual retry can retry them.
      break;
    }
  }

  return results;
}

export async function getTodayAttendance(organizationId: string): Promise<TodayAttendance | null> {
  const { data, error } = (await supabase.rpc(
    "get_my_attendance_today" as never,
    { p_organization_id: organizationId } as never,
  )) as unknown as {
    data: TodayAttendance[] | null;
    error: { message: string } | null;
  };

  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

export async function submitAttendanceEvent(
  organizationId: string,
  eventType: AttendanceEventType,
  position: AttendancePosition,
): Promise<AttendanceEventResult> {
  return invokeAttendanceEvent({
    idempotencyKey: crypto.randomUUID(),
    organizationId,
    eventType,
    capturedAt: new Date().toISOString(),
    latitude: position.latitude,
    longitude: position.longitude,
    accuracyMeters: position.accuracyMeters,
    queuedAt: Date.now(),
  });
}
