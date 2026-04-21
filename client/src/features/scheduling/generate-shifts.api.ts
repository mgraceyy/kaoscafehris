import api from "@/lib/api";

export interface GenerateShiftsInput {
  branchId: string;
  startDate: string;
  endDate: string;
  excludeWeekendsAndHolidays: boolean;
}

export interface GenerateShiftsResult {
  shiftsCreated: number;
  errors: string[];
  message: string;
}

export async function generateShifts(input: GenerateShiftsInput): Promise<GenerateShiftsResult> {
  const { data } = await api.post<{ data: GenerateShiftsResult }>(
    "/scheduling/generate",
    input
  );
  return data.data;
}
