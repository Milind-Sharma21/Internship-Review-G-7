import type { PaymentStatus } from '../types';
export default function StatusBadge({status}:{status:PaymentStatus}) { return <span className={`badge ${status.toLowerCase()}`}><i />{status}</span>; }
