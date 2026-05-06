import cron from "node-cron";
import prisma from "../config/db.js";
import { sendMail } from "./email.js";
import { getSetting } from "./settings-cache.js";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function getDateParts(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? 0),
    month: Number(parts.find((p) => p.type === "month")?.value ?? 0), // 1-indexed
    day: Number(parts.find((p) => p.type === "day")?.value ?? 0),
  };
}

function isMilestoneDay(
  hired: { year: number; month: number; day: number },
  today: { year: number; month: number; day: number },
  months: number,
): boolean {
  const totalMonths = (today.year - hired.year) * 12 + (today.month - hired.month);
  if (totalMonths !== months) return false;
  // Clamp hired day to the last day of today's month (handles e.g. Jan 31 + 3 months = Apr 30)
  const daysInMonth = new Date(today.year, today.month, 0).getDate();
  return today.day === Math.min(hired.day, daysInMonth);
}

function fmtDate(date: Date) {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function fmtBirthday(date: Date) {
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}

function getTomorrow(tz: string) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getDateParts(tomorrow, tz);
}

// ─── Email templates ──────────────────────────────────────────────────────────

function milestone3MonthHtml(employees: { name: string; employeeId: string; position: string; branch: string; dateHired: Date }[]) {
  const rows = employees.map((e) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6"><strong>${e.name}</strong></td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${e.employeeId}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${e.position}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${e.branch}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${fmtDate(e.dateHired)}</td>
    </tr>`).join("");

  return `
    <div style="font-family:'Inter',sans-serif;color:#1a1a1a;max-width:640px">
      <div style="background:linear-gradient(135deg,#811c12,#a01818);padding:24px 28px;border-radius:12px 12px 0 0">
        <img src="https://xn--kaoscaf-hya.com/kaos-logo.svg" alt="KAOS Café" style="height:36px;filter:brightness(0) invert(1);margin-bottom:12px;display:block" />
        <h2 style="margin:0;color:#fff;font-size:20px;font-weight:700">3-Month Review Reminder</h2>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px">Regularization evaluation due</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #f0e6e6;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px;font-size:14px">
          The following employee${employees.length > 1 ? "s have" : " has"} reached their <strong>3-month employment mark</strong> today.
          Please review ${employees.length > 1 ? "their" : "their"} performance and initiate the regularization evaluation process.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#fdf2f2">
              <th style="padding:8px 12px;text-align:left;color:#811c12;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Name</th>
              <th style="padding:8px 12px;text-align:left;color:#811c12;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">ID</th>
              <th style="padding:8px 12px;text-align:left;color:#811c12;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Position</th>
              <th style="padding:8px 12px;text-align:left;color:#811c12;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Branch</th>
              <th style="padding:8px 12px;text-align:left;color:#811c12;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Date Hired</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#666">
          Log in to the <a href="https://xn--kaoscaf-hya.com" style="color:#811c12">KAOS HRIS</a> to view employee details.
        </p>
      </div>
    </div>`;
}

function milestone6MonthHtml(employees: { name: string; employeeId: string; position: string; branch: string; dateHired: Date }[]) {
  const rows = employees.map((e) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6"><strong>${e.name}</strong></td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${e.employeeId}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${e.position}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${e.branch}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #f0e6e6;color:#666">${fmtDate(e.dateHired)}</td>
    </tr>`).join("");

  return `
    <div style="font-family:'Inter',sans-serif;color:#1a1a1a;max-width:640px">
      <div style="background:linear-gradient(135deg,#1a5c2a,#2d7a3a);padding:24px 28px;border-radius:12px 12px 0 0">
        <img src="https://xn--kaoscaf-hya.com/kaos-logo.svg" alt="KAOS Café" style="height:36px;filter:brightness(0) invert(1);margin-bottom:12px;display:block" />
        <h2 style="margin:0;color:#fff;font-size:20px;font-weight:700">6-Month Benefits Eligibility</h2>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px">Statutory benefits enrollment due</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #e6f0e6;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px;font-size:14px">
          The following employee${employees.length > 1 ? "s have" : " has"} reached their <strong>6-month employment mark</strong> today.
          Please process their statutory benefits enrollment (SSS, PhilHealth, Pag-IBIG) if not yet done.
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#f2fdf4">
              <th style="padding:8px 12px;text-align:left;color:#1a5c2a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Name</th>
              <th style="padding:8px 12px;text-align:left;color:#1a5c2a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">ID</th>
              <th style="padding:8px 12px;text-align:left;color:#1a5c2a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Position</th>
              <th style="padding:8px 12px;text-align:left;color:#1a5c2a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Branch</th>
              <th style="padding:8px 12px;text-align:left;color:#1a5c2a;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Date Hired</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#666">
          Log in to the <a href="https://xn--kaoscaf-hya.com" style="color:#2d7a3a">KAOS HRIS</a> to view employee details.
        </p>
      </div>
    </div>`;
}

