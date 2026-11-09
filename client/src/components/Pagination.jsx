/** Compact server-pagination footer for registry directories. */
export default function Pagination({ pagination, onPage }) {
  if (!pagination) return null; const { page, pages, total, limit } = pagination;
  return <div className="ui-table-footer"><span>Showing {total ? `${(page - 1) * limit + 1}–${Math.min(page * limit, total)} of ${total}` : "0"} records</span>{pages > 1 && <div className="flex gap-1"><button type="button" className="ui-button-secondary min-h-8 px-2.5 py-1" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button><span className="grid min-w-8 place-items-center rounded-md bg-[#4935ca] px-2 text-xs font-bold text-white">{page}</span><button type="button" className="ui-button-secondary min-h-8 px-2.5 py-1" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button></div>}</div>;
}
