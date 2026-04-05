import { Dispatch, SetStateAction } from "react"

interface ClientSearchProps {
  search: string
  setSearch: Dispatch<SetStateAction<string>>
}

export default function ClientSearch({ search, setSearch }: ClientSearchProps) {
  return (
    <div className="relative w-full">
      <input
        type="text"
        placeholder="Search live clients, categories, or descriptions"
        value={search}
        autoComplete="off"
        aria-label="Search client"
        onChange={(e) => setSearch(e.target.value)}
        className="orion-input w-full px-6 py-4"
      />
    </div>
  )
}