function birthdayHtml(employees: { name: string; employeeId: string; position: string; branch: string; dateOfBirth: Date }[]) {
  const rows = employees.map((e) => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #fde8d0"><strong>${e.name}</strong></td>
      <td style="padding:8px 12px;border-bottom:1px solid #fde8d0;color:#666">${e.employeeId}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fde8d0;color:#666">${e.position}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fde8d0;color:#666">${e.branch}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #fde8d0;color:#666">${fmtBirthday(e.dateOfBirth)}</td>
    </tr>`).join("");

  return `
    <div style="font-family:'Inter',sans-serif;color:#1a1a1a;max-width:640px">
      <div style="background:linear-gradient(135deg,#92400e,#b45309);padding:24px 28px;border-radius:12px 12px 0 0">
        <img src="https://xn--kaoscaf-hya.com/kaos-logo.svg" alt="KAOS Café" style="height:36px;filter:brightness(0) invert(1);margin-bottom:12px;display:block" />
        <h2 style="margin:0;color:#fff;font-size:20px;font-weight:700">🎂 Birthday Tomorrow</h2>
        <p style="margin:6px 0 0;color:rgba(255,255,255,0.75);font-size:13px">Don't forget to greet your team!</p>
      </div>
      <div style="background:#fff;padding:24px 28px;border:1px solid #fde8d0;border-top:none;border-radius:0 0 12px 12px">
        <p style="margin:0 0 16px;font-size:14px">
          The following employee${employees.length > 1 ? "s have" : " has"} a birthday <strong>tomorrow</strong>.
          Take a moment to make ${employees.length > 1 ? "them" : "them"} feel appreciated!
        </p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#fff7ed">
              <th style="padding:8px 12px;text-align:left;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Name</th>
              <th style="padding:8px 12px;text-align:left;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">ID</th>
              <th style="padding:8px 12px;text-align:left;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Position</th>
              <th style="padding:8px 12px;text-align:left;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Branch</th>
              <th style="padding:8px 12px;text-align:left;color:#92400e;font-size:11px;text-transform:uppercase;letter-spacing:0.5px">Birthday</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:20px 0 0;font-size:13px;color:#666">
          Log in to the <a href="https://xn--kaoscaf-hya.com" style="color:#b45309">KAOS HRIS</a> to view employee details.
        </p>
      </div>
    </div>`;
}

// ─── Birthday check ───────────────────────────────────────────────────────────

export async function checkUpcomingBirthdays() {
  try {
    const tzSetting = await getSetting<string>("company.timezone", "Asia/Manila (UTC+8)");
    const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
    const tomorrow = getTomorrow(tz);

    const employees = await prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE", dateOfBirth: { not: null } },
      select: {
        employeeId: true, firstName: true, lastName: true,
        position: true, dateOfBirth: true,
        branch: { select: { name: true } },
      },
    });

    const celebrants = employees.filter((e) => {
      if (!e.dateOfBirth) return false;
      const dob = getDateParts(e.dateOfBirth, tz);
      // Feb 29 birthdays: notify on Feb 28 in non-leap years
      const daysInTomorrowMonth = new Date(tomorrow.year, tomorrow.month, 0).getDate();
      const effectiveDay = Math.min(dob.day, daysInTomorrowMonth);
      return dob.month === tomorrow.month && effectiveDay === tomorrow.day;
    });

    if (celebrants.length === 0) return;

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
      select: { email: true },
    });
    if (admins.length === 0) return;

    const names = celebrants.map((e) => `${e.firstName} ${e.lastName}`).join(", ");
    await sendMail({
      to: admins.map((u) => u.email),
      subject: celebrants.length === 1
        ? `🎂 Birthday Tomorrow: ${names}`
        : `🎂 Birthdays Tomorrow: ${celebrants.length} employees`,
      html: birthdayHtml(celebrants.map((e) => ({
        name: `${e.firstName} ${e.lastName}`,
        employeeId: e.employeeId,
        position: e.position,
        branch: e.branch.name,
        dateOfBirth: e.dateOfBirth!,
      }))),
    });
    console.log(`[scheduler] Birthday reminder sent for: ${names}`);
  } catch (err) {
    console.error("[scheduler] Birthday check failed:", err);
  }
}

// ─── Milestone check ──────────────────────────────────────────────────────────

export async function checkEmployeeMilestones() {
  try {
    const tzSetting = await getSetting<string>("company.timezone", "Asia/Manila (UTC+8)");
    const tz = tzSetting.split(" ")[0] ?? "Asia/Manila";
    const today = getDateParts(new Date(), tz);

    const employees = await prisma.employee.findMany({
      where: { employmentStatus: "ACTIVE" },
      select: {
        employeeId: true, firstName: true, lastName: true,
        position: true, dateHired: true,
        branch: { select: { name: true } },
      },
    });

    const threeMonth: typeof employees = [];
    const sixMonth: typeof employees = [];

    for (const emp of employees) {
      const hired = getDateParts(emp.dateHired, tz);
      if (isMilestoneDay(hired, today, 3)) threeMonth.push(emp);
      if (isMilestoneDay(hired, today, 6)) sixMonth.push(emp);
    }

    if (threeMonth.length === 0 && sixMonth.length === 0) return;

    const admins = await prisma.user.findMany({
      where: { role: { in: ["ADMIN", "MANAGER"] }, isActive: true },
      select: { email: true },
    });
    if (admins.length === 0) return;
    const recipients = admins.map((u) => u.email);

    const toRow = (e: (typeof employees)[number]) => ({
      name: `${e.firstName} ${e.lastName}`,
      employeeId: e.employeeId,
      position: e.position,
      branch: e.branch.name,
      dateHired: e.dateHired,
    });

    if (threeMonth.length > 0) {
      const names = threeMonth.map((e) => `${e.firstName} ${e.lastName}`).join(", ");
      await sendMail({
        to: recipients,
        subject: threeMonth.length === 1
          ? `3-Month Review Due: ${names}`
          : `3-Month Review Due: ${threeMonth.length} employees`,
        html: milestone3MonthHtml(threeMonth.map(toRow)),
      });
      console.log(`[scheduler] 3-month milestone email sent for: ${names}`);
    }

    if (sixMonth.length > 0) {
      const names = sixMonth.map((e) => `${e.firstName} ${e.lastName}`).join(", ");
      await sendMail({
        to: recipients,
        subject: sixMonth.length === 1
          ? `6-Month Benefits Eligibility: ${names}`
          : `6-Month Benefits Eligibility: ${sixMonth.length} employees`,
        html: milestone6MonthHtml(sixMonth.map(toRow)),
      });
      console.log(`[scheduler] 6-month milestone email sent for: ${names}`);
    }
  } catch (err) {
    console.error("[scheduler] Milestone check failed:", err);
  }
}

// ─── Start scheduler ──────────────────────────────────────────────────────────

export function startScheduler() {
  cron.schedule("0 8 * * *", async () => {
    await checkEmployeeMilestones();
    await checkUpcomingBirthdays();
  }, { timezone: "Asia/Manila" });
  console.log("[scheduler] Daily checks scheduled — 08:00 Asia/Manila (milestones + birthdays)");
}
