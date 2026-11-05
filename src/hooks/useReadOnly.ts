import { useAccount } from "./useAccount"

// True for an accountant, who reviews the books but doesn't create or change sales documents.
export function useReadOnly(): boolean {
  return useAccount().role === "accountant"
}
