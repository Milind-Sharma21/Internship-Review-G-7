import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download, Eye } from 'lucide-react';
import type { Invoice } from '../types';
import formatCurrency from '../utils/formatCurrency';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 5;

export default function InvoiceTable({ items }: { items: Invoice[] }) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const filtered = useMemo(
    () =>
      items.filter((invoice) =>
        `${invoice.id} ${invoice.company}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const rows = filtered.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE);

  const download = (invoice: Invoice) => {
    const content = [
      'LedgerGuard Invoice',
      invoice.id,
      invoice.company,
      `Amount: ${formatCurrency(invoice.amount)}`,
      `Due: ${invoice.due}`,
      `Status: ${invoice.status}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${invoice.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>Invoice management</h2>
          <p>View and manage your invoices</p>
        </div>
        <input
          className="invoice-search"
          type="search"
          aria-label="Search invoices"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
          placeholder="Search invoices..."
        />
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>INVOICE NUMBER</th>
              <th>COMPANY</th>
              <th>AMOUNT</th>
              <th>PAYMENT STATUS</th>
              <th>DUE DATE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((invoice) => (
              <tr key={invoice.id}>
                <td className="mono">{invoice.id}</td>
                <td>{invoice.company}</td>
                <td className="amount">{formatCurrency(invoice.amount)}</td>
                <td><StatusBadge status={invoice.status} /></td>
                <td className="muted">{invoice.due}</td>
                <td>
                  <button
                    className="row-action"
                    onClick={() => download(invoice)}
                    title="Download invoice"
                    aria-label={`Download invoice ${invoice.id}`}
                  >
                    <Download size={16} />
                  </button>
                  <button
                    className="row-action"
                    title="View invoice"
                    aria-label={`View invoice ${invoice.id}`}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-state">No invoices found.</div>}
      </div>

      <div className="pagination">
        <span>
          Showing {filtered.length ? (visiblePage - 1) * PAGE_SIZE + 1 : 0} to{' '}
          {Math.min(visiblePage * PAGE_SIZE, filtered.length)} of {filtered.length} invoices
        </span>
        <div>
          <button
            onClick={() => setPage(Math.max(1, visiblePage - 1))}
            aria-label="Previous page"
            disabled={visiblePage <= 1}
          >
            <ChevronLeft size={16} />
          </button>
          <button className="page-current" aria-current="page">{visiblePage}</button>
          <button
            onClick={() => setPage(Math.min(pageCount, visiblePage + 1))}
            aria-label="Next page"
            disabled={visiblePage >= pageCount}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
