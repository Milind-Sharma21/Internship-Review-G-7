import type { Invoice, Transaction } from './types';
export const transactions: Transaction[] = [
 {id:'TXN-1001',company:'Acme Corp',amount:499,status:'Successful',date:'Nov 10, 2025 · 10:42 AM'},
 {id:'TXN-1002',company:'Globex Ltd',amount:299,status:'Successful',date:'Oct 10, 2025 · 10:18 AM'},
 {id:'TXN-1003',company:'Initech',amount:199,status:'Failed',date:'Oct 08, 2025 · 09:56 AM'},
 {id:'TXN-1004',company:'Acme Corp',amount:799,status:'Successful',date:'Oct 05, 2025 · 09:32 AM'},
 {id:'TXN-1005',company:'Globex Ltd',amount:649,status:'Pending',date:'Oct 04, 2025 · 02:15 PM'},
 {id:'TXN-1006',company:'Stark Industries',amount:2499,status:'Successful',date:'Oct 03, 2025 · 11:08 AM'},
 {id:'TXN-1007',company:'Wayne Enterprises',amount:1299,status:'Failed',date:'Oct 02, 2025 · 04:41 PM'},
 {id:'TXN-1008',company:'Initech',amount:399,status:'Successful',date:'Oct 01, 2025 · 09:27 AM'},
 {id:'TXN-1009',company:'Acme Corp',amount:899,status:'Pending',date:'Sep 30, 2025 · 01:33 PM'},
 {id:'TXN-1010',company:'Stark Industries',amount:1799,status:'Successful',date:'Sep 29, 2025 · 10:16 AM'},
 {id:'TXN-1011',company:'Globex Ltd',amount:549,status:'Failed',date:'Sep 28, 2025 · 03:52 PM'},
 {id:'TXN-1012',company:'Wayne Enterprises',amount:999,status:'Successful',date:'Sep 27, 2025 · 12:04 PM'},
];
export const invoices: Invoice[] = [
 {id:'INV-00124',company:'Acme Corp',amount:1200,status:'Successful',due:'Nov 10, 2025'},
 {id:'INV-00123',company:'Globex Ltd',amount:850,status:'Successful',due:'Oct 10, 2025'},
 {id:'INV-00122',company:'Acme Corp',amount:799,status:'Pending',due:'Nov 25, 2025'},
 {id:'INV-00121',company:'Initech',amount:460,status:'Failed',due:'Oct 06, 2025'},
 {id:'INV-00120',company:'Stark Industries',amount:2400,status:'Successful',due:'Oct 02, 2025'},
 {id:'INV-00119',company:'Wayne Enterprises',amount:1325,status:'Pending',due:'Sep 28, 2025'},
 {id:'INV-00118',company:'Globex Ltd',amount:720,status:'Successful',due:'Sep 21, 2025'},
 {id:'INV-00117',company:'Acme Corp',amount:990,status:'Successful',due:'Sep 15, 2025'},
 {id:'INV-00116',company:'Initech',amount:315,status:'Failed',due:'Sep 08, 2025'},
 {id:'INV-00115',company:'Stark Industries',amount:1880,status:'Successful',due:'Sep 01, 2025'},
];
