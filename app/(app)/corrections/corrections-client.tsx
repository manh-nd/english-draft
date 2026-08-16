"use client";

import { CorrectionBank } from "@/components/corrections/correction-bank";
import type { CorrectionWithDocument } from "@/lib/db/corrections";

interface CorrectionBankClientProps {
  initialCorrections: CorrectionWithDocument[];
}

export function CorrectionBankClient({
  initialCorrections,
}: CorrectionBankClientProps) {
  return <CorrectionBank initialCorrections={initialCorrections} />;
}
