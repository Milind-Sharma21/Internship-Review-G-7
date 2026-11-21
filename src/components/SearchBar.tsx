import { Search } from 'lucide-react';
export default function SearchBar({value,onChange,placeholder='Search...'}:{value:string;onChange:(value:string)=>void;placeholder?:string}){return <label className="table-search"><Search size={16}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></label>}
