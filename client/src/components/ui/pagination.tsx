const BRAND = "#8C1515";

interface PaginationProps {
  page: number;
  totalPages: number;
  totalRecords: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({
  page,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
}: PaginationProps) {
  if (totalRecords === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalRecords);

  return (
    <div
      style={{
        padding: "12px 20px",
        borderTop: "1px solid #F5EDED",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <span style={{ fontSize: "12px", color: "#aaa" }}>
        Showing {start}–{end} of {totalRecords} records
      </span>
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .slice(0, 5)
          .map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                border: p === page ? "none" : "1px solid #eee",
                background: p === page ? BRAND : "#fff",
                color: p === page ? "#fff" : "#666",
                fontSize: 12,
                cursor: "pointer",
                fontWeight: p === page ? 700 : 400,
              }}
            >
              {p}
            </button>
          ))}
      </div>
    </div>
  );
}
