interface ChartDataTableProps {
  caption: string;
  headers: string[];
  rows: (string | number)[][];
}

export function ChartDataTable({ caption, headers, rows }: ChartDataTableProps) {
  return (
    <table className="sr-only" aria-label={caption}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((h) => (
            <th key={h}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
