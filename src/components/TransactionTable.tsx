import { useMemo, useState } from 'react';
import { ArrowDownToLine, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import type { Transaction } from '../types';
import formatCurrency from '../utils/formatCurrency';
import SearchBar from './SearchBar';
import StatusBadge from './StatusBadge';

const PAGE_SIZE = 5;

function escapeCsvCell(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function matchesDate(dateLabel: string, selectedDate: string): boolean {
  if (!selectedDate) return true;

  const parsedDate = new Date(dateLabel.replace(' · ', ' '));
  if (Number.isNaN(parsedDate.getTime())) return false;

  const localDate = [
    parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, '0'),
    String(parsedDate.getDate()).padStart(2, '0'),
  ].join('-');

  return localDate === selectedDate;
}

export default function TransactionTable({
  items,
  title = 'Recent Transactions',
  paginate = false,
}: {
  items: Transaction[];
  title?: string;
  paginate?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('All statuses');
  const [company, setCompany] = useState('All companies');
  const [selectedDate, setSelectedDate] = useState('');

  const filtered = useMemo(
    () =>
      items.filter((transaction) => {
        const matchesQuery = `${transaction.id} ${transaction.company}`
          .toLowerCase()
          .includes(query.toLowerCase());
        const matchesStatus = status === 'All statuses' || transaction.status === status;
        const matchesCompany = company === 'All companies' || transaction.company === company;

        return (
          matchesQuery &&
          matchesStatus &&
          matchesCompany &&
          matchesDate(transaction.date, selectedDate)
        );
      }),
    [items, query, status, company, selectedDate],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visiblePage = Math.min(page, pageCount);
  const rows = paginate
    ? filtered.slice((visiblePage - 1) * PAGE_SIZE, visiblePage * PAGE_SIZE)
    : filtered.slice(0, PAGE_SIZE);

  const exportCsv = () => {
    const csv = [
      'ID,Company,Amount,Status,Date',
      ...filtered.map(
        (transaction) =>
          [transaction.id, transaction.company, transaction.amount, transaction.status, transaction.date]
            .map(escapeCsvCell)
            .join(','),
      ),
    ].join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ledgerguard-transactions.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="panel table-panel">
      <div className="panel-heading">
        <div>
          <h2>{title}</h2>
          <p>Monitor and manage your transactions</p>
        </div>
        {paginate && (
          <button className="button button-secondary" onClick={exportCsv}>
            <ArrowDownToLine size={15} /> Export CSV
          </button>
        )}
        {!paginate && (
          <button className="link-button">
            View all <span>→</span>
          </button>
        )}
      </div>

      {paginate && (
        <div className="filters">
          <SearchBar
            value={query}
            onChange={(value) => {
              setQuery(value);
              setPage(1);
            }}
            placeholder="Search by transaction ID..."
          />
          <select
            aria-label="Filter by company"
            value={company}
            onChange={(event) => {
              setCompany(event.target.value);
              setPage(1);
            }}
          >
            <option>All companies</option>
            {[...new Set(items.map((transaction) => transaction.company))].map((name) => (
              <option key={name}>{name}</option>
            ))}
          </select>
          <select
            aria-label="Filter by status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option>All statuses</option>
            <option>Successful</option>
            <option>Failed</option>
            <option>Pending</option>
          </select>
          <input
            type="date"
            aria-label="Filter by transaction date"
            value={selectedDate}
            onChange={(event) => {
              setSelectedDate(event.target.value);
              setPage(1);
            }}
          />
        </div>
      )}

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>TRANSACTION ID</th>
              <th>COMPANY</th>
              <th>AMOUNT</th>
              <th>STATUS</th>
              <th>DATE &amp; TIME</th>
              {paginate && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((transaction) => (
              <tr key={transaction.id}>
                <td className="mono">{transaction.id}</td>
                <td>
                  <span className="company-mark">{transaction.company.slice(0, 1)}</span>
                  {transaction.company}
                </td>
                <td className="amount">{formatCurrency(transaction.amount)}</td>
                <td><StatusBadge status={transaction.status} /></td>
                <td className="muted">{transaction.date}</td>
                {paginate && (
                  <td>
                    <button className="row-action" title="View transaction">
                      <Eye size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="empty-state">No transactions match your filters.</div>}
      </div>

      {paginate && (
        <div className="pagination">
          <span>
            Showing {filtered.length ? (visiblePage - 1) * PAGE_SIZE + 1 : 0} to{' '}
            {Math.min(visiblePage * PAGE_SIZE, filtered.length)} of {filtered.length} transactions
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
              disabled={visiblePage >= pageCount}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
