import type { Invoice, Transaction } from './types';
export const transactions: Transaction[] = [
 {id:'TXN-1001',company:'Acme Corp',amount:499,status:'Successful',date:'Nov 10, 2025 · 10:42 AM'},
 {id:'TXN-1002',company:'Globex Ltd',amount:299,status:'Successful',date:'Oct 10, 2025 · 10:18 AM'},
 {id:'TXN-1003',company:'Initech',amount:199,status:'Failed',date:'Oct 08, 2025 · 09:56 AM'},
 {id:'TXN-1004',company:'Acme Corp',amount:799,status:'Successful',date:'Oct 05, 2025 · 09:32 AM'},
];
export const invoices: Invoice[] = [
 {id:'INV-00124',company:'Acme Corp',amount:1200,status:'Successful',due:'Nov 10, 2025'},
 {id:'INV-00123',company:'Globex Ltd',amount:850,status:'Successful',due:'Oct 10, 2025'},
 {id:'INV-00122',company:'Acme Corp',amount:799,status:'Pending',due:'Nov 25, 2025'},
];
