export type PaymentStatus = 'Successful' | 'Failed' | 'Pending';
export interface Transaction { id: string; company: string; amount: number; status: PaymentStatus; date: string; }
export interface Invoice { id: string; company: string; amount: number; status: PaymentStatus; due: string; }
