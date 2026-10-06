import { clientEnv } from "@/lib/env.client";

export default function CopyrightPage() {
  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Copyright & Licensing Policy</h1>

      <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200 space-y-4 text-sm text-gray-700 leading-relaxed">
        <p>
          UniLib is committed to respecting intellectual property rights and providing clear licensing transparency for educational materials shared on our platform.
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">Uploader Rights Attestation</h2>
        <p>
          When uploading a document to UniLib, authors and uploaders attest that they either own the copyright, have explicit permission from the copyright holder, or that the document is released under an appropriate open license (e.g., Creative Commons or Public Domain).
        </p>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">Document Licenses</h2>
        <p>
          Every resource published on UniLib displays its license prominently in the reader header. Uploaders can choose from:
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>All Rights Reserved:</strong> Copyright remains with the author.</li>
          <li><strong>Public Domain (CC0):</strong> No rights reserved.</li>
          <li><strong>Creative Commons (CC BY, CC BY-SA, CC BY-NC, etc.):</strong> Standard open licenses.</li>
        </ul>

        <h2 className="text-lg font-semibold text-gray-900 pt-2">Reporting Copyright Infringement</h2>
        <p>
          If you believe a resource on UniLib infringes your copyright or has been uploaded without authorization, please contact us immediately:
        </p>
        <p className="font-semibold text-blue-600">
          <a href={`mailto:${clientEnv.NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL}`}>
            {clientEnv.NEXT_PUBLIC_COPYRIGHT_CONTACT_EMAIL}
          </a>
        </p>
        <p className="text-xs text-gray-500">
          Please include the document title, URL, and proof of rights ownership in your email. Verified copyright complaints will result in immediate removal by platform administrators.
        </p>
      </div>
    </div>
  );
}
