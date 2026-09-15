import { queryCertificates } from "@/data/server/ehs-query-actions";
import { CertificatesPageContent } from "@/features/certificates/certificates-page-content";

export default function CertificatesPage() {
  return <CertificatesPageContent queryCertificates={queryCertificates} />;
}
