import api from "@/lib/api";

export type HolidayType = "REGULAR" | "SPECIAL_NON_WORKING";

export interface PublicHoliday {
  id: string;
  date: string;
  name: string;
  type: HolidayType;
  amount: number;
}

export async function listHolidays(year?: number): Promise<PublicHoliday[]> {
  const { data } = await api.get<{ data: PublicHoliday[] }>("/holidays", {
    params: year ? { year } : {},
  });
  return data.data;
}

export async function createHoliday(
  body: Omit<PublicHoliday, "id">
): Promise<PublicHoliday> {
  const { data } = await api.post<{ data: PublicHoliday }>("/holidays", body);
  return data.data;
}

export async function updateHoliday(
  id: string,
  body: Partial<Omit<PublicHoliday, "id">>
): Promise<PublicHoliday> {
  const { data } = await api.patch<{ data: PublicHoliday }>(`/holidays/${id}`, body);
  return data.data;
}

export async function deleteHoliday(id: string): Promise<void> {
  await api.delete(`/holidays/${id}`);
}
