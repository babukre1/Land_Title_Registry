/** Shared toolbar surface for search and list filters. */
export default function FilterBar({ children, onSubmit, className = "" }) { return <form onSubmit={onSubmit} className={`ui-card mb-4 flex flex-wrap items-end gap-2 p-4 ${className}`}>{children}</form>; }
